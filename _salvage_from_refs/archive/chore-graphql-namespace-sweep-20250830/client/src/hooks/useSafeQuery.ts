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
  fetcher?: () => Promise<T>;
  mock?: T;
  deps?: any[];
}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const shouldMock = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'test';

  const memoDeps = useMemo(() => deps, deps);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      try {
        if (shouldMock && mock !== undefined) {
          await new Promise((r) => setTimeout(r, 10));
          if (mounted) setData(mock);
        } else if (fetcher) {
          const res = await fetcher();
          if (mounted) setData(res);
        } else {
          if (mounted) setData(undefined as any);
        }
        if (mounted) setError(null);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
        // DEV-only telemetry stub
        if (shouldMock) {
          (window as any).__ui_metrics = (window as any).__ui_metrics || {};
          (window as any).__ui_metrics[queryKey] = ((window as any).__ui_metrics[queryKey] || 0) + 1;
        }
      }
    }
    run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, memoDeps);

  return { data, loading, error } as const;
}

