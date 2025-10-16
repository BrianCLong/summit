import { Pool } from 'pg';
import { replayRun } from '../conductor/src/replay/runner';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runBackfillsTick(limit = 5) {
  const { rows: jobs } = await pg.query(
    `SELECT * FROM backfill_jobs WHERE status='QUEUED' ORDER BY created_at LIMIT $1`,
    [limit],
  );
  for (const j of jobs) {
    await pg.query(`UPDATE backfill_jobs SET status='RUNNING' WHERE id=$1`, [
      j.id,
    ]);
    try {
      // enumerate runs in window for that runbook/tenant; then replay
      const { rows: ids } = await pg.query(
        `SELECT id FROM run WHERE tenant=$1 AND runbook=$2 AND started_at BETWEEN $3 AND $4`,
        [j.tenant, j.runbook, j.window_start, j.window_end],
      );
      for (const r of ids) await replayRun(r.id);
      await pg.query(`UPDATE backfill_jobs SET status='DONE' WHERE id=$1`, [
        j.id,
      ]);
    } catch (e) {
      await pg.query(`UPDATE backfill_jobs SET status='FAILED' WHERE id=$1`, [
        j.id,
      ]);
    }
  }
}
