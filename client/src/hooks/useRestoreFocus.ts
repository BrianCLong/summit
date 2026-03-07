import { useEffect, useRef } from "react";

type UseRestoreFocusOptions = {
  enabled?: boolean;
  fallbackRef?: React.RefObject<HTMLElement>;
};

export function useRestoreFocus(isOpen: boolean, options: UseRestoreFocusOptions = {}) {
  const { enabled = true, fallbackRef } = options;
  const wasOpenRef = useRef<boolean>(isOpen);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : null;
    } else if (wasOpenRef.current) {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus({ preventScroll: true });
      } else if (fallbackRef?.current) {
        fallbackRef.current.focus({ preventScroll: true });
      }
    }

    wasOpenRef.current = isOpen;
  }, [enabled, fallbackRef, isOpen]);

  return previouslyFocusedRef;
}

export default useRestoreFocus;
