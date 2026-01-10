
import { RoutingPolicy, LLMProvider, LLMRequest, LLMRouterConfig } from '../interfaces.js';

// Simple in-memory budget tracker for demonstration
// In production, this would be backed by Redis or a database
const usageTracker: {
    globalDailyUsd: number;
    tenants: Record<string, number>;
} = {
    globalDailyUsd: 0,
    tenants: {}
};

export class CostControlPolicy implements RoutingPolicy {
  name = 'cost-control';

  // Method to manually increment usage for simulation/testing
  static trackUsage(costUsd: number, tenantId?: string) {
      usageTracker.globalDailyUsd += costUsd;
      if (tenantId) {
          usageTracker.tenants[tenantId] = (usageTracker.tenants[tenantId] || 0) + costUsd;
      }
  }

  static resetUsage() {
      usageTracker.globalDailyUsd = 0;
      usageTracker.tenants = {};
  }

  selectProvider(
    candidates: LLMProvider[],
    request: LLMRequest,
    config: LLMRouterConfig
  ): LLMProvider | null {

    // 1. Check Budgets
    const budgets = config.budgets || {};

    if (budgets.globalDailyUsd !== undefined) {
        if (usageTracker.globalDailyUsd >= budgets.globalDailyUsd) {
            console.warn(`[CostControl] Global daily budget exceeded: ${usageTracker.globalDailyUsd} >= ${budgets.globalDailyUsd}`);
            // If budget is hard exceeded, we might want to return null or only allow free providers.
            // For now, let's filter out paid providers or return null if strict.
            // We'll return null to signal "Budget Exceeded" which Router can handle.
            // However, maybe there is a free provider?
            // Let's filter candidates.
        }
    }

    if (request.tenantId && budgets.perTenantDailyUsd?.[request.tenantId] !== undefined) {
        const tenantUsage = usageTracker.tenants[request.tenantId] || 0;
        const limit = budgets.perTenantDailyUsd[request.tenantId];
        if (tenantUsage >= limit) {
             console.warn(`[CostControl] Tenant ${request.tenantId} budget exceeded: ${tenantUsage} >= ${limit}`);
        }
    }

    // Filter out providers that would exceed budget if we are strict?
    // For this implementation, let's assume we proceed but prioritize cheapest.
    // Ideally, we should have a "BudgetExceededError" or similar.
    // Let's implement a strict check: if global budget is hit, only allow free providers (costUsd ~ 0).

    let eligibleCandidates = candidates;

    if (budgets.globalDailyUsd !== undefined && usageTracker.globalDailyUsd >= budgets.globalDailyUsd) {
        eligibleCandidates = candidates.filter(p => p.estimate(request.taskType, 1).costUsd === 0);
    }

    if (request.tenantId && budgets.perTenantDailyUsd?.[request.tenantId] !== undefined) {
        const tenantUsage = usageTracker.tenants[request.tenantId] || 0;
         if (tenantUsage >= budgets.perTenantDailyUsd[request.tenantId]) {
             eligibleCandidates = eligibleCandidates.filter(p => p.estimate(request.taskType, 1).costUsd === 0);
         }
    }

    if (eligibleCandidates.length === 0) {
        return null; // No providers allowed under current budget constraints
    }

    // 2. Select Cheapest
    // Sort by estimated cost
    const sorted = [...eligibleCandidates].sort((a, b) => {
        const estA = a.estimate(request.taskType, 100); // 100 tokens as base
        const estB = b.estimate(request.taskType, 100);
        return estA.costUsd - estB.costUsd;
    });

    // Also update tracker with estimate?
    // No, tracker should be updated AFTER execution (in Router or Observability).
    // The policy just reads the state.
    // However, since we don't have a persistent store hooked up in Router yet,
    // we need to expose a way for the Router to update this tracker or for the Policy to know.
    // For now, we'll assume an external mechanism updates `usageTracker`.
    // We added `trackUsage` static method for that.

    return sorted[0] || null;
  }
}
