import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export type PoolInfo = {
  id: string;
  region: string;
  labels: string[];
  capacity: number;
};
export type PoolCost = {
  pool_id: string;
  cpu_sec_usd: number;
  gb_sec_usd: number;
  egress_gb_usd: number;
};

const safeNum = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const safeEst = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

export async function listPools(): Promise<PoolInfo[]> {
  const { rows } = await pg.query(
    'SELECT id, region, labels, capacity FROM pool_registry',
  );
  return rows;
}

export async function currentPricing(): Promise<Record<string, PoolCost>> {
  const { rows } = await pg.query(
    'SELECT pool_id, cpu_sec_usd, gb_sec_usd, egress_gb_usd FROM pool_pricing',
  );
  const m: Record<string, PoolCost> = {};
  for (const r of rows) m[r.pool_id] = r;
  return m;
}

export function pickCheapestEligible(
  candidates: PoolInfo[],
  costs: Record<string, PoolCost>,
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
) {
  let best: { id: string; price: number } | null = null;
  for (const p of candidates) {
    if (
      residency &&
      !p.region.toLowerCase().startsWith(residency.toLowerCase())
    )
      continue;
    const c = costs[p.id];
    if (!c) continue;

    const cpuSec = safeEst(est.cpuSec);
    const gbSec = safeEst(est.gbSec);
    const egressGb = safeEst(est.egressGb);

    const cpuUsd = safeNum(c.cpu_sec_usd);
    const gbUsd = safeNum(c.gb_sec_usd);
    const egressUsd = safeNum(c.egress_gb_usd);

    const price =
      cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd;

    if (
      !best ||
      price < best.price ||
      (price === best.price && p.id.localeCompare(best.id) < 0)
    )
      best = { id: p.id, price };
  }
  return best;
}

export function estimatePoolPrice(
  cost: PoolCost | undefined,
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  discount = 1,
) {
  if (!cost) return 0;
  const cpuSec = safeEst(est.cpuSec);
  const gbSec = safeEst(est.gbSec);
  const egressGb = safeEst(est.egressGb);

  const cpuUsd = safeNum(cost.cpu_sec_usd);
  const gbUsd = safeNum(cost.gb_sec_usd);
  const egressUsd = safeNum(cost.egress_gb_usd);

  return (cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd) * discount;
}
