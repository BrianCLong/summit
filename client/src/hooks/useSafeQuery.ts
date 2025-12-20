import { useEffect, useMemo, useState } from 'react';

/**
 * A wrapper for executing queries safely, with support for mocking in development/test environments.
 *
 * @param options - The configuration options for the query.
 * @param options.queryKey - A unique key identifying the query, used for metrics/logging.
 * @param options.fetcher - An optional async function to fetch the data.
 * @param options.mock - Optional mock data to return in DEV/test environments.
 * @param options.deps - An array of dependencies that trigger the query to re-run when changed.
 * @returns An object containing the query data, loading state, and error state.
 */
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

  const shouldMock =
    (import.meta as any).env?.DEV || process.env.NODE_ENV === 'test';

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
          (window as any).__ui_metrics[queryKey] =
            ((window as any).__ui_metrics[queryKey] || 0) + 1;
        }
      }
    }
    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, memoDeps);

  return { data, loading, error } as const;
}
