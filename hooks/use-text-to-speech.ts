import {
    forwardRef,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

// Define language popularity order (you can customize this)
const popularLanguages = [
    'en',
    'zh',
    'hi',
    'es',
    'fr',
    'ru',
    'pt',
    'de',
    'ja',
    'ko',
    'it',
    'ar',
    'id',
];

export const IS_SPEECH_SYNTHESIS_SUPPORTED = typeof window !== 'undefined' && !!window.speechSynthesis;
export const getSpeechSynthesisVoices = () => {
    if (typeof window === 'undefined') return [];
    return speechSynthesis
        ?.getVoices()
        .filter((voice) => voice.localService)
        .sort((a, b) => {
            // Default voice first
            if (a.default !== b.default) return a.default ? -1 : 1;

            // Popular languages on top
            const aRank = popularLanguages.indexOf(a.lang.substring(0, 2));
            const bRank = popularLanguages.indexOf(b.lang.substring(0, 2));
            if (aRank !== bRank) {
                const aEffectiveRank = aRank === -1 ? Infinity : aRank;
                const bEffectiveRank = bRank === -1 ? Infinity : bRank;
                return aEffectiveRank - bEffectiveRank;
            }

            // Sort by language and name (alphabetically)
            return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
        }) || [];
}

export function getSpeechSynthesisVoiceByName(name: string) {
    return getSpeechSynthesisVoices().find(
        (voice) => `${voice.name} (${voice.lang})` === name
    );
}

interface TextToSpeechProps {
    text: string;
    voice?: SpeechSynthesisVoice;
    pitch?: number;
    rate?: number;
    volume?: number;
}

export const useTextToSpeech = ({
    text,
    voice, // Voice is optional, if not provided, browser default is used
    pitch = 1,
    rate = 1,
    volume = 1,
}: Partial<TextToSpeechProps>) => { // Partial props to allow easy usage
    const [isPlaying, setIsPlaying] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (!IS_SPEECH_SYNTHESIS_SUPPORTED) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Cleanup previous utterance
        if (utteranceRef.current) {
            speechSynthesis.cancel();
        }
    }, []);

    const play = useCallback(() => {
        if (!IS_SPEECH_SYNTHESIS_SUPPORTED) {
            console.warn('Speech synthesis not supported');
            return;
        }
        if (!text) {
            return;
        }

        speechSynthesis.cancel(); // Stop any current speaking

        const utterance = new window.SpeechSynthesisUtterance(text);

        // If voice is provided, set it. Otherwise browser default.
        // If we wanted to ensure a voice from our 'getSpeechConfig' we would do it here.
        if (voice) {
            utterance.voice = voice;
        }

        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = volume;

        // Event handlers
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = (event) => {
            if (event.error === 'interrupted') {
                setIsPlaying(false);
                return;
            }
            console.error('Speech synthesis error: ', event.error);
            setIsPlaying(false);
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);

    }, [text, pitch, rate, volume, voice]);

    const stop = useCallback(() => {
        if (!IS_SPEECH_SYNTHESIS_SUPPORTED) return;
        speechSynthesis.cancel();
        setIsPlaying(false);
    }, []);

    return {
        isPlaying,
        play,
        stop,
    };
};
