
import { timeSeriesIntelligence } from '../services/TimeSeriesIntelligenceService.js';
import { provenanceLedger } from '../provenance/ledger.js';

// Mock provenanceLedger
jest.mock('../provenance/ledger.js', () => ({
  provenanceLedger: {
    getEntries: jest.fn(),
  },
}));

describe('TimeSeriesIntelligenceService', () => {
  const mockGetEntries = provenanceLedger.getEntries as jest.Mock;
  const entityId = 'test-entity-1';
  const tenantId = 'test-tenant';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forecastActivity', () => {
    it('should return a forecast based on historical activity', async () => {
      // Mock 10 days of history with increasing activity
      const history = [];
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (9 - i));
        // Simple linear trend: 1, 2, 3...
        for (let j = 0; j < i + 1; j++) {
           history.push({
             resourceId: entityId,
             timestamp: date,
             payload: {}
           });
        }
      }

      mockGetEntries.mockResolvedValue(history.reverse()); // Descending order usually

      const result = await timeSeriesIntelligence.forecastActivity(entityId, tenantId, 3);

      expect(result.entityId).toBe(entityId);
      expect(result.metric).toBe('activity_volume');
      expect(result.forecast.length).toBe(3);

      // Check trend is positive (roughly > 10)
      expect(result.forecast[0].value).toBeGreaterThan(9);
    });

    it('should handle empty history gracefully', async () => {
      mockGetEntries.mockResolvedValue([]);

      const result = await timeSeriesIntelligence.forecastActivity(entityId, tenantId, 3);

      expect(result.forecast.length).toBe(3);
      expect(result.forecast[0].value).toBe(0);
    });
  });

  describe('forecastMetric', () => {
    it('should forecast a specific metric from payload', async () => {
      const history = [];
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (9 - i));
        history.push({
          resourceId: entityId,
          timestamp: date,
          payload: { score: 10 + i * 2 } // 10, 12, 14...
        });
      }

      mockGetEntries.mockResolvedValue(history);

      const result = await timeSeriesIntelligence.forecastMetric(entityId, tenantId, 'payload.score', 3);

      expect(result.metric).toBe('payload.score');
      // Next value should be roughly 30
      // 10 + 9*2 = 28 is last value. Next should be ~30.
      const firstForecast = result.forecast[0].value;
      // The forecast might lag slightly depending on alpha/beta smoothing params, so we adjust expectation.
      expect(firstForecast).toBeGreaterThan(27);
      expect(firstForecast).toBeLessThan(35);
    });
  });
});
