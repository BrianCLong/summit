
import { describe, it, expect, beforeEach } from '@jest/globals';
import { StrategicSimulationEngine } from '../src/simulation/strategic/StrategicSimulationEngine';
import { StrategicScenarioType, SimulationSnapshot } from '../src/simulation/strategic/types';
import { ResourceType, CostDomain } from '../src/lib/resources/types';

describe('StrategicSimulationEngine', () => {
  let engine: StrategicSimulationEngine;
  let mockSnapshot: SimulationSnapshot;

  beforeEach(() => {
    engine = new StrategicSimulationEngine();
    mockSnapshot = {
      timestamp: new Date(),
      quotas: {
        'tenant-1': {
          tenantId: 'tenant-1',
          limits: {
            tokens: { limit: 100, period: 'minute' },
            cpu: { limit: 50, period: 'minute' },
            memory: { limit: 1024, period: 'minute' },
            requests: { limit: 1000, period: 'minute' },
            storage: { limit: 1000, period: 'minute' }
          }
        }
      },
      budgets: {
        [CostDomain.AGENT_RUNS]: {
          domain: CostDomain.AGENT_RUNS,
          limit: 1000,
          currentSpending: 500,
          forecastedSpending: 600,
          currency: 'USD',
          period: 'monthly',
          alertThresholds: [],
          periodStart: new Date(),
          periodEnd: new Date()
        }
      },
      recentUsage: [
        { tenantId: 'tenant-1', resource: 'tokens' as ResourceType, amount: 50, timestamp: new Date() },
        { tenantId: 'tenant-1', resource: 'tokens' as ResourceType, amount: 80, timestamp: new Date() }
      ]
    };
  });

  describe('CAPACITY_LOAD', () => {
    it('should detect throttling when traffic multiplier causes usage to exceed limit', async () => {
      // 80 * 1.5 = 120 > 100 limit
      const result = await engine.runSimulation(
        StrategicScenarioType.CAPACITY_LOAD,
        { trafficMultiplier: 1.5, resourceType: 'tokens' as ResourceType },
        mockSnapshot
      );

      expect(result.success).toBe(false);
      expect(result.metrics.totalThrottledEvents).toBe(1);
      expect(result.explanation.summary).toContain('1 throttling events');
      expect(result.metrics.peakUtilization).toBe(1.2); // 120/100
    });

    it('should pass when usage remains within limits', async () => {
        // 80 * 1.1 = 88 < 100 limit
      const result = await engine.runSimulation(
        StrategicScenarioType.CAPACITY_LOAD,
        { trafficMultiplier: 1.1, resourceType: 'tokens' as ResourceType },
        mockSnapshot
      );

      expect(result.success).toBe(true);
      expect(result.metrics.totalThrottledEvents).toBe(0);
    });

    it('should handle missing data gracefully', async () => {
        const emptySnapshot = { ...mockSnapshot, recentUsage: [] };
        const result = await engine.runSimulation(
            StrategicScenarioType.CAPACITY_LOAD,
            { trafficMultiplier: 1.5, resourceType: 'tokens' as ResourceType },
            emptySnapshot
        );

        expect(result.confidenceScore).toBeLessThan(0.5);
        expect(result.explanation.summary).toContain('No historical usage found');
    });
  });

  describe('COST_BUDGET', () => {
      it('should detect budget overrun when limit is reduced', async () => {
          // Current limit 1000. Reduce by 50% -> 500. Forecast 600. 600 > 500 -> Fail.
          const result = await engine.runSimulation(
              StrategicScenarioType.COST_BUDGET,
              { budgetReductionPercentage: 0.5, targetDomain: CostDomain.AGENT_RUNS },
              mockSnapshot
          );

          expect(result.success).toBe(false);
          expect(result.metrics.newLimit).toBe(500);
          expect(result.metrics.overrun).toBe(100);
      });

      it('should pass when reduced budget still covers spending', async () => {
          // Current limit 1000. Reduce by 10% -> 900. Forecast 600. 600 < 900 -> Pass.
          const result = await engine.runSimulation(
              StrategicScenarioType.COST_BUDGET,
              { budgetReductionPercentage: 0.1, targetDomain: CostDomain.AGENT_RUNS },
              mockSnapshot
          );

          expect(result.success).toBe(true);
      });
  });
});
