// @ts-nocheck
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import {
  capacityActiveReservationsGauge,
  capacityReserveLatencyMs,
  capacityReservationsCounter,
} from '../observability/prometheus.js';
import {
  PoolCost,
  PoolInfo,
  currentPricing,
  estimatePoolPrice,
  listPools,
} from './pools.js';

export type CapacityReservationStatus = 'active' | 'released' | 'expired';

export interface CapacityReservation {
  reservationId: string;
  tenantId: string | null;
  poolId: string;
  computeUnits: number;
  startAt: Date;
  endAt: Date;
  status: CapacityReservationStatus;
}

export interface ReservationRequest {
  tenantId?: string;
  poolId: string;
  computeUnits: number;
  durationHours?: number;
  startAt?: Date | string;
  endAt?: Date | string;
}

export interface EligibleReservedPool {
  reservation: CapacityReservation;
  pool: PoolInfo;
  effectivePrice: number;
}

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const RESERVED_DISCOUNT = Number(process.env.CAPACITY_RESERVED_DISCOUNT || '0.8');
const DEFAULT_TENANT = 'default';

function normalizeTenant(tenantId?: string | null) {
  if (tenantId === undefined) return DEFAULT_TENANT;
  return tenantId;
}

function mapRow(row: { reservation_id: string; tenant_id: string | null; pool_id: string; compute_units: number | string; start_at: Date | string; end_at: Date | string; status: CapacityReservationStatus }): CapacityReservation {
  return {
    reservationId: row.reservation_id,
    tenantId: row.tenant_id,
    poolId: row.pool_id,
    computeUnits: Number(row.compute_units),
    startAt: new Date(row.start_at),
    endAt: new Date(row.end_at),
    status: row.status,
  };
}

