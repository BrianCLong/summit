import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PerfOverlayState = {
  lastDuration: number | null;
  lastPhase: string | null;
  renderCount: number;
};

// eslint-disable-next-line react-refresh/only-export-components
export function usePerfMarkers(label: string, enabled: boolean) {
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const renderCountRef = useRef(0);
  const renderStartRef = useRef(performance.now());

  renderStartRef.current = performance.now();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) return;

    const duration = performance.now() - renderStartRef.current;
    renderCountRef.current += 1;
    setLastDuration(duration);
    setLastPhase("render");

    // eslint-disable-next-line no-console
    console.debug(`[perf][${label}] render #${renderCountRef.current} ${duration.toFixed(2)}ms`);
  });

  const mark = useCallback(
    (phase: string) => {
      if (!enabled) return () => {};
      const start = performance.now();
      const marker = `${label}:${phase}:${renderCountRef.current + 1}`;

      if (performance.mark) {
        performance.mark(`${marker}:start`);
      }

      return () => {
        const duration = performance.now() - start;

        if (performance.mark && performance.measure) {
          performance.mark(`${marker}:end`);
          performance.measure(`${label}:${phase}`, `${marker}:start`, `${marker}:end`);
        }

        setLastDuration(duration);
        setLastPhase(phase);

        // eslint-disable-next-line no-console
        console.debug(
          `[perf][${label}] ${phase} ${duration.toFixed(2)}ms (#${renderCountRef.current})`
        );
      };
    },
    [enabled, label]
  );

  const overlayState = useMemo(
    (): PerfOverlayState => ({
      lastDuration,
      lastPhase,
      renderCount: renderCountRef.current,
    }),
    [lastDuration, lastPhase]
  );

  return { mark, overlayState };
}

export function PerfMarkOverlay({
  label,
  state,
  show,
}: {
  label: string;
  state: PerfOverlayState;
  show: boolean;
}) {
  if (!show || !state.renderCount) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-40 rounded-md bg-gray-900/90 px-3 py-2 text-xs text-white shadow-lg"
    >
      <div className="font-semibold">{label} perf</div>
      <div className="opacity-80">
        last: {state.lastDuration?.toFixed(1) ?? "—"}ms ({state.lastPhase})
      </div>
      <div className="opacity-80">renders: {state.renderCount}</div>
    </div>
  );
}
