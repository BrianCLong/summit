import { FcrPrivacyBudgetCost } from './types.js';

export interface FcrPrivacyBudget {
  epsilon: number;
  delta: number;
}

export class FcrPrivacyBudgetService {
  private budgets = new Map<string, FcrPrivacyBudget>();

  configureTenantBudget(tenantId: string, budget: FcrPrivacyBudget) {
    this.budgets.set(tenantId, { ...budget });
  }

  getBudget(tenantId: string): FcrPrivacyBudget {
    const budget = this.budgets.get(tenantId);
    if (!budget) {
      return { epsilon: 0, delta: 0 };
    }
    return { ...budget };
  }

  consume(tenantId: string, cost: FcrPrivacyBudgetCost) {
    const budget = this.getBudget(tenantId);
    if (budget.epsilon < cost.epsilon || budget.delta < cost.delta) {
      return { ok: false as const, remaining: budget };
    }
    const updated = {
      epsilon: budget.epsilon - cost.epsilon,
      delta: budget.delta - cost.delta,
    };
    this.budgets.set(tenantId, updated);
    return { ok: true as const, remaining: updated };
  }
}
