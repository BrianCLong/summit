import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  pickCheapestEligible,
  type PoolCost,
  type PoolInfo,
} from '../pools.js';

describe('pickCheapestEligible', () => {
  const pools: PoolInfo[] = [
    { id: 'pool-a', region: 'us-east-1', labels: [], capacity: 10 },
    { id: 'pool-b', region: 'us-west-2', labels: [], capacity: 20 },
    { id: 'pool-c', region: 'eu-west-1', labels: [], capacity: 15 },
  ];

  it('selects cheapest among multiple pools given estimates', () => {
    const costs: Record<string, PoolCost> = {
      'pool-a': {
        pool_id: 'pool-a',
        cpu_sec_usd: '0.02' as unknown as number,
        gb_sec_usd: 0.005,
        egress_gb_usd: 0.1,
      },
      'pool-b': {
        pool_id: 'pool-b',
        cpu_sec_usd: 0.015,
        gb_sec_usd: 0.01,
        egress_gb_usd: 0.08,
      },
    };

    const est = { cpuSec: 10, gbSec: 5, egressGb: 2 };
    const result = pickCheapestEligible(pools, costs, est);

    expect(result?.id).toBe('pool-b');
    expect(result?.price).toBeCloseTo(0.36);
  });

  it('respects residency filter', () => {
    const costs: Record<string, PoolCost> = {
      'pool-a': {
        pool_id: 'pool-a',
        cpu_sec_usd: 0.01,
        gb_sec_usd: 0.01,
        egress_gb_usd: 0.01,
      },
      'pool-c': {
        pool_id: 'pool-c',
        cpu_sec_usd: 0.001,
        gb_sec_usd: 0.001,
        egress_gb_usd: 0.001,
      },
    };

    const est = { cpuSec: 10, gbSec: 10, egressGb: 10 };
    const result = pickCheapestEligible(pools, costs, est, 'us-east');

    expect(result?.id).toBe('pool-a');
    expect(result?.price).toBeCloseTo(0.3);
  });

  it('skips pools with missing pricing', () => {
    const costs: Record<string, PoolCost> = {
      'pool-b': {
        pool_id: 'pool-b',
        cpu_sec_usd: 0.02,
        gb_sec_usd: 0.02,
        egress_gb_usd: 0.02,
      },
    };

    const result = pickCheapestEligible(
      [{ id: 'pool-missing', region: 'us-east-1', labels: [], capacity: 5 }, pools[1]],
      costs,
      { cpuSec: 1, gbSec: 1, egressGb: 1 },
    );

    expect(result).toEqual({ id: 'pool-b', price: 0.06 });
  });

  it('uses lexicographic tie-breaker on equal price', () => {
    const costs: Record<string, PoolCost> = {
      'pool-a': {
        pool_id: 'pool-a',
        cpu_sec_usd: 0.01,
        gb_sec_usd: 0.01,
        egress_gb_usd: 0.01,
      },
      'pool-b': {
        pool_id: 'pool-b',
        cpu_sec_usd: 0.01,
        gb_sec_usd: 0.01,
        egress_gb_usd: 0.01,
      },
    };

    const est = { cpuSec: 5, gbSec: 5, egressGb: 5 };
    const result = pickCheapestEligible(pools, costs, est);

    expect(result?.id).toBe('pool-a');
    expect(result?.price).toBeCloseTo(0.15);
  });

  it('treats missing or negative estimates as zero', () => {
    const costs: Record<string, PoolCost> = {
      'pool-a': {
        pool_id: 'pool-a',
        cpu_sec_usd: 1,
        gb_sec_usd: 1,
        egress_gb_usd: 1,
      },
      'pool-b': {
        pool_id: 'pool-b',
        cpu_sec_usd: 1,
        gb_sec_usd: 1,
        egress_gb_usd: 1,
      },
    };

    const est = { cpuSec: -5, gbSec: undefined, egressGb: Number.NaN };
    const result = pickCheapestEligible(pools, costs, est);

    expect(result).toEqual({ id: 'pool-a', price: 0 });
  });
});
