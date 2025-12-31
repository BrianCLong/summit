
import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BudgetTracker } from '../../server/src/lib/resources/budget-tracker.js';
import { CostDomain } from '../../server/src/lib/resources/types.js';

describe('Cost Controls & Budget Enforcement', () => {
  let tracker: BudgetTracker;
  const tenantId = 'test-tenant-cost-1';

  beforeEach(() => {
    tracker = BudgetTracker.getInstance();
    // Setup clean budget
    tracker.setBudget(tenantId, {
      domain: CostDomain.AGENT_RUNS,
      limit: 100,
      period: 'monthly',
      currency: 'USD',
      alertThresholds: [0.8, 1.0],
      hardStop: true
    });
  });

  it('should allow spending within budget', () => {
    const allowed = tracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 10);
    assert.strictEqual(allowed, true);

    tracker.trackCost(tenantId, CostDomain.AGENT_RUNS, 10);
    const report = tracker.getDomainBudget(tenantId, CostDomain.AGENT_RUNS);
    assert.strictEqual(report?.currentSpending, 10);
  });

  it('should enforce hard stop when budget exceeded', () => {
    // Burn the budget
    tracker.trackCost(tenantId, CostDomain.AGENT_RUNS, 95);

    // Check if next large request is blocked
    const allowed = tracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 10);
    assert.strictEqual(allowed, false, 'Should be blocked by hard stop');
  });

  it('should track attribution', () => {
     tracker.trackCost(tenantId, CostDomain.AGENT_RUNS, 5, {}, {
         agentId: 'agent-007',
         capability: 'search',
         tenantId
     });

     const costs = tracker.getAttributedCosts(tenantId);
     const lastCost = costs[costs.length - 1];
     assert.strictEqual(lastCost.attribution?.agentId, 'agent-007');
  });
});
