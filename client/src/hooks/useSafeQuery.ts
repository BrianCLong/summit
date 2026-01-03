import { useEffect, useMemo, useState } from 'react';

// Minimal safe query wrapper. In production, generated hooks should be used.
// While codegen is pending, this wrapper can return mocked data in DEV/tests.

export function useSafeQuery<T = any>({
  queryKey,
  fetcher,
  mock,
  deps = [],
}: {
  queryKey: string;
  fetcher?: (opts: { signal: AbortSignal }) => Promise<T>;
  mock?: T;
  deps?: any[];
}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const shouldMock =
    (import.meta as any).env?.DEV || process.env.NODE_ENV === 'test';

  const memoDeps = useMemo(() => deps, deps);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (shouldMock && mock !== undefined) {
          await new Promise((r) => setTimeout(r, 10));
          if (!signal.aborted) setData(mock);
        } else if (fetcher) {
          // Assuming the fetcher can accept a signal
          const res = await fetcher({ signal });
          if (!signal.aborted) setData(res);
        } else {
          if (!signal.aborted) setData(undefined as any);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e);
        }
      } finally {
        setLoading(false);
        // DEV-only telemetry stub
        if (shouldMock && !signal.aborted) {
          (window as any).__ui_metrics = (window as any).__ui_metrics || {};
          (window as any).__ui_metrics[queryKey] =
            ((window as any).__ui_metrics[queryKey] || 0) + 1;
        }
      }
    }
    run();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, memoDeps);

  return { data, loading, error } as const;
}
