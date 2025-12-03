import { predictiveThreatService } from '../services/PredictiveThreatService';

describe('PredictiveThreatService', () => {
  describe('forecastSignal', () => {
    it('should return a forecast with correct structure for a known signal', async () => {
      const result = await predictiveThreatService.forecastSignal('threat_events', 24);

      expect(result).toHaveProperty('signal', 'threat_events');
      expect(result).toHaveProperty('horizon', '24h');
      expect(result.points).toBeInstanceOf(Array);
      expect(result.points.length).toBeGreaterThan(0);

      const forecastPoint = result.points.find(p => p.isForecast);
      expect(forecastPoint).toBeDefined();
      if (forecastPoint) {
        expect(forecastPoint).toHaveProperty('value');
        expect(forecastPoint).toHaveProperty('confidenceLow');
        expect(forecastPoint).toHaveProperty('confidenceHigh');
      }
    });

    it('should throw error for unknown signal', async () => {
      await expect(predictiveThreatService.forecastSignal('unknown_signal'))
        .rejects.toThrow('No historical data');
    });
  });

  describe('simulateCounterfactual', () => {
    it('should return a simulation result with impact calculation', async () => {
      const scenario = { action: 'mitigate', impactFactor: -0.5 };
      const result = await predictiveThreatService.simulateCounterfactual('threat_events', scenario);

      expect(result).toHaveProperty('scenarioId');
      expect(result).toHaveProperty('originalForecast');
      expect(result).toHaveProperty('adjustedForecast');
      expect(result.impact).toHaveProperty('percentageChange');

      // Check if impact was applied correctly (approximate check)
      // Since factor is -0.5, forecast values should be roughly halved
      const originalSum = result.originalForecast
        .filter(p => p.isForecast)
        .reduce((sum, p) => sum + p.value, 0);

      const adjustedSum = result.adjustedForecast
        .filter(p => p.isForecast)
        .reduce((sum, p) => sum + p.value, 0);

      // Allow for small floating point differences
      const expectedSum = originalSum * 0.5;
      expect(adjustedSum).toBeCloseTo(expectedSum, 0);
      expect(result.impact.percentageChange).toBeCloseTo(-50, 0);
    });
  });
});
