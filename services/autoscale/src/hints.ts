import { holtWinters } from './forecast';
import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function computeScaleHints() {
  const { rows } = await pg.query(
    `SELECT date_trunc('minute', ts) m, count(*) q FROM run_queue WHERE ts > now()-interval '2 hours' GROUP BY 1 ORDER BY 1`,
  );
  const series = rows.map((r) => Number(r.q));
  const next = holtWinters(series);
  // publish to KEDA via annotations or to Redis that controller reads
  return { minuteAhead: Math.round(next) };
}
