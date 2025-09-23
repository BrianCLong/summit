import { proveKAnonRange, proveEpsilonBudget, proveNoRowExport } from '../zkdp/Proofs';
import { verifyZkBundle } from '../zkdp/Verifier';

describe('ZKDP proofs', () => {
  it('verifies valid bundle', () => {
    const proofs = [
      proveKAnonRange(30, 25),
      proveEpsilonBudget(0.3, 1),
      proveNoRowExport('abc'),
    ];
    const res = verifyZkBundle(proofs, { kMin: 25, epsCap: 1 });
    expect(res.ok).toBe(true);
    expect(res.digests).toHaveLength(3);
  });
});
