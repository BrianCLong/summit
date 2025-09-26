import { computeRiskSignals } from '../riskScoring';

describe('computeRiskSignals', () => {
  it('boosts risk for authority impersonation with synthetic media', () => {
    const result = computeRiskSignals({
      severity: 5,
      reach_estimate: 150000,
      confidence: 0.9,
      is_authority_impersonation: true,
      is_synthetic_media: true,
      detector: 'voice-clone-detector',
      story_id: 'Election-Process-Suppression/Voice-Clone/Call-Back-CTA'
    });

    expect(result.riskScore).toBeGreaterThan(0.8);
    expect(result.anomalyScore).toBeGreaterThan(0.1);
    expect(result.forecastHorizonMinutes).toBeGreaterThanOrEqual(120);
    expect(result.predictedReach).toBeGreaterThan(150000);
    expect(result.provenanceConfidence).toBeLessThan(0.6);
  });

  it('keeps risk moderate for low severity web narratives', () => {
    const result = computeRiskSignals({
      severity: 2,
      reach_estimate: 10000,
      confidence: 0.5,
      is_authority_impersonation: false,
      is_synthetic_media: false,
      detector: 'spoof-domain-monitor',
      story_id: 'Geopolitics-Ukraine/Legitimacy-Narratives'
    });

    expect(result.riskScore).toBeLessThan(0.6);
    expect(result.anomalyScore).toBeLessThan(0.3);
    expect(result.provenanceConfidence).toBeGreaterThan(0.3);
  });
});
