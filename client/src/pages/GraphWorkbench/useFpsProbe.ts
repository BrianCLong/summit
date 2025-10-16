import { useEffect, useRef, useState } from 'react';

export function useFpsProbe(enabled = import.meta.env.DEV) {
  const lastFrameRef = useRef(performance.now());
  const [fps, setFps] = useState<number>(0);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const loop = (timestamp: number) => {
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      const currentFps = 1000 / delta;
      setFps(Math.round(currentFps));

      // Keep rolling history of 60 samples
      setFpsHistory((prev) => {
        const newHistory = [...prev, currentFps].slice(-60);
        return newHistory;
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled]);

  const averageFps =
    fpsHistory.length > 0
      ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
      : 0;

  const minFps =
    fpsHistory.length > 0 ? Math.round(Math.min(...fpsHistory)) : 0;

  return {
    current: fps,
    average: averageFps,
    minimum: minFps,
    samples: fpsHistory.length,
    isHealthy: averageFps >= 55, // Target 55+ FPS average
  };
}
