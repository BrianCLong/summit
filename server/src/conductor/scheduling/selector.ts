import { listPools, currentPricing, pickCheapestEligible } from './pools.js';
import {
  poolInfo,
  poolCpuUsd,
  poolGbUsd,
  poolEgressUsd,
} from '../../metrics/federationMetrics.js';

export async function choosePool(
  est: { cpuSec?: number; gbSec?: number; egressGb?: number },
  residency?: string,
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
  return pickCheapestEligible(pools, prices, est, residency);
}
