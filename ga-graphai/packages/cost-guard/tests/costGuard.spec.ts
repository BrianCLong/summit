import { describe, expect, it } from 'vitest';
import { CostGuard, DEFAULT_PROFILE } from '../src/index.js';

describe('CostGuard', () => {
  it('allows lightweight plans', () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: 'tenant-a',
      plan: {
        estimatedRru: 40,
        estimatedLatencyMs: 300,
        depth: 2,
        operations: 25,
        containsCartesianProduct: false
      },
      activeQueries: 3,
      recentLatencyP95: 400
    });
    expect(decision.action).toBe('allow');
    expect(decision.metrics.projectedLatencyMs).toBeGreaterThan(0);
  });

  it('throttles when latency or saturation is high', () => {
    const guard = new CostGuard({ ...DEFAULT_PROFILE, concurrencyLimit: 2 });
    const decision = guard.planBudget({
      tenantId: 'tenant-b',
      plan: {
        estimatedRru: 80,
        estimatedLatencyMs: 1400,
        depth: 6,
        operations: 120,
        containsCartesianProduct: false
      },
      activeQueries: 2,
      recentLatencyP95: 2000
    });
    expect(decision.action).toBe('throttle');
    expect(guard.metrics.budgetsExceeded).toBe(1);
  });

  it('kills dangerous query plans and tracks slow queries', () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: 'tenant-c',
      plan: {
        estimatedRru: 500,
        estimatedLatencyMs: 8000,
        depth: 3,
        operations: 60,
        containsCartesianProduct: true
      },
      activeQueries: 1,
      recentLatencyP95: 1200
    });
    expect(decision.action).toBe('kill');
    const record = guard.killSlowQuery('query-1', 'tenant-c', 'exceeded budget');
    guard.observeQueryCompletion(record.queryId, 3200);
    expect(guard.metrics.kills).toBe(1);
    expect(guard.metrics.activeSlowQueries).toBe(1);
    guard.release(record.queryId);
    expect(guard.metrics.activeSlowQueries).toBe(0);
  });
});
