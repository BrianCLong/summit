import cron from 'cron-parser';
import { getPostgresPool } from '../db/postgres.js';
import { choosePool } from './scheduling/selector.js';
import { acquireTenantSlot, refillAll } from './scheduler/fair.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

let _stop = false;

export function startSchedulerLoop() {
  _stop = false;
  loop();
  return {
    stop: () => {
      _stop = true;
    },
  };
}

async function loop() {
  const pool = getPostgresPool();
  while (!_stop) {
    try {
      refillAll(1);
    } catch {}
    const span = otelService.createSpan('conductor.scheduler.tick');
    try {
      const { rows } = await pool.query(
        `SELECT id, runbook, cron, last_run_at FROM schedules WHERE enabled`,
      );
      const now = new Date();
      for (const s of rows) {
        try {
          const it = cron.parseExpression(s.cron, {
            currentDate: s.last_run_at || new Date(0),
          });
          const next = it.next().toDate();
          if (next <= now) {
            // Windowed budgets (placeholder): enforce simple per-minute cap via env
            const cap = Number(process.env.SCHEDULER_WINDOW_CAP || 100);
            if (cap > 0) {
              // A simple throttle: count runs started in the last minute
              const c = await pool.query(
                `SELECT count(1) FROM run WHERE started_at > now() - interval '1 minute'`,
              );
              const count = Number(c.rows?.[0]?.count || 0);
              if (count >= cap) continue;
            }
            let choice: any = null;
            if (
              (process.env.ADVISOR_AUTO_APPLY || 'false').toLowerCase() ===
              'true'
            ) {
              // Estimate costs (very rough stub; replace with historical estimator)
              const est = estimateFromRunbook(s.runbook);
              // Residency from runbook hint (e.g., eu/us prefix) or env default
              const residency = process.env.DEFAULT_RESIDENCY || undefined;
              choice = await choosePool(est, residency);
            }
            // Fairness: gate per-tenant concurrency (tenant inference TBD)
            const tenant = 'default';
            if (!acquireTenantSlot(tenant)) continue;
            // Start run: insert and annotate via run_event for chosen pool
            const r = await pool.query(
              `INSERT INTO run (id, runbook, status, started_at) VALUES (gen_random_uuid(), $1, 'PENDING', now()) RETURNING id`,
              [s.runbook],
            );
            if (choice?.id) {
              await pool.query(
                `INSERT INTO run_event (run_id, kind, payload) VALUES ($1,'schedule.dispatched',$2)`,
                [r.rows[0].id, { pool: choice.id, est }],
              );
            }
            await pool.query(
              `UPDATE schedules SET last_run_at = now() WHERE id=$1`,
              [s.id],
            );
            otelService.addSpanAttributes({
              'run.id': r.rows[0].id,
              'scheduler.schedule_id': s.id,
            });
          }
        } catch {}
      }
    } catch {
    } finally {
      span?.end();
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

function estimateFromRunbook(runbook: string): {
  cpuSec: number;
  gbSec: number;
  egressGb: number;
} {
  const norm = runbook.toLowerCase();
  // naive heuristics: tweak as needed
  if (norm.includes('heavy') || norm.includes('gnn') || norm.includes('ml'))
    return { cpuSec: 600, gbSec: 10, egressGb: 0.5 };
  if (norm.includes('export') || norm.includes('report'))
    return { cpuSec: 120, gbSec: 2, egressGb: 0.2 };
  if (norm.includes('graph') || norm.includes('cypher'))
    return { cpuSec: 60, gbSec: 1, egressGb: 0.05 };
  return { cpuSec: 30, gbSec: 0.5, egressGb: 0.01 };
}
