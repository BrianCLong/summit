import crypto from 'crypto';

export type Strategy = {
  mode: 'standard' | 'shadow' | 'canary';
  shadowOf?: string;
  canary?: {
    baseline: string;
    trafficPercent: number;
    rollbackOn?: { errorRatePct: number; p95LatencyMs: number };
  };
};

export function shouldShadowSample(runId: string, percent: number) {
  const h = crypto.createHash('sha256').update(runId).digest();
  return h[0] % 100 < percent;
}

export function chooseStrategy(strategy?: Strategy) {
  const s = strategy || { mode: 'standard' as const };
  if (s.mode === 'shadow')
    return { shadow: true, run: 'candidate', baseline: s.shadowOf } as const;
  if (s.mode === 'canary')
    return {
      canary: true,
      trafficPct: s.canary!.trafficPercent,
      baseline: s.canary!.baseline,
      rollbackOn: s.canary!.rollbackOn,
    } as const;
  return { standard: true } as const;
}
