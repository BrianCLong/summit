import { computeProvenanceHealth } from '../provenanceLedger';
import type { RiskComputationResult } from '../riskScoring';

describe('computeProvenanceHealth', () => {
  const lowRisk: RiskComputationResult = {
    riskScore: 0.3,
    anomalyScore: 0.2,
    forecastHorizonMinutes: 90,
    predictedReach: 10000,
    provenanceConfidence: 0.5
  };

  it('flags gaps when pending outweighs verified', () => {
    const health = computeProvenanceHealth(
      [
        { id: 'a', verified: true, score: 0.6, verified_at: new Date().toISOString() },
        { id: 'b', verified: false, score: 0.2 },
        { id: 'c', verified: false, score: 0.1 }
      ],
      lowRisk
    );

    expect(health.gapFlag).toBe(true);
    expect(health.pendingCount).toBe(2);
  });

  it('returns healthy metrics when verification is strong', () => {
    const health = computeProvenanceHealth(
      [
        { id: 'a', verified: true, score: 0.8, verified_at: new Date().toISOString() },
        { id: 'b', verified: true, score: 0.7 }
      ],
      lowRisk
    );

    expect(health.gapFlag).toBe(false);
    expect(health.verifiedCount).toBe(2);
    expect(health.averageScore).toBeGreaterThan(0.6);
  });
});