async function refreshActiveGauge() {
  try {
    const { rows } = await pg.query(
      `SELECT count(1) as count FROM capacity_reservations WHERE status = 'active' AND end_at >= now()`,
    );
    const count = Number(rows?.[0]?.count || 0);
    capacityActiveReservationsGauge.set(count);
  } catch (error: unknown) {
    logger.warn('⚠️ Failed to refresh capacity reservation gauge', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function pruneExpiredReservations(now = new Date()): Promise<number> {
  const { rowCount } = await pg.query(
    `UPDATE capacity_reservations
       SET status = 'expired', updated_at = now()
     WHERE status = 'active' AND end_at < $1`,
    [now],
  );

  if (rowCount && rowCount > 0) {
    logger.info('🧹 Pruned expired capacity reservations', {
      expired: rowCount,
      cutoff: now.toISOString(),
    });
    await refreshActiveGauge();
  }

  return rowCount || 0;
}

export async function reserveCapacity(
  request: ReservationRequest,
): Promise<{
  reservationId: string;
  costEstimate: number;
  startAt: string;
  endAt: string;
}> {
  const start = Date.now();
  const tenantId = normalizeTenant(request.tenantId);
  const startAt = request.startAt ? new Date(request.startAt) : new Date();
  const endAt = request.endAt
    ? new Date(request.endAt)
    : new Date(
        startAt.getTime() +
          Math.max(1, request.durationHours || 1) * 60 * 60 * 1000,
      );

  if (endAt <= startAt) {
    capacityReservationsCounter.inc({ action: 'reserve', status: 'error' });
    throw new Error('endAt must be after startAt');
  }

  if (!request.computeUnits || request.computeUnits <= 0) {
    capacityReservationsCounter.inc({ action: 'reserve', status: 'error' });
    throw new Error('computeUnits must be greater than 0');
  }

  const prices = await currentPricing();
  const poolPrice = prices[request.poolId];
  if (!poolPrice) {
    capacityReservationsCounter.inc({ action: 'reserve', status: 'error' });
    throw new Error(`No pricing available for pool ${request.poolId}`);
  }

  const durationHours =
    request.durationHours ?? (endAt.getTime() - startAt.getTime()) / 3600000;
  const costEstimate =
    request.computeUnits *
    durationHours *
    Number(poolPrice.cpu_sec_usd) *
    3600 *
    RESERVED_DISCOUNT;

  try {
    const { rows } = await pg.query(
      `INSERT INTO capacity_reservations (
        tenant_id, pool_id, compute_units, start_at, end_at, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', now())
      RETURNING reservation_id, tenant_id, pool_id, compute_units, start_at, end_at, status`,
      [tenantId, request.poolId, request.computeUnits, startAt, endAt],
    );

    const reservation = mapRow(rows[0]);
    const durationMs = Date.now() - start;
    capacityReserveLatencyMs.observe(durationMs);
    capacityReservationsCounter.inc({ action: 'reserve', status: 'success' });
    await refreshActiveGauge();

    logger.info('✅ Reserved mock capacity', {
      tenantId: reservation.tenantId,
      reservationId: reservation.reservationId,
      poolId: reservation.poolId,
      computeUnits: reservation.computeUnits,
      startAt: reservation.startAt.toISOString(),
      endAt: reservation.endAt.toISOString(),
      costEstimate,
    });

    return {
      reservationId: reservation.reservationId,
      costEstimate,
      startAt: reservation.startAt.toISOString(),
      endAt: reservation.endAt.toISOString(),
    };
  } catch (error: any) {
    capacityReservationsCounter.inc({ action: 'reserve', status: 'error' });
    logger.error('❌ Failed to reserve capacity', {
      tenantId,
      poolId: request.poolId,
      error: error.message,
    });
    throw error;
  }
}

export async function releaseReservation(
  reservationId: string,
  tenantId?: string,
): Promise<boolean> {
  try {
    const normalizedTenant = normalizeTenant(tenantId);
    const { rowCount } = await pg.query(
      `UPDATE capacity_reservations
         SET status = 'released', updated_at = now()
       WHERE reservation_id = $1
         AND status = 'active'
         AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [reservationId, normalizedTenant],
    );

    const released = Boolean(rowCount && rowCount > 0);
    capacityReservationsCounter.inc({
      action: 'release',
      status: released ? 'success' : 'error',
    });
    await refreshActiveGauge();

    logger.info('ℹ️ Capacity reservation release attempted', {
      reservationId,
      tenantId: normalizedTenant,
      released,
    });

    return released;
  } catch (error: any) {
    capacityReservationsCounter.inc({ action: 'release', status: 'error' });
    logger.error('❌ Failed to release capacity reservation', {
      reservationId,
      tenantId,
      error: error.message,
    });
    throw error;
  }
}

export async function listReservations(
  tenantId?: string,
  includeExpired = false,
): Promise<CapacityReservation[]> {
  await pruneExpiredReservations();
  const normalizedTenant = normalizeTenant(tenantId);
  const params: any[] = [normalizedTenant];
  const tenantClause = '(tenant_id = $1 OR tenant_id IS NULL)';
  const statusClause = includeExpired ? '' : "AND status != 'expired'";
  const { rows } = await pg.query(
    `SELECT reservation_id, tenant_id, pool_id, compute_units, start_at, end_at, status
       FROM capacity_reservations
      WHERE ${tenantClause} ${statusClause}
      ORDER BY start_at DESC`,
    params,
  );

  const reservations = rows.map(mapRow);
  logger.info('📄 Listed capacity reservations', {
    tenantId: normalizedTenant,
    count: reservations.length,
    includeExpired,
  });

  await refreshActiveGauge();
  return reservations;
}

function filterEligiblePools(
  pools: PoolInfo[],
  residency?: string,
): PoolInfo[] {
  if (!residency) return pools;
  return pools.filter((p) =>
    p.region.toLowerCase().startsWith(residency.toLowerCase()),
  );
}

export async function getEligibleReservedPools(
  tenantId: string | undefined,
  now: Date,
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
  pools?: PoolInfo[],
  prices?: Record<string, PoolCost>,
): Promise<EligibleReservedPool[]> {
  await pruneExpiredReservations(now);
  const normalizedTenant = normalizeTenant(tenantId);
  const params: any[] = [now, normalizedTenant];

  const { rows } = await pg.query(
    `SELECT reservation_id, tenant_id, pool_id, compute_units, start_at, end_at, status
       FROM capacity_reservations
      WHERE status = 'active'
        AND start_at <= $1
        AND end_at >= $1
        AND (tenant_id = $2 OR tenant_id IS NULL)
        AND compute_units > 0`,
    params,
  );

  const allPools = pools || (await listPools());
  const poolMap = new Map(allPools.map((p) => [p.id, p] as const));
  const filteredPools = filterEligiblePools(allPools, residency);
  const allowedPoolIds = new Set(filteredPools.map((p) => p.id));
  const poolPrices = prices || (await currentPricing());

  const eligible: EligibleReservedPool[] = [];
  for (const row of rows) {
    const reservation = mapRow(row);
    if (!allowedPoolIds.has(reservation.poolId)) continue;
    const price = estimatePoolPrice(poolPrices[reservation.poolId], est, RESERVED_DISCOUNT);
    if (price === null) continue;
    const pool = poolMap.get(reservation.poolId);
    if (!pool) continue;
    eligible.push({ reservation, pool, effectivePrice: price });
  }

  if (eligible.length > 0) {
    logger.info('🎯 Eligible reserved pools found', {
      tenantId: normalizedTenant,
      count: eligible.length,
      residency,
    });
  }

  return eligible.sort((a, b) => a.effectivePrice - b.effectivePrice);
}
