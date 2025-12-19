// server/orchestration/capacity-futures-mock.ts
// Thin wrapper around the conductor capacity futures implementation for legacy callers.

import {
  releaseReservation,
  reserveCapacity as conductorReserveCapacity,
} from '../src/conductor/scheduling/capacity-futures.js';

export async function reserveCapacity(options: {
  durationHours: number;
  computeUnits: number;
  poolId?: string;
  tenantId?: string;
}): Promise<{ reservationId: string; costEstimate: number }> {
  const startAt = new Date();
  const endAt = new Date(
    startAt.getTime() + Math.max(1, options.durationHours) * 60 * 60 * 1000,
  );
  const result = await conductorReserveCapacity({
    poolId: options.poolId || 'mock-pool',
    computeUnits: options.computeUnits,
    startAt,
    endAt,
    tenantId: options.tenantId,
  });
  return {
    reservationId: result.reservationId,
    costEstimate: result.costEstimate,
  };
}

export async function releaseCapacity(reservationId: string): Promise<boolean> {
  return releaseReservation(reservationId);
}
