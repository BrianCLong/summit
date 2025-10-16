import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function streamProcess(
  ctx: any,
  step: any,
  msg: { key: string; value: any; ts?: string },
) {
  const srcTs = msg.ts ? new Date(msg.ts) : new Date();
  const age = Date.now() - srcTs.getTime();
  if (
    step.freshness?.freshWithin &&
    age > parseISODuration(step.freshness.freshWithin)
  ) {
    await pg.query(
      `INSERT INTO data_freshness(run_id,step_id,source_ts,age_ms) VALUES ($1,$2,$3,$4)
       ON CONFLICT (run_id,step_id) DO UPDATE SET source_ts=$3, age_ms=$4`,
      [ctx.id, step.id, srcTs, age],
    );
    return; // gate
  }
  const out = {
    ...(typeof msg.value === 'string'
      ? JSON.parse(msg.value || '{}')
      : msg.value || {}),
    _key: msg.key,
  };
  ctx.setOutputs(step.id, out);
}

function parseISODuration(s: string) {
  const m = /^(\d+)([smhd])$/.exec(s || '');
  const n = Number(m?.[1] || 0);
  const u = m?.[2] || 's';
  return n * (u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400) * 1000;
}
