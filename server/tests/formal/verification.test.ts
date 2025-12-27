
import fc from 'fast-check';
import { describe, it, test, expect, beforeEach, jest } from '@jest/globals';
import { BudgetTracker, Budget } from '../../src/lib/resources/budget-tracker';
import { QuotaManager } from '../../src/lib/resources/quota-manager';
import { TenantIsolationGuard, TenantIsolationConfig, RateLimiterLike } from '../../src/tenancy/TenantIsolationGuard';
import { TenantKillSwitch, KillSwitchConfig } from '../../src/tenancy/killSwitch';
import { TenantContext } from '../../src/tenancy/types';

// Determine number of runs based on environment
const isCI = process.env.CI === 'true';
const numRuns = isCI ? 50 : 1000;
const fcOptions = { numRuns };

describe('Formal Verification Suite', () => {

  describe('BudgetTracker', () => {
    test('Safety: Spending must behave monotonically (strictly increasing for positive costs)', async () => {
      await fc.assert(
        fc.property(
          fc.array(fc.record({
            amount: fc.double({ min: 0.01, max: 1000, noNaN: true }),
            operation: fc.string()
          }), { minLength: 1, maxLength: 50 }),
          fc.double({ min: 10000, max: 1000000 }), // budget limit
          (costs, limit) => {
            const tracker = new BudgetTracker();
            const tenantId = 't1';

            // Setup initial budget
            const initialBudget: Budget = {
              limit,
              thresholds: [0.5, 0.8, 1.0],
              currentSpending: 0,
              currency: 'USD',
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 86400000)
            };
            tracker.setBudget(tenantId, initialBudget);

            let previousSpending = 0;

            for (const c of costs) {
              tracker.trackCost({
                tenantId,
                operation: c.operation,
                amount: c.amount,
                timestamp: new Date()
              });

              const status = tracker.getBudgetStatus(tenantId);
              // Invariant: Spending must be >= previous spending
              expect(status?.currentSpending).toBeGreaterThanOrEqual(previousSpending);
              // Invariant: Spending must roughly equal sum of costs (floating point tolerance)
              expect(status?.currentSpending).toBeCloseTo(previousSpending + c.amount, 5);

              previousSpending = status?.currentSpending || 0;
            }
          }
        ), fcOptions
      );
    });

    test('Liveness: Threshold alerts must ALWAYS fire when crossing a threshold upwards', async () => {
        await fc.assert(
            fc.property(
                fc.double({ min: 100, max: 1000 }), // limit
                fc.array(fc.double({ min: 1, max: 10 })), // cost steps
                (limit, steps) => {
                    const tracker = new BudgetTracker();
                    const tenantId = 't2';
                    const thresholds = [0.5, 1.0];
                    const alerts: any[] = [];

                    tracker.on('alert', (a) => alerts.push(a));

                    tracker.setBudget(tenantId, {
                        limit,
                        thresholds,
                        currentSpending: 0,
                        currency: 'USD',
                        periodStart: new Date(),
                        periodEnd: new Date()
                    });

                    let current = 0;
                    const firedThresholds = new Set<number>();

                    for (const amount of steps) {
                        const previousRatio = current / limit;
                        current += amount;
                        const newRatio = current / limit;

                        tracker.trackCost({
                            tenantId,
                            amount,
                            operation: 'op',
                            timestamp: new Date()
                        });

                        // Check if we crossed any threshold
                        for (const t of thresholds) {
                            if (previousRatio < t && newRatio >= t) {
                                // Expect an alert for this threshold
                                const found = alerts.find(a => a.threshold === t && a.currentSpending === current);
                                expect(found).toBeDefined();
                                firedThresholds.add(t);
                            }
                        }
                    }
                }
            ), fcOptions
        );
    });
  });

  describe('QuotaManager', () => {
    const qm = QuotaManager.getInstance();

    beforeEach(() => {
        (qm as any)._resetForTesting();
    });

    test('Completeness: getQuotaForTenant always returns a valid Quota object', () => {
        fc.assert(
            fc.property(
                fc.string(), // arbitrary tenant string
                (tenantId) => {
                    const quota = qm.getQuotaForTenant(tenantId);
                    expect(quota).toBeDefined();
                    expect(quota.requestsPerMinute).toBeGreaterThan(0);
                    expect(quota.storageLimitBytes).toBeGreaterThan(0);
                }
            ), fcOptions
        );
    });

    test('Hierarchy Invariant: Enterprise > Pro > Starter > Free (for all numeric limits)', () => {
        const tiers = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
        const quotas = tiers.map(t => qm.getQuotaForTier(t));

        // Helper to check strict increase
        const checkStrictIncrease = (selector: (q: any) => number) => {
            for (let i = 0; i < quotas.length - 1; i++) {
                expect(selector(quotas[i+1])).toBeGreaterThan(selector(quotas[i]));
            }
        };

        checkStrictIncrease(q => q.requestsPerMinute);
        checkStrictIncrease(q => q.ingestEventsPerMinute);
        checkStrictIncrease(q => q.maxTokensPerRequest);
        checkStrictIncrease(q => q.storageLimitBytes);
        checkStrictIncrease(q => q.seatCap);
    });
  });

  describe('TenantIsolationGuard', () => {
    // Mock RateLimiter
    const mockLimiter: RateLimiterLike = {
        checkLimit: async () => ({ allowed: true, remaining: 10, total: 100, reset: 0 })
    };

    // Mock KillSwitch
    class MockKillSwitch {
        private disabledMap: Map<string, boolean> = new Map();

        setDisabled(tenantId: string, disabled: boolean) {
            this.disabledMap.set(tenantId, disabled);
        }

        isDisabled(tenantId: string): boolean {
            return this.disabledMap.get(tenantId) || false;
        }

        hasConfig(): boolean {
            return true;
        }
    }

    test('Isolation: Cross-tenant access MUST be denied', () => {
        fc.assert(
            fc.property(
                fc.uuid(), // context tenant
                fc.uuid(), // resource tenant
                (contextTenant, resourceTenant) => {
                    // Precondition: tenants are different
                    fc.pre(contextTenant !== resourceTenant);

                    const killSwitch = new MockKillSwitch();
                    const guard = new TenantIsolationGuard(mockLimiter, killSwitch as any);

                    const decision = guard.evaluatePolicy(
                        { tenantId: contextTenant, environment: 'prod', privilegeTier: 'standard' } as any,
                        { resourceTenantId: resourceTenant, action: 'read' }
                    );

                    expect(decision.allowed).toBe(false);
                    expect(decision.reason).toContain('Cross-tenant access denied');
                }
            ), fcOptions
        );
    });

    test('Kill Switch Propagation: If kill switch is active, ALL requests are denied', () => {
        fc.assert(
            fc.property(
                fc.uuid(),
                fc.boolean(), // is kill switch active?
                (tenantId, isKilled) => {
                    const killSwitch = new MockKillSwitch();
                    killSwitch.setDisabled(tenantId, isKilled);

                    const guard = new TenantIsolationGuard(mockLimiter, killSwitch as any);

                    const decision = guard.evaluatePolicy(
                        { tenantId, environment: 'prod', privilegeTier: 'standard' } as any,
                        { resourceTenantId: tenantId, action: 'read' } // valid access otherwise
                    );

                    if (isKilled) {
                        expect(decision.allowed).toBe(false);
                        expect(decision.reason).toContain('kill switch active');
                        expect(decision.status).toBe(423);
                    } else {
                        expect(decision.allowed).toBe(true);
                    }
                }
            ), fcOptions
        );
    });
  });

});
