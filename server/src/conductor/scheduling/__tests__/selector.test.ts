import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { choosePool } from '../selector.js';

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

describe('choosePool', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns pickCheapestEligible result', async () => {
    const pools = [{ id: 'p1', region: 'us-east', labels: [], capacity: 1 }];
    const pricing = {
      p1: { pool_id: 'p1', cpu_sec_usd: 1, gb_sec_usd: 1, egress_gb_usd: 1 },
    };
    const expected = { id: 'p1' };
    listPools.mockResolvedValue(pools);
    currentPricing.mockResolvedValue(pricing);
    pickCheapestEligible.mockReturnValue(expected);

    const result = await choosePool({ cpuSec: 5 }, 'us-east', 'tenant-a');

    expect(result).toBe(expected);
    expect(listPools).toHaveBeenCalled();
    expect(currentPricing).toHaveBeenCalled();
    expect(pickCheapestEligible).toHaveBeenCalledWith(
      pools,
      pricing,
      { cpuSec: 5 },
      'us-east',
    );
  });

  test('returns null when no eligible pool', async () => {
    listPools.mockResolvedValue([
      { id: 'p1', region: 'us-east', labels: [], capacity: 1 },
    ]);
    currentPricing.mockResolvedValue({});
    pickCheapestEligible.mockReturnValue(null);

    const result = await choosePool({});

    expect(result).toBeNull();
    expect(listCapacityReservations).not.toHaveBeenCalled();
  });
});
