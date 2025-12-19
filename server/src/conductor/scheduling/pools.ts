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
export type CapacityReservation = {
  pool_id: string;
  reserved_units: number;
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

let capacityFuturesHealthy = true;

export async function listCapacityReservations(): Promise<
  Record<string, number>
> {
  if (!capacityFuturesHealthy) return {};
  try {
    const { rows } = await pg.query<CapacityReservation>(
      'SELECT pool_id, reserved_units FROM capacity_futures',
    );
    const reservations: Record<string, number> = {};
    for (const r of rows) reservations[r.pool_id] = Number(r.reserved_units);
    return reservations;
  } catch {
    capacityFuturesHealthy = false;
    return {};
  }
}

export function pickCheapestEligible(
  candidates: PoolInfo[],
  costs: Record<string, PoolCost>,
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
  reservations: Record<string, number> = {},
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
    const reservationBoost = reservations[p.id] || 0;
    const reservationDiscount =
      reservationBoost > 0 ? Math.min(reservationBoost * 0.01, 0.25) : 0;
    const price =
      (est.cpuSec || 0) * Number(c.cpu_sec_usd) +
      (est.gbSec || 0) * Number(c.gb_sec_usd) +
      (est.egressGb || 0) * Number(c.egress_gb_usd);
    const adjusted = price * (1 - reservationDiscount);
    if (!best || price < best.price) best = { id: p.id, price };
    if (!best || adjusted < best.price) best = { id: p.id, price: adjusted };
  }
  return best;
}
