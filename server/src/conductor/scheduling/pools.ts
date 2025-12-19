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

export function estimatePoolPrice(
  cost: PoolCost | undefined,
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  discount = 1,
) {
  if (!cost) return null;
  const base =
    (est.cpuSec || 0) * Number(cost.cpu_sec_usd) +
    (est.gbSec || 0) * Number(cost.gb_sec_usd) +
    (est.egressGb || 0) * Number(cost.egress_gb_usd);
  return base * discount;
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
    const price = estimatePoolPrice(costs[p.id], est);
    if (price === null) continue;
    if (!best || price < best.price) best = { id: p.id, price };
  }
  return best;
}
