
import React, { useRef, useEffect } from 'react';
import { Analyser } from '../lib/analyser';

interface AudioVisualizerProps {
  outputNode?: AudioNode;
  lightTheme: boolean;
  isMobile?: boolean;
}

interface WaveLayer {
  color: string;
  baseAmplitude: number;
  frequency: number;
  speed: number;
  phase: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ outputNode, lightTheme, isMobile = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<Analyser | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Aurora palette: Balanced for viscous fluid logic
  const darkWaves: WaveLayer[] = [
    { color: 'rgba(59, 130, 246, 0.95)', baseAmplitude: 30, frequency: 0.004, speed: 0.3, phase: 0 },
    { color: 'rgba(168, 85, 247, 0.9)', baseAmplitude: 45, frequency: 0.002, speed: 0.25, phase: 2.5 },
    { color: 'rgba(236, 72, 153, 0.9)', baseAmplitude: 35, frequency: 0.005, speed: 0.35, phase: 1.2 },
    { color: 'rgba(34, 197, 94, 0.85)', baseAmplitude: 25, frequency: 0.004, speed: 0.3, phase: 4.0 },
  ];

  const lightWaves: WaveLayer[] = [
    { color: 'rgba(37, 99, 235, 0.85)', baseAmplitude: 30, frequency: 0.004, speed: 0.3, phase: 0 },
    { color: 'rgba(147, 51, 234, 0.8)', baseAmplitude: 45, frequency: 0.002, speed: 0.25, phase: 2.5 },
    { color: 'rgba(219, 39, 119, 0.8)', baseAmplitude: 35, frequency: 0.005, speed: 0.35, phase: 1.2 },
    { color: 'rgba(22, 163, 74, 0.7)', baseAmplitude: 25, frequency: 0.004, speed: 0.3, phase: 4.0 },
  ];

  useEffect(() => {
    if (outputNode) {
      analyserRef.current = new Analyser(outputNode, 512); 
    }
  }, [outputNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      let volume = 0;
      if (analyserRef.current) {
        analyserRef.current.update();
        const dataArray = analyserRef.current.data;
        if (dataArray) {
          let sum = 0;
          for (let i = 5; i < 100; i++) {
            sum += dataArray[i];
          }
          volume = (sum / 95) / 255;
        }
      } else {
        const t = Date.now();
        volume = 0.06 + Math.sin(t / 1500) * 0.02 + Math.cos(t / 2500) * 0.01;
      }
      
      phaseRef.current += 0.003 + (volume * 0.08);
      const globalTime = phaseRef.current;

      const venomSpike = 1.8 + (volume * 6); 

      // Slightly reduced height multiplier to prevent "over keatas"
      const audioAmpBonus = Math.pow(volume, 0.7) * (height * 0.52);

      ctx.globalCompositeOperation = lightTheme ? 'multiply' : 'screen';
      const layers = lightTheme ? lightWaves : darkWaves;

      layers.forEach((wave, index) => {
        ctx.beginPath();
        const offset = globalTime * wave.speed * 8;
        
        const step = 2; 
        for (let x = 0; x <= width + step; x += step) {
          const currentX = Math.min(x, width);
          const freqMod = 1 + (volume * 0.5);
          const xFactor = currentX * wave.frequency * freqMod;
          
          let combined = Math.sin(xFactor + offset + wave.phase);
          combined += Math.sin(xFactor * 2.1 - offset * 0.5 + wave.phase) * 0.5;
          
          let noise = combined / 1.5;
          
          const sharpNoise = Math.sign(noise) * Math.pow(Math.abs(noise), venomSpike);
          
          let directionalAmp = 1;
          if (sharpNoise < 0) {
             directionalAmp = 1 + (volume * 5.0); 
          }

          const edgeTaper = Math.sin((currentX / width) * Math.PI);
          const totalAmp = (wave.baseAmplitude + audioAmpBonus) * directionalAmp;
          
          // Baseline: Desktop uses 0.77. Mobile uses 0.88 to be lower.
          const baselineFactor = isMobile ? 0.88 : 0.77;
          
          // Reduced the spike multiplier (0.38 instead of 0.4) and upward shift (0.16 instead of 0.2)
          const y = (height * baselineFactor) + (sharpNoise * totalAmp * 0.38 * edgeTaper) - (audioAmpBonus * 0.16);

          if (currentX === 0) ctx.moveTo(currentX, y);
          else ctx.lineTo(currentX, y);
        }

        const gradient = ctx.createLinearGradient(0, height * 0.1, 0, height);
        gradient.addColorStop(0, wave.color);
        const fadeOut = wave.color.replace(/[\d.]+\)$/g, '0)');
        
        gradient.addColorStop(0.5, wave.color.replace(/[\d.]+\)$/g, '0.5)'));
        gradient.addColorStop(1, fadeOut);

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [lightTheme, darkWaves, lightWaves, isMobile]);

  return (
    <div className={`absolute inset-0 z-0 transition-all duration-700 pointer-events-none ${
      lightTheme 
        ? 'blur-[2px] saturate-[1.6] opacity-90' 
        : 'blur-[3px] saturate-[2.0] opacity-100'
    }`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
