import { estimateCost } from '../monitoring/cost';

describe('cost metrics', () => {
  it('calculates deterministic cost', () => {
    const cost = estimateCost({ cpuSec: 1000, memGbSec: 500, storageBytes: 1000000 });
    expect(cost).toBeCloseTo(1000 * 0.000011 + 500 * 0.000002 + 1000000 * 0.0000000001);
  });
});
