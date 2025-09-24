
import { CostGuardService } from '../../src/services/cost-guard';

describe('CostGuardService token bucket', () => {
  it('enforces reservations and refunds unused cost', async () => {
    let current = 0;
    const guard = new CostGuardService(undefined, {
      bucket: { capacity: 1, refillPerSecond: 0 },
      now: () => current
    });
    guard.setBudgetLimits('tenant', {
      daily: 2,
      monthly: 10,
      tokenCapacity: 1,
      refillPerSecond: 0,
      partialAllowancePct: 0.25
    });

    const pre = await guard.checkCostAllowance({
      tenantId: 'tenant',
      userId: 'user',
      operation: 'graphql_query',
      complexity: 1,
      operationId: 'op-1'
    });
    expect(pre.allowed).toBe(true);
    expect(pre.reservedAmount).toBeCloseTo(pre.estimatedCost);

    await guard.recordActualCost({
      tenantId: 'tenant',
      userId: 'user',
      operation: 'graphql_query',
      reservationId: pre.reservationId,
      operationId: 'op-1'
    }, pre.estimatedCost / 2);

    const analysis = await guard.getCostAnalysis('tenant');
    expect(analysis.bucket.remaining).toBeGreaterThan(0);
    expect(analysis.bucket.remaining).toBeLessThan(1);
  });

  it('supports partial allowances with actionable hints', async () => {
    const guard = new CostGuardService(undefined, {
      bucket: { capacity: 0.0008, refillPerSecond: 0, partialAllowancePct: 0.4 },
      now: () => 0
    });
    guard.setBudgetLimits('partial', {
      daily: 0.001,
      monthly: 0.001,
      tokenCapacity: 0.0008,
      refillPerSecond: 0,
      partialAllowancePct: 0.4
    });

    const check = await guard.checkCostAllowance({
      tenantId: 'partial',
      userId: 'user',
      operation: 'graphql_query',
      complexity: 1,
      operationId: 'op-partial'
    });

    expect(check.partialAllowed).toBe(true);
    expect(check.reservedAmount).toBeCloseTo(0.0008);
    expect(check.hints.length).toBeGreaterThan(0);
  });

  it('can reset tenant state deterministically', async () => {
    const guard = new CostGuardService();
    await guard.checkCostAllowance({
      tenantId: 'reset',
      userId: 'user',
      operation: 'graphql_query',
      complexity: 1
    });
    guard.resetTenant('reset');
    const analysis = await guard.getCostAnalysis('reset');
    expect(analysis.currentUsage.daily).toBe(0);
  });
});
