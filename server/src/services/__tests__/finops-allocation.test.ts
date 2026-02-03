import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  allocateCostBuckets,
  defaultMeteringRatios,
} from '../../../../finops/allocation.js';

describe('allocateCostBuckets', () => {
  it('calculates bucket costs using metering ratios', () => {
    const result = allocateCostBuckets(
      {
        computeUnits: 1200,
        storageGbHours: 48,
        egressGb: 12,
        thirdPartyRequests: 3000,
      },
      defaultMeteringRatios,
    );

    const compute = result.buckets.find((b) => b.bucket === 'compute');
    const storage = result.buckets.find((b) => b.bucket === 'storage');
    const egress = result.buckets.find((b) => b.bucket === 'egress');
    const thirdParty = result.buckets.find((b) => b.bucket === 'third_party');

    expect(result.totalCostUsd).toBeCloseTo(5.2858, 4);
    expect(compute?.costUsd).toBeCloseTo(3.0, 4);
    expect(storage?.costUsd).toBeCloseTo(0.0058, 4);
    expect(egress?.costUsd).toBeCloseTo(1.08, 4);
    expect(thirdParty?.costUsd).toBeCloseTo(1.2, 4);
  });

  it('keeps allocation percentages bounded even with zero usage', () => {
    const result = allocateCostBuckets(
      { computeUnits: 0, storageGbHours: 0, egressGb: 0, thirdPartyRequests: 0 },
      defaultMeteringRatios,
    );

    const pctSum = result.buckets.reduce((sum, bucket) => sum + bucket.allocationPct, 0);
    expect(result.totalCostUsd).toBe(0);
    expect(pctSum).toBe(0);
  });
});
