import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnalyticsType } from '../../types/analytics.js';
import { PredictiveAnalyticsNotEnabledError } from '../../lib/errors.js';

// Mock dependencies BEFORE importing the service
const mockForecastActivity = jest.fn() as jest.Mock<any>;
jest.mock('../TimeSeriesIntelligenceService.js', () => ({
  timeSeriesIntelligence: {
    forecastActivity: mockForecastActivity,
    ALGORITHM_NAME: 'Holt-Winters Double Exponential Smoothing'
  }
}));

const mockIsEnabled = jest.fn() as jest.Mock<any>;
jest.mock('../../feature-flags/setup.js', () => ({
  getFeatureFlagService: jest.fn(() => ({
    isEnabled: mockIsEnabled
  }))
}));

// Import the service under test
import { boundedPredictiveService } from '../BoundedPredictiveService.js';

jest.mock('../../config.ts', () => ({
  cfg: {
    NODE_ENV: 'test',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'password',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    JWT_SECRET: 'super-secret-key-32-chars-long-12345',
    JWT_REFRESH_SECRET: 'super-secret-key-32-chars-long-12345'
  }
}));

describe('BoundedPredictiveService', () => {
  const tenantId = 'tenant-123';
  const entityId = 'entity-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if feature flag is disabled', async () => {
    mockIsEnabled.mockResolvedValue(false);

    await expect(boundedPredictiveService.forecastLedgerActivity(tenantId, entityId))
      .rejects
      .toThrow(PredictiveAnalyticsNotEnabledError);
  });

  it('should return INSUFFICIENT_DATA status if history is short', async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockForecastActivity.mockResolvedValue({
      historical: [1, 2, 3], // < 5 points
      forecast: [],
      model: { confidence: 0.9 }
    });

    const result = await boundedPredictiveService.forecastLedgerActivity(tenantId, entityId);

    expect(result.type).toBe(AnalyticsType.PREDICTIVE);
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.confidence).toBe(0);
    expect(result.explanation.inputSummary).toContain('Insufficient historical data');
  });

  it('should return SUCCESS and clamp confidence if sufficient data', async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockForecastActivity.mockResolvedValue({
      historical: [1, 2, 3, 4, 5, 6], // > 5 points
      forecast: [{ timestamp: new Date(), value: 10 }],
      model: { confidence: 0.95 } // > 0.85
    });

    const result = await boundedPredictiveService.forecastLedgerActivity(tenantId, entityId);

    expect(result.type).toBe(AnalyticsType.PREDICTIVE);
    expect(result.status).toBe('SUCCESS');
    expect(result.confidence).toBe(0.85); // Clamped
    expect(result.explanation.method).toBe('Holt-Winters Double Exponential Smoothing');
    expect(result.explanation.confidenceBasis).toContain('clamped to max 0.85');
  });

  it('should handle errors gracefully', async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockForecastActivity.mockRejectedValue(new Error('Engine failure'));

    const result = await boundedPredictiveService.forecastLedgerActivity(tenantId, entityId);

    expect(result.status).toBe('UNKNOWN');
    expect(result.explanation.method).toBe('Error');
  });
});
