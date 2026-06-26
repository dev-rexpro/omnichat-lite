
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Session, LiveServerMessage, Modality } from '@google/genai';
import { Mic, Moon, Pause, Play, Sun, X, Video, VideoOff, ScreenShare, ScreenShareOff, SwitchCamera } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../lib/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';
import { LiveConversationModel } from '../types';
import { useSettings } from '../hooks/use-settings';

interface LiveConversationProps {
  isOpen: boolean;
  onClose: () => void;
  appTheme: 'light' | 'dark';
  model: LiveConversationModel;
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};


export const LiveConversation: React.FC<LiveConversationProps> = ({ isOpen, onClose, appTheme, model }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [outputNodeForVisualizer, setOutputNodeForVisualizer] = useState<GainNode | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharingOn, setIsScreenSharingOn] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  const { settings } = useSettings();
  const userApiKey = settings.apiKeys.google;

  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameSenderIntervalRef = useRef<number | null>(null);

  const processingStateRef = useRef({ isRecording: false, isPaused: false });

  const isLightTheme = appTheme === 'light';
  const isMobile = useMediaQuery('(max-width: 767px)');


  useEffect(() => {
    processingStateRef.current = { isRecording, isPaused };
  }, [isRecording, isPaused]);

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (videoElement) {
      if (videoElement.srcObject !== videoStream) {
        videoElement.srcObject = videoStream;
      }
    }
  }, [videoStream]);


  const stopSendingFrames = useCallback(() => {
    if (frameSenderIntervalRef.current) {
      clearInterval(frameSenderIntervalRef.current);
    }
    frameSenderIntervalRef.current = null;
  }, []);

  const startSendingFrames = useCallback(() => {
    if (!videoElementRef.current || !sessionRef.current || frameSenderIntervalRef.current) return;

    if (!frameCanvasRef.current) {
      frameCanvasRef.current = document.createElement('canvas');
    }
    const canvas = frameCanvasRef.current;
    const context = canvas.getContext('2d');

    frameSenderIntervalRef.current = window.setInterval(() => {
      if (!processingStateRef.current.isRecording || processingStateRef.current.isPaused || !videoElementRef.current || videoElementRef.current.readyState < 2 || !context) {
        return;
      }

      canvas.width = videoElementRef.current.videoWidth;
      canvas.height = videoElementRef.current.videoHeight;
      context.drawImage(videoElementRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob && sessionRef.current) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            const imageBlobForGenAI = {
              data: base64data,
              mimeType: 'image/jpeg',
            };
            try {
              sessionRef.current?.sendRealtimeInput({ media: imageBlobForGenAI });
            } catch (e) {
              console.error('Error sending video frame:', e);
            }
          };
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg', 0.8);
    }, 2000);
  }, []);

  useEffect(() => {
    if (isRecording && videoStream) {
      startSendingFrames();
    } else {
      stopSendingFrames();
    }
  }, [isRecording, videoStream, startSendingFrames, stopSendingFrames]);


  const stopVideoStream = useCallback(() => {
    stopSendingFrames();
    setVideoStream(currentStream => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
    setIsCameraOn(false);
    setIsScreenSharingOn(false);
  }, [stopSendingFrames]);

  const stopRecording = useCallback((shouldUpdateStatus = true) => {
    if (!mediaStreamRef.current) return;
    if (shouldUpdateStatus) setStatus('Stopping recording...');

    setIsRecording(false);
    setIsPaused(false);

    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current.onaudioprocess = null;
    }
    scriptProcessorNodeRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (inputAudioContextRef.current?.state === 'running') {
      inputAudioContextRef.current.suspend().catch(console.error);
    }

    if (shouldUpdateStatus) setStatus('Ready');
  }, []);

  const initSession = useCallback(async () => {
    if (!clientRef.current || !outputAudioContextRef.current || !outputNodeRef.current) {
      const message = "Cannot init session, audio context or client not ready.";
      console.error(message);
      setError(message);
      return;
    }
    const outputNode = outputNodeRef.current;
    try {
      const session = await clientRef.current.live.connect({
        model: model,
        callbacks: {
          onopen: () => setStatus('Session Opened'),
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            const outputCtx = outputAudioContextRef.current;
            if (audio && audio.data && outputCtx) {
              try {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audio.data), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (e) {
                console.error("Error playing back audio:", e);
                setError("Failed to process and play back audio response.");
              }
            }
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => setError(e.message),
          onclose: (e: CloseEvent) => {
            if (e.wasClean) {
              setStatus('Session Closed');
            } else {
              setStatus(`Session Closed Unexpectedly: ${e.reason} (Code: ${e.code})`);
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: "You are a friendly and helpful conversational AI.",
        },
      });
      sessionRef.current = session;
      setStatus('Session initialized. Ready to record.');
    } catch (e: any) {
      console.error('Error initializing session:', e);
      setError(`Error initializing session: ${e.message || e}`);
    }
  }, [model]);

  useEffect(() => {
    let isMounted = true;
    const effectiveApiKey = userApiKey || process.env.API_KEY;

    const cleanup = () => {
      stopRecording(false);
      stopVideoStream();
      if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) { console.warn("Error closing session:", e); }
      }
      sessionRef.current = null;
      inputAudioContextRef.current?.close().catch(console.error);
      outputAudioContextRef.current?.close().catch(console.error);
      inputAudioContextRef.current = null;
      outputAudioContextRef.current = null;
      outputNodeRef.current = null;
      setOutputNodeForVisualizer(null);
    };

    if (!isOpen) {
      cleanup();
      return;
    }

    const setup = async () => {
      if (!isMounted) return;
      if (!effectiveApiKey) {
        setError('API Key not found. Please set it in Settings > Account & API.');
        return;
      }

      try {
        clientRef.current = new GoogleGenAI({ apiKey: effectiveApiKey });

        // @ts-ignore
        const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx;
        // @ts-ignore
        const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        outputAudioContextRef.current = outputCtx;

        const outputGainNode = outputCtx.createGain();
        outputGainNode.connect(outputCtx.destination);
        outputNodeRef.current = outputGainNode;
        setOutputNodeForVisualizer(outputGainNode);
        nextStartTimeRef.current = outputCtx.currentTime;

        await initSession();
      } catch (err: any) {
        console.error("Setup failed:", err);
        setError(`Initialization failed: ${err.message}`);
      }
    };

    setup();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isOpen, stopRecording, initSession, stopVideoStream, userApiKey]);

  const startRecording = async () => {
    if (isRecording) return;
    if (!sessionRef.current) {
      setError('Session not initialized. Please wait or reset.');
      await initSession();
      if (!sessionRef.current) return;
    }
    const inputCtx = inputAudioContextRef.current;
    const outputCtx = outputAudioContextRef.current;
    if (!inputCtx || !outputCtx) {
      setError('Audio contexts not available.');
      return;
    }

    setIsPaused(false);

    if (inputCtx.state === 'suspended') await inputCtx.resume();
    if (outputCtx.state === 'suspended') await outputCtx.resume();

    setStatus('Requesting microphone access...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      setStatus('Microphone access granted. Starting capture...');

      sourceNodeRef.current = inputCtx.createMediaStreamSource(stream);

      const bufferSize = 256;
      scriptProcessorNodeRef.current = inputCtx.createScriptProcessor(bufferSize, 1, 1);

      scriptProcessorNodeRef.current.onaudioprocess = (e) => {
        if (!processingStateRef.current.isRecording || processingStateRef.current.isPaused || !sessionRef.current) return;

        const pcmData = e.inputBuffer.getChannelData(0);
        try {
          sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
        } catch (err: any) {
          console.error('Error sending realtime input:', err);
          setError(`Error sending audio: ${err.message}`);
          stopRecording(false);
        }
      };

      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputCtx.destination);

      setIsRecording(true);
      setStatus('🔴 Live');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(`Error starting recording: ${err.message}`);
      stopRecording(false);
    }
  };

  const togglePause = () => {
    setIsPaused(p => {
      const newPausedState = !p;
      if (newPausedState) setStatus('Paused');
      else setStatus('🔴 Live');
      return newPausedState;
    });
  };

  const handleEndSession = () => {
    onClose();
  };

  const startVideoStream = useCallback(async (getStream: () => Promise<MediaStream>, type: 'camera' | 'screen') => {
    stopVideoStream();
    try {
      const stream = await getStream();
      setVideoStream(stream);
      if (type === 'camera') {
        setIsCameraOn(true);
        setIsScreenSharingOn(false);
      } else {
        setIsScreenSharingOn(true);
        setIsCameraOn(false);
      }

      stream.getTracks()[0].onended = () => {
        stopVideoStream();
      };
    } catch (err: any) {
      setError(`Error starting video stream: ${err.message}`);
      // Ensure state is reset if permission is denied
      setIsCameraOn(false);
      setIsScreenSharingOn(false);
    }
  }, [stopVideoStream]);

  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      stopVideoStream();
    } else {
      startVideoStream(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } }), 'camera');
    }
  }, [isCameraOn, stopVideoStream, startVideoStream, cameraFacingMode]);

  const handleSwitchCamera = useCallback(() => {
    if (!isCameraOn) return;
    const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(newFacingMode);
    startVideoStream(
      () => navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } }),
      'camera'
    );
  }, [isCameraOn, cameraFacingMode, startVideoStream]);


  const toggleScreenShare = useCallback(() => {
    if (isScreenSharingOn) {
      stopVideoStream();
    } else {
      setCameraFacingMode('user');
      startVideoStream(() => navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } as any }), 'screen');
    }
  }, [isScreenSharingOn, stopVideoStream, startVideoStream]);


  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 transition-colors duration-300 bg-background text-text-primary`}>
      <div className={`absolute top-0 left-0 w-full h-full z-0 bg-black transition-opacity duration-300 ${videoStream ? 'opacity-100' : 'opacity-0'}`}>
        <video
          ref={videoElementRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${isScreenSharingOn ? '' : 'transform -scale-x-100'}`}
        />
      </div>
      <div className="relative w-full h-full font-sans">
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: '100%',
          }}
        >
          <div className="relative w-full h-full">
            <AudioVisualizer outputNode={outputNodeForVisualizer || undefined} lightTheme={isLightTheme} isMobile={isMobile} />
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-5">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-black/5 dark:bg-white/15`}>
            <span className={`w-2.5 h-2.5 rounded-full bg-accent ${isRecording && !isPaused ? 'animate-[pulse_1.5s_infinite]' : ''}`} />
            <span>{status}</span>
          </div>
        </div>

        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3 p-2.5 rounded-2xl bg-background/80 backdrop-blur-lg border border-border shadow-lg`}>
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${isCameraOn
              ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
              : 'bg-background text-foreground border border-input shadow-sm hover:bg-accent hover:text-accent-foreground'
              }`}
            aria-label={isCameraOn ? 'Stop Camera' : 'Start Camera'}
            title="Toggle Camera"
          >
            {isCameraOn ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          {isMobile && isCameraOn && (
            <button
              onClick={handleSwitchCamera}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all bg-background text-foreground border border-input shadow-sm hover:bg-accent hover:text-accent-foreground`}
              aria-label="Switch Camera"
              title="Switch Camera"
            >
              <SwitchCamera size={24} />
            </button>
          )}
          <button
            onClick={toggleScreenShare}
            className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${isScreenSharingOn
              ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
              : 'bg-background text-foreground border border-input shadow-sm hover:bg-accent hover:text-accent-foreground'
              }`}
            aria-label={isScreenSharingOn ? 'Stop Screen Share' : 'Start Screen Share'}
            title="Toggle Screen Share"
          >
            {isScreenSharingOn ? <ScreenShareOff size={24} /> : <ScreenShare size={24} />}
          </button>
          {isRecording ? (
            <button
              onClick={togglePause}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${isPaused
                ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
                : 'bg-secondary text-secondary-foreground border border-input shadow-sm hover:bg-secondary/80'
                }`}
              aria-label={isPaused ? 'Resume' : 'Pause'}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={24} className="ml-1" /> : <Pause size={24} />}
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
              aria-label="Start"
              title="Start"
            >
              <Mic size={24} />
            </button>
          )}
          <button
            onClick={handleEndSession}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="End Session"
            title="End Session"
          >
            <X size={28} />
          </button>
        </div>

        {error &&
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center p-4 bg-black/20 dark:bg-white/10 rounded-lg backdrop-blur-sm max-w-sm">
            <p className="text-red-400 mt-2">{error}</p>
          </div>
        }
      </div>
    </div>
  );
};
