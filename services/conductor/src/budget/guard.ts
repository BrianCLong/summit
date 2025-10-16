import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function checkBudget(tenant: string, projectedUsd: number) {
  const ym = new Date().toISOString().slice(0, 7);
  const {
    rows: [b],
  } = await pg.query(
    `SELECT limit_usd, soft_pct, hard_pct, spent_usd FROM tenant_budgets WHERE tenant=$1 AND month=$2`,
    [tenant, ym],
  );
  if (!b) return { ok: true, level: 'none' };
  const soft = Number(b.limit_usd) * Number(b.soft_pct);
  const hard = Number(b.limit_usd) * Number(b.hard_pct);
  const next = Number(b.spent_usd) + projectedUsd;
  return next >= hard
    ? { ok: false, level: 'hard' }
    : next >= soft
      ? { ok: true, level: 'soft' }
      : { ok: true, level: 'none' };
}
