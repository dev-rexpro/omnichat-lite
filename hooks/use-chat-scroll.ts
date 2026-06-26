import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Distance from bottom (in pixels) to consider "at the bottom".
 * @default 100
 */
const AT_BOTTOM_THRESHOLD = 100;

/**
 * Custom hook for managing sticky chat scroll behavior.
 * 
 * Tracks whether the user is scrolled to the bottom. If they are, 
 * subsequent calls to scrollToBottom (e.g., when new messages arrive) 
 * will keep them at the bottom. if they scroll up, auto-scroll is disabled.
 */
export function useChatScroll(
    elementRef: React.RefObject<HTMLElement | null>
) {
    const isAtBottomRef = useRef(true); // Default to true (start at bottom)
    const [showScrollButton, setShowScrollButton] = React.useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;

            // Check if user is near bottom (within threshold)
            // We use a slightly generous threshold to catch "almost" bottom cases
            const isAtBottom = distanceToBottom <= AT_BOTTOM_THRESHOLD;
            isAtBottomRef.current = isAtBottom;
            setShowScrollButton(!isAtBottom); // Show button if NOT at bottom
        };

        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
    }, [elementRef]);

    /**
     * Forces a scroll to the bottom regardless of current position.
     */
    const scrollImmediate = useCallback(
        (behavior: ScrollBehavior = 'auto') => {
            const element = elementRef?.current;
            if (!element) return;

            // We use a double requestAnimationFrame to ensure we run after layout updates
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    element.scrollTo({ top: element.scrollHeight, behavior });
                    isAtBottomRef.current = true; // Reset state
                });
            });
        },
        [elementRef]
    );

    /**
     * Scrolls to bottom ONLY if the user was already at the bottom.
     * This is safe to call on every message update.
     */
    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = 'smooth') => {
            const element = elementRef?.current;
            if (!element) return;

            // Only scroll if we were previously at the bottom
            if (isAtBottomRef.current) {
                // If the content grew significantly, smooth scroll might take too long
                // or look weird if called repeatedly. 'auto' (instant) is often better for streaming text.
                // But we'll respect the passed behavior, defaulting to smooth.

                // However, for rapid streaming, standard scrollTo might lag.
                // We just set scrollTop for instant snap if behavior is auto
                if (behavior === 'auto') {
                    element.scrollTop = element.scrollHeight;
                } else {
                    element.scrollTo({ top: element.scrollHeight, behavior });
                }
            }
        },
        [elementRef]
    );

    return { scrollImmediate, scrollToBottom, showScrollButton };
}
