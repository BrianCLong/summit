// =============================================
// File: apps/web/src/hooks/useMaestroLogs.ts
// =============================================
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LogEvent } from '../lib/maestroApi';
import { maestroApi } from '../lib/maestroApi';

export function useLogs() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const disposer = useRef<null | (() => void)>(null);

  useEffect(() => {
    disposer.current = maestroApi.logsStream((e) => setEvents((prev) => [e, ...prev].slice(0, 500)));
    return () => { if (disposer.current) disposer.current(); };
  }, []);

  const stats = useMemo(() => {
    const c = { info: 0, warn: 0, error: 0 } as Record<'info'|'warn'|'error', number>;
    events.forEach((e) => { c[e.level]++; });
    return c;
  }, [events]);

  return { events, stats };
}
