export type Metrics = { p95ms: number; err: number; usd: number };
export function simulate(baseline: Metrics, patch: Partial<Metrics>) {
  const out = { ...baseline };
  if (patch.p95ms != null) out.p95ms = baseline.p95ms * (1 + patch.p95ms);
  if (patch.err != null) out.err = baseline.err * (1 + patch.err);
  if (patch.usd != null) out.usd = baseline.usd * (1 + patch.usd);
  return out;
}
