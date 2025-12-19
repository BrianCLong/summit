import {
  listPools,
  currentPricing,
  pickCheapestEligible,
  listCapacityReservations,
} from './pools.js';
import {
  poolInfo,
  poolCpuUsd,
  poolGbUsd,
  poolEgressUsd,
} from '../../metrics/federationMetrics.js';
import { getFeatureFlags } from '../config/feature-flags.js';
import { poolSelectionFallbackTotal } from '../../metrics/federationMetrics.js';
import logger from '../../config/logger.js';

class PriceAwareSelectionError extends Error {
  reason: string;
  constructor(message: string, reason: string) {
    super(message);
    this.name = 'PriceAwareSelectionError';
    this.reason = reason;
  }
}

export async function choosePool(
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
) {
  const flags = getFeatureFlags();
  if (!flags.PRICE_AWARE_ENABLED) {
    poolSelectionFallbackTotal.labels(
      flags.PRICE_AWARE_FORCE_POOL_ID ? 'forced' : 'disabled',
    ).inc();
    logger.warn('Price-aware routing disabled via feature flag', {
      forcedPool: flags.PRICE_AWARE_FORCE_POOL_ID,
      failOpen: flags.PRICE_AWARE_FAIL_OPEN,
    });
    if (!flags.PRICE_AWARE_FAIL_OPEN && !flags.PRICE_AWARE_FORCE_POOL_ID) {
      throw new PriceAwareSelectionError(
        'Price-aware selection disabled by feature flag',
        'disabled',
      );
    }
    return { id: flags.PRICE_AWARE_FORCE_POOL_ID || 'unknown', price: 0 };
  }

  let pools: Awaited<ReturnType<typeof listPools>> = [];
  let prices: Awaited<ReturnType<typeof currentPricing>> = {};
  let reservations: Record<string, number> = {};

  try {
    pools = await listPools();
    prices = await currentPricing();
    for (const p of pools) poolInfo.labels(p.id, p.region).set(1);
    for (const id of Object.keys(prices)) {
      const c = prices[id];
      poolCpuUsd.labels(id).set(Number(c.cpu_sec_usd));
      poolGbUsd.labels(id).set(Number(c.gb_sec_usd));
      poolEgressUsd.labels(id).set(Number(c.egress_gb_usd));
    }
    if (flags.CAPACITY_FUTURES_ENABLED) {
      reservations = await listCapacityReservations();
    }
  } catch (error) {
    logger.warn('Price-aware selection input load failed', {
      error: (error as Error).message,
    });
  }

  const selection = pickCheapestEligible(
    pools,
    prices,
    est,
    residency,
    reservations,
  );

  if (selection) {
    return selection;
  }

  if (flags.PRICE_AWARE_FORCE_POOL_ID) {
    poolSelectionFallbackTotal.labels('forced').inc();
    logger.warn('Falling back to forced pool after null selection', {
      forcedPool: flags.PRICE_AWARE_FORCE_POOL_ID,
    });
    return { id: flags.PRICE_AWARE_FORCE_POOL_ID, price: 0 };
  }

  if (flags.PRICE_AWARE_FAIL_OPEN) {
    const reason =
      Object.keys(prices).length === 0 ? 'no_pricing' : 'no_eligible';
    poolSelectionFallbackTotal.labels(reason).inc();
    logger.warn('Price-aware selection failed open', {
      reason,
      residency,
      pools: pools.length,
      prices: Object.keys(prices).length,
    });
    return { id: 'unknown', price: 0 };
  }

  poolSelectionFallbackTotal.labels('unknown').inc();
  throw new PriceAwareSelectionError(
    'No eligible pool available for price-aware selection',
    'no_eligible',
  );
}
