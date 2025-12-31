import { jest } from '@jest/globals';
import { predictiveThreatService } from './PredictiveThreatService.js';

describe('PredictiveThreatService Analytics Provenance', () => {
  beforeEach(() => {
    predictiveThreatService._resetForTesting();
  });

  test('forecastSignal should return provenance metadata', async () => {
    const result = await predictiveThreatService.forecastSignal('threat_events', 24);

    expect(result.provenance).toBeDefined();
    expect(result.provenance.source).toBe('historical_data');
    expect(result.provenance.model).toBe('linear_regression_alpha');
    expect(result.provenance.version).toBe('1.0.0');
    expect(result.provenance.experimental).toBe(false);
    expect(result.provenance.timestamp).toBeDefined();
  });

  test('simulateCounterfactual should return isSimulated=true and experimental provenance', async () => {
    const scenario = { action: 'block_traffic', impactFactor: -0.3 };
    const result = await predictiveThreatService.simulateCounterfactual('threat_events', scenario);

    expect(result.isSimulated).toBe(true);
    expect(result.provenance).toBeDefined();
    expect(result.provenance.source).toBe('simulation_engine');
    expect(result.provenance.experimental).toBe(true);
  });
});
