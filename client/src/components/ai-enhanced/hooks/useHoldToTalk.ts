import { useEffect, useRef } from 'react';
import $ from 'jquery';

/**
 * Hook to enable "hold-to-talk" functionality on a button element.
 * Triggers callbacks when the user presses and releases the button (mouse or touch).
 * Uses jQuery for event binding.
 *
 * @param onStart - Callback function invoked when the user starts holding the button.
 * @param onEnd - Callback function invoked when the user releases the button.
 * @returns A ref to attach to the button element.
 */
export function useHoldToTalk(onStart: () => void, onEnd: () => void) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const $btn = $(ref.current);
    const down = () => onStart();
    const up = () => onEnd();

    $btn.on('mousedown touchstart pointerdown', down);
    $(window).on('mouseup touchend pointerup', up);

    return () => {
      $btn.off('mousedown touchstart pointerdown', down);
      $(window).off('mouseup touchend pointerup', up);
    };
  }, [onStart, onEnd]);
  return ref;
}
