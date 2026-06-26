import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Custom hook to manage prefilled messages from URL query parameters.
 * Looks for 'm' (message) or 'q' (query) parameters.
 * If 'q' is present, the message should be sent immediately.
 */
export function usePrefilledMessage() {
    const searchParams = useSearchParams();

    const [prefilledContent, setPrefilledContent] = useState('');
    const [isPrefilledSend, setIsPrefilledSend] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked || !searchParams) return;

        const message = searchParams.get('m') || searchParams.get('q') || '';
        const send = searchParams.has('q');

        if (message) {
            setPrefilledContent(message);
            setIsPrefilledSend(send);

            // We can't easily clean up URL params in Next.js app router without causing a navigation/render loop
            // or using router.replace() which might be side-effect heavy in this effect.
            // For now, we just consume it once.
            // If cleanup is strictly required, implementing it via router.replace() is needed.
        }

        setHasChecked(true);

    }, [searchParams, hasChecked]);

    return { prefilledContent, isPrefilledSend };
}
