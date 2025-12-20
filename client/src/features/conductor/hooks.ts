// @ts-nocheck
import { useEffect, useState } from 'react';
import { RolloutStep } from './panels/RolloutTimeline';
import { Denial } from './panels/BudgetGuardrails';
import { StepNode } from './panels/ProvenanceTree';

type Fetcher<T> = () => Promise<T>;

function useData<T>(
  fetcher: Fetcher<T>,
  deps: unknown[] = [],
  opts: { refreshMs?: number } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        const res = await fetcher();
        if (!alive) return;
        setData(res);
        setUpdatedAt(Date.now());
        setError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    let t: ReturnType<typeof setInterval>;
    if (opts.refreshMs) t = setInterval(run, opts.refreshMs);
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, deps);

  return { data, error, loading, updatedAt };
}

export function useRolloutSteps() {
  const api = (import.meta.env.VITE_ROLLOUTS_API as string) || '';
  return useData<RolloutStep[]>(
    async () => {
      if (api) {
        const r = await fetch(api);
        if (!r.ok) throw new Error('rollouts api error');
        return (await r.json()) as RolloutStep[];
      }
      return [
        { weight: 10, status: 'completed', analysis: 'pass' },
        { weight: 25, status: 'completed', analysis: 'pass' },
        { weight: 50, status: 'running', analysis: 'running' },
        { weight: 100, status: 'pending' },
      ];
    },
    [api],
    { refreshMs: 15000 },
  );
}

export function useCanaryHealth(target: string) {
  const prom = (import.meta.env.VITE_PROM_URL as string) || '';
  return useData<{
    availability: number;
    p95TtfbMs: number;
    errorRate: number;
  }>(
    async () => {
      if (prom) {
        const q1 = `avg_over_time(probe_success{job="blackbox",instance="${target}"}[5m])`;
        const q2 = `histogram_quantile(0.95,sum(rate(probe_http_duration_seconds_bucket{job="blackbox",instance="${target}",phase="first_byte"}[5m])) by (le))`;
        const [a1, a2] = await Promise.all([
          fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q1)}`).then(
            (r) => r.json(),
          ),
          fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q2)}`).then(
            (r) => r.json(),
          ),
        ]);
        const availability = Number(a1.data?.result?.[0]?.value?.[1] || 0);
        const p95TtfbMs = Number(a2.data?.result?.[0]?.value?.[1] || 0) * 1000;
        return { availability, p95TtfbMs, errorRate: 0 };
      }
      return { availability: 0.997, p95TtfbMs: 870, errorRate: 0.003 };
    },
    [prom, target],
    { refreshMs: 30000 },
  );
}

export function useBudgetDenials() {
  const api = (import.meta.env.VITE_POLICY_API as string) || '';
  return useData<Denial[]>(
    async () => {
      if (api) {
        const r = await fetch(`${api}/denials?window=24h`);
        if (!r.ok) throw new Error('policy api error');
        return (await r.json()) as Denial[];
      }
      return [
        {
          time: new Date().toISOString(),
          tenant: 'acme',
          caseId: '42',
          reason: 'Daily budget exceeded for LLM_HEAVY',
          rule: 'budget.daily.usd',
        },
      ];
    },
    [api],
    { refreshMs: 60000 },
  );
}

export function useProvenanceRoot() {
  const api = (import.meta.env.VITE_PROV_API as string) || '';
  return useData<StepNode>(async () => {
    if (api) {
      const r = await fetch(`${api}/latest`);
      if (!r.ok) throw new Error('prov api error');
      return await r.json();
    }
    return {
      id: 'root',
      label: 'Runbook R1: Rapid Attribution',
      children: [
        { id: '1', label: 'STIX feed → claim-abc123' },
        { id: '2', label: 'Normalize (map_to_canonical) → claim-def456' },
        { id: '3', label: 'Graph upsert → claim-ghi789' },
        { id: '4', label: 'Narrative build (citations: 5)' },
      ],
    } as StepNode;
  }, [api]);
}
