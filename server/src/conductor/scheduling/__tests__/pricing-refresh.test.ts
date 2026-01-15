import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { refreshPricing } from '../pricing-refresh.js';
import { PricingSignalProvider } from '../pricing-signal-provider.js';

describe('refreshPricing', () => {
  test('upserts valid pricing signals and skips unknown pools', async () => {
    const mockPool = {
      query: jest.fn(),
    };
    const provider: PricingSignalProvider = {
      fetch: jest.fn().mockResolvedValue({
        'pool-known': {
          cpu_sec_usd: 0.01,
          gb_sec_usd: 0.02,
          egress_gb_usd: 0.03,
        },
        'pool-unknown': {
          cpu_sec_usd: 0.05,
          gb_sec_usd: 0.06,
          egress_gb_usd: 0.07,
        },
        invalid: {
          cpu_sec_usd: -1,
          gb_sec_usd: 0.06,
          egress_gb_usd: 0.07,
        },
      }),
    };

    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'pool-known' }] })
      .mockResolvedValueOnce({ rows: [] });

    const effectiveAt = new Date('2024-01-01T00:00:00.000Z');
    const result = await refreshPricing({
      pool: mockPool as any,
      provider,
      effectiveAt,
    });

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query.mock.calls[1][0]).toContain(
      'INSERT INTO pool_pricing',
    );
    expect(mockPool.query.mock.calls[1][1]).toEqual([
      'pool-known',
      0.01,
      0.02,
      0.03,
      effectiveAt,
    ]);
    expect(result.updatedPools).toBe(1);
    expect(result.skippedPools).toBe(2);
    expect(result.effectiveAt).toBe(effectiveAt);
  });
});
