import {
  listPools,
  currentPricing,
  pickCheapestEligible,
} from './pools.js';
import {
  poolInfo,
  poolCpuUsd,
  poolGbUsd,
  poolEgressUsd,
} from '../../metrics/federationMetrics.js';
import { getEligibleReservedPools } from './capacity-futures.js';
import logger from '../../config/logger.js';

export async function choosePool(
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
  tenantId?: string,
) {
  const pools = await listPools();
  const prices = await currentPricing();
  for (const p of pools) poolInfo.labels(p.id, p.region).set(1);
  for (const id of Object.keys(prices)) {
    const c = prices[id];
    poolCpuUsd.labels(id).set(Number(c.cpu_sec_usd));
    poolGbUsd.labels(id).set(Number(c.gb_sec_usd));
    poolEgressUsd.labels(id).set(Number(c.egress_gb_usd));
  }
  const eligibleReserved = await getEligibleReservedPools(
    tenantId,
    new Date(),
    est,
    residency,
    pools,
    prices,
  );

  if (eligibleReserved.length > 0) {
    const choice = eligibleReserved[0];
    logger.info('🎯 Selected reserved pool for workload', {
      tenantId,
      reservationId: choice.reservation.reservationId,
      poolId: choice.pool.id,
      effectivePrice: choice.effectivePrice,
      startAt: choice.reservation.startAt.toISOString(),
      endAt: choice.reservation.endAt.toISOString(),
    });
    return { id: choice.pool.id, price: choice.effectivePrice };
  }

  return pickCheapestEligible(pools, prices, est, residency);
}
