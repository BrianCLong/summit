import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function computeBurn(
  runbook: string,
  tenant: string,
  window = '24h',
) {
  // Expect a run_metrics table in future; for now, stub out with zeros
  const p95 = 0,
    sr = 100,
    cost = 0;
  const pol = await pg.query(
    `SELECT * FROM slo_policies WHERE runbook=$1 AND tenant=$2`,
    [runbook, tenant],
  );
  const slo = pol.rows[0] || {
    latency_p95_ms: 30000,
    success_rate_pct: 99,
    cost_per_run_usd: 20,
  };
  const burn =
    ((p95 > slo.latency_p95_ms ? 1 : 0) +
      (sr < slo.success_rate_pct ? 1 : 0) +
      (cost > slo.cost_per_run_usd ? 1 : 0)) /
    3;
  await pg.query(
    `INSERT INTO slo_windows(runbook,tenant,window_start,window_end,p95_ms,success_rate,cost_per_run,burn_rate)
     VALUES ($1,$2,now()-$3::interval,now(),$4,$5,$6,$7)`,
    [runbook, tenant, window, p95, sr, cost, burn],
  );
  return { p95, successRatePct: sr, costPerRunUsd: cost, burnRate: burn };
}

export function constrainedMode(burn: number) {
  return burn >= 0.5;
}
