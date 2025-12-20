import { choosePool } from '../selector';
import { resetFeatureFlags } from '../../config/feature-flags';
import { poolSelectionFallbackTotal } from '../../../metrics/federationMetrics.js';

jest.mock('../pools', () => ({
  listPools: jest.fn(),
  currentPricing: jest.fn(),
  listCapacityReservations: jest.fn(),
  pickCheapestEligible: jest.fn(),
}));

const {
  listPools,
  currentPricing,
  listCapacityReservations,
  pickCheapestEligible,
} = jest.requireMock('../pools') as Record<string, jest.Mock>;

describe('choosePool with feature flags', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    poolSelectionFallbackTotal.reset();
    resetFeatureFlags({
      PRICE_AWARE_ENABLED: 'true',
      PRICING_REFRESH_ENABLED: 'true',
      CAPACITY_FUTURES_ENABLED: 'true',
      PRICE_AWARE_FAIL_OPEN: 'true',
    } as NodeJS.ProcessEnv);
  });

  test('returns forced pool when price-aware is disabled', async () => {
    resetFeatureFlags({
      PRICE_AWARE_ENABLED: 'false',
      PRICE_AWARE_FORCE_POOL_ID: 'forced-pool',
      PRICE_AWARE_FAIL_OPEN: 'true',
    } as NodeJS.ProcessEnv);

    const labelsSpy = jest.spyOn(poolSelectionFallbackTotal, 'labels');
    const result = await choosePool({});

    expect(result.id).toBe('forced-pool');
    expect(listPools).not.toHaveBeenCalled();
    expect(labelsSpy).toHaveBeenCalledWith('forced');
  });

  test('skips capacity futures when disabled and falls back open', async () => {
    resetFeatureFlags({
      CAPACITY_FUTURES_ENABLED: 'false',
      PRICE_AWARE_FAIL_OPEN: 'true',
    } as NodeJS.ProcessEnv);
    listPools.mockResolvedValue([
      { id: 'p1', region: 'us-east', labels: [], capacity: 1 },
    ]);
    currentPricing.mockResolvedValue({});
    pickCheapestEligible.mockReturnValue(null);

    const labelsSpy = jest.spyOn(poolSelectionFallbackTotal, 'labels');

    const result = await choosePool({});

    expect(result.id).toBe('unknown');
    expect(listCapacityReservations).not.toHaveBeenCalled();
    expect(labelsSpy).toHaveBeenCalledWith('no_pricing');
  });

  test('throws when fail-closed and no eligible pool', async () => {
    resetFeatureFlags({
      PRICE_AWARE_FAIL_OPEN: 'false',
    } as NodeJS.ProcessEnv);
    listPools.mockResolvedValue([
      { id: 'p1', region: 'us-east', labels: [], capacity: 1 },
    ]);
    currentPricing.mockResolvedValue({
      p1: { pool_id: 'p1', cpu_sec_usd: 1, gb_sec_usd: 1, egress_gb_usd: 1 },
    });
    pickCheapestEligible.mockReturnValue(null);

    await expect(choosePool({})).rejects.toThrow(
      'No eligible pool available for price-aware selection',
    );
  });
});
