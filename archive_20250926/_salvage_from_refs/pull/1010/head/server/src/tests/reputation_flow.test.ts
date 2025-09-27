import { updateReputation, getReputation, topPublishers } from '../reputation/ReputationService';

describe('reputation flow', () => {
  it('computes scores and ranks', () => {
    updateReputation('pubA', { proofsOk: 10, proofsTotal: 10, ageDays: 100 });
    updateReputation('pubB', { proofsOk: 5, proofsTotal: 10, violations30d: 2, ageDays: 10 });
    const top = topPublishers(2);
    expect(top[0].publisher).toBe('pubA');
    const repB = getReputation('pubB');
    expect(repB.score).toBeLessThan(1);
  });
});
