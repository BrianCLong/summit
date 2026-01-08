import { useEffect } from "react";

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  onClose?: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const prevActive = document.activeElement as HTMLElement | null;
    if (first) first.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose?.();
      }
      if (e.key !== "Tab") return;
      if (focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          (last || first).focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          (first || last).focus();
        }
      }
    }
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("keydown", onKey);
      if (prevActive) prevActive.focus();
    };
  }, [containerRef, isOpen, onClose]);
}
