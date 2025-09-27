import { useEffect, useRef } from "react";
import $ from "jquery";

export function useHoldToTalk(onStart: () => void, onEnd: () => void) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const $btn = $(ref.current);
    const down = () => onStart();
    const up = () => onEnd();

    $btn.on("mousedown touchstart pointerdown", down);
    $(window).on("mouseup touchend pointerup", up);

    return () => {
      $btn.off("mousedown touchstart pointerdown", down);
      $(window).off("mouseup touchend pointerup", up);
    };
  }, [onStart, onEnd]);
  return ref;
}
