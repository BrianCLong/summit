import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function chargeEpsilon(
  tenant: string,
  dataset: string,
  eps: number,
) {
  const ym = new Date().toISOString().slice(0, 7);
  await pg.query('BEGIN');
  const {
    rows: [b],
  } = await pg.query(
    `SELECT epsilon_limit, epsilon_spent FROM dp_budgets WHERE tenant=$1 AND dataset=$2 AND month=$3 FOR UPDATE`,
    [tenant, dataset, ym],
  );
  if (!b) throw new Error('dp budget not configured');
  const next = Number(b.epsilon_spent) + eps;
  if (next > Number(b.epsilon_limit)) {
    await pg.query('ROLLBACK');
    return { ok: false, level: 'exhausted' };
  }
  await pg.query(
    `UPDATE dp_budgets SET epsilon_spent=$4 WHERE tenant=$1 AND dataset=$2 AND month=$3`,
    [tenant, dataset, ym, next],
  );
  await pg.query('COMMIT');
  return { ok: true, remaining: Number(b.epsilon_limit) - next };
}
