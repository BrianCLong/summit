
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { budgetTracker } from '../budget-tracker.js';
import { CostDomain } from '../types.js';

describe('Cost Governance & FinOps', () => {
  const tenantId = 'test-tenant-finops';

  beforeEach(() => {
    // Reset state? budgetTracker is a singleton, so we need to be careful.
    // In a real test suite we'd mock or have a reset method.
    // For this sprint, we'll just use a unique tenantId per test block or setup.
  });

  it('should enforce hard stops when budget is exceeded', () => {
    // 1. Set a small budget
    budgetTracker.setBudget(tenantId, {
      domain: CostDomain.AGENT_RUNS,
      limit: 10.0, // $10
      period: 'daily',
      currency: 'USD',
      alertThresholds: [0.5, 1.0],
      hardStop: true,
    });

    // 2. Spend within budget
    const allowed = budgetTracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 5.0);
    expect(allowed).toBe(true);
    budgetTracker.trackCost(tenantId, CostDomain.AGENT_RUNS, 5.0);

    // 3. Try to overspend
    const allowed2 = budgetTracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 6.0); // 5+6 = 11 > 10
    expect(allowed2).toBe(false);

    // 4. Verify no cost was tracked for the blocked attempt (manual check needed in real app, here trackCost is separate)
  });

  it('should calculate spending forecast', () => {
     const tenantIdForecast = 'test-tenant-forecast';
     jest.useFakeTimers();
     const start = new Date('2024-01-01T00:00:00Z');
     jest.setSystemTime(start);

     // Set budget
     budgetTracker.setBudget(tenantIdForecast, {
        domain: CostDomain.AGENT_RUNS,
        limit: 100.0,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: [],
        hardStop: false,
      });

      // Simulate spending: $10 spent in the first hour of a 30-day period
      // This is a huge burn rate, should forecast massive overspend.
      jest.setSystemTime(new Date(start.getTime() + 60 * 60 * 1000));
      budgetTracker.trackCost(tenantIdForecast, CostDomain.AGENT_RUNS, 10.0);

      const budget = budgetTracker.getDomainBudget(tenantIdForecast, CostDomain.AGENT_RUNS);
      expect(budget).toBeDefined();
      // Forecast should be roughly: (10 / elapsed) * total_period
      // Since execution is fast, elapsed is tiny, so forecast is huge.
      expect(budget!.forecastedSpending).toBeGreaterThan(100.0);
      jest.useRealTimers();
  });

  it('should emit alerts on thresholds', (done) => {
    const tenantIdAlert = 'test-tenant-alert';

    budgetTracker.setBudget(tenantIdAlert, {
      domain: CostDomain.AGENT_RUNS,
      limit: 100.0,
      period: 'daily',
      currency: 'USD',
      alertThresholds: [0.5],
      hardStop: false,
    });

    budgetTracker.once('threshold_reached', (payload: { tenantId: string; threshold: number }) => {
      try {
        expect(payload.tenantId).toBe(tenantIdAlert);
        expect(payload.threshold).toBe(0.5);
        done();
      } catch (error: any) {
        done(error);
      }
    });

    // Spend 51%
    budgetTracker.trackCost(tenantIdAlert, CostDomain.AGENT_RUNS, 51.0);
  });
});
