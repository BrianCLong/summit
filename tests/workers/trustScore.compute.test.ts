import { computeTrustScore } from '../../server/src/workers/trustScore';

describe('computeTrustScore', () => {
  it('penalizes recent high severity signals', () => {
    const now = new Date().toISOString();
    const signals = [
      { severity: 'LOW', created_at: now },
      { severity: 'HIGH', created_at: now },
      { severity: 'CRITICAL', created_at: now },
    ];
    const score = computeTrustScore(0.9, signals as any);
    expect(score).toBeLessThan(0.9);
    expect(score).toBeGreaterThan(0); // bounded
  });
});

