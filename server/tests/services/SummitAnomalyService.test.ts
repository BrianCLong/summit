import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SummitAnomalyService } from '../../src/services/SummitAnomalyService';
import { AnomalyType, Severity } from '../../src/anomaly/types';

// Mock dependencies
jest.mock('../../src/lib/telemetry/alerting-service', () => ({
  alertingService: {
    sendAlert: jest.fn(),
  },
}));

jest.mock('../../src/anomaly/forest', () => ({
  isolationForest: {
    fit_transform: jest.fn().mockReturnValue({
      nodes: [
        { id: 'node1', score: 0.95, isAnomaly: true, metrics: {}, reason: 'test' }
      ]
    })
  },
  features: jest.fn()
}));

describe('SummitAnomalyService', () => {
  let service: SummitAnomalyService;

  beforeEach(() => {
    service = SummitAnomalyService.getInstance();
    service._resetForTesting();
  });

  it('should be a singleton', () => {
    const s1 = SummitAnomalyService.getInstance();
    const s2 = SummitAnomalyService.getInstance();
    expect(s1).toBe(s2);
  });

  describe('Temporal Detection', () => {
    it('should detect a temporal anomaly', async () => {
      const history = [10, 10, 10, 10, 10];
      const result = await service.analyze({
        type: AnomalyType.TEMPORAL,
        entityId: 'metric_cpu',
        timestamp: Date.now(),
        data: {
          value: 100,
          metric: 'cpu_usage',
          history
        }
      });

      expect(result).toBeDefined();
      expect(result?.isAnomaly).toBe(true);
      expect(result?.severity).toBe(Severity.CRITICAL); // Huge jump from 10 to 100
      expect(result?.explanation?.description).toContain('Value deviated from constant baseline');
    });

    it('should not detect anomaly for normal values', async () => {
      const history = [10, 12, 11, 10, 12]; // Mean ~11, Std ~1
      const result = await service.analyze({
        type: AnomalyType.TEMPORAL,
        entityId: 'metric_cpu',
        timestamp: Date.now(),
        data: {
          value: 11,
          metric: 'cpu_usage',
          history
        }
      });

      expect(result?.isAnomaly).toBe(false);
    });
  });

  describe('Spatial Detection', () => {
    it('should detect spatial anomaly', async () => {
      const result = await service.analyze({
        type: AnomalyType.SPATIAL,
        entityId: 'user_123',
        timestamp: Date.now(),
        data: {
          latitude: 50.0,
          longitude: 50.0,
          history: [{ latitude: 0, longitude: 0 }], // Far away
          radiusKm: 100
        }
      });

      expect(result?.isAnomaly).toBe(true);
      expect(result?.type).toBe(AnomalyType.SPATIAL);
    });
  });

  describe('Behavioral Detection', () => {
    it('should detect flapping', async () => {
      const result = await service.analyze({
        type: AnomalyType.BEHAVIORAL,
        entityId: 'process_1',
        timestamp: Date.now(),
        data: {
          sequence: ['RUNNING', 'STOPPED', 'RUNNING', 'STOPPED']
        }
      });

      expect(result?.isAnomaly).toBe(true);
      expect(result?.explanation?.description).toContain('flapping');
    });
  });

  describe('False Positive Reduction', () => {
    it('should suppress alerts if whitelisted', async () => {
        const ctx = {
            type: AnomalyType.TEMPORAL,
            entityId: 'metric_cpu',
            timestamp: Date.now(),
            data: {
              value: 100,
              metric: 'cpu_usage',
              history: [10, 10, 10, 10, 10]
            }
        };

        // First run - anomaly
        let result = await service.analyze(ctx);
        expect(result?.isAnomaly).toBe(true);

        // Feedback
        service.reportFeedback({
            anomalyId: `${AnomalyType.TEMPORAL}:metric_cpu`,
            isFalsePositive: true,
            timestamp: Date.now()
        });

        // Second run - suppressed
        result = await service.analyze(ctx);
        expect(result?.isAnomaly).toBe(false);
        expect(result?.explanation?.description).toContain('Suppressed');
    });
  });
});
