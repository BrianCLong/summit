import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function checkQuota(tenant: string) {
  if ((process.env.QUOTAS_ENABLED || 'true').toLowerCase() !== 'true')
    return { allow: true } as const;
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const {
    rows: [q],
  } = await pg.query('SELECT * FROM quotas WHERE tenant=$1', [tenant]);
  if (!q) return { allow: true } as const;
  const {
    rows: [u],
  } = await pg.query(
    'SELECT * FROM usage_counters WHERE tenant=$1 AND month=$2',
    [tenant, month],
  );
  const over = (field: string, limit?: number) =>
    u && limit && Number(u[field] || 0) >= Number(limit || 0);
  const warn = [
    'cpu_sec_limit',
    'gb_sec_limit',
    'egress_gb_limit',
    'runs_limit',
  ].some((k) => over(k.replace('_limit', ''), q[k]));
  const hardBlock = q.hard && warn;
  return hardBlock
    ? { allow: false as const, reason: 'quota exceeded (hard)' }
    : { allow: true as const, warn };
}

export async function accrueUsage(
  tenant: string,
  deltas: {
    cpuSec?: number;
    gbSec?: number;
    egressGb?: number;
    runInc?: boolean;
  },
) {
  const month = new Date().toISOString().slice(0, 7) + '-01';
  await pg.query(
    `INSERT INTO usage_counters(tenant,month,cpu_sec,gb_sec,egress_gb,runs)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant,month) DO UPDATE SET
       cpu_sec = usage_counters.cpu_sec + EXCLUDED.cpu_sec,
       gb_sec = usage_counters.gb_sec + EXCLUDED.gb_sec,
       egress_gb = usage_counters.egress_gb + EXCLUDED.egress_gb,
       runs = usage_counters.runs + EXCLUDED.runs`,
    [
      tenant,
      month,
      deltas.cpuSec || 0,
      deltas.gbSec || 0,
      deltas.egressGb || 0,
      deltas.runInc ? 1 : 0,
    ],
  );
}
