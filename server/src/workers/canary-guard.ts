import fetch from 'node-fetch';
import { evaluateCanary } from '../conductor/rollback.js';

async function promQuery(expr: string): Promise<number> {
  const base = process.env.PROMETHEUS_URL;
  if (!base) throw new Error('PROMETHEUS_URL not set');
  const url = `${base}/api/v1/query?query=${encodeURIComponent(expr)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`prom ${r.status}`);
  const j = await r.json();
  const v = j.data?.result?.[0]?.value?.[1];
  return Number(v || 0);
}

export async function runCanaryGuard(
  runId: string,
  thresholds: { errorRatePct: number; p95LatencyMs: number },
) {
  const fetchMetrics = async () => {
    const errorRate = await promQuery(
      `sum(rate(conductor_run_errors_total{run_id="${runId}"}[5m]))`,
    );
    const p95 = await promQuery(
      `histogram_quantile(0.95, sum(rate(conductor_step_latency_ms_bucket{run_id="${runId}"}[5m])) by (le))`,
    );
    return { errorRate, p95 };
  };
  const rollback = async () => {
    // Emit rollback desired event; controller should revert version pointer and pause triggers
    // In practice, call a mutation or internal controller here
    console.log(`[canary-guard] rollback triggered for ${runId}`);
  };
  return evaluateCanary(runId, thresholds, fetchMetrics, rollback);
}
