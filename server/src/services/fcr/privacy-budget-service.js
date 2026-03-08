"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcrPrivacyBudgetService = void 0;
class FcrPrivacyBudgetService {
    budgets = new Map();
    configureTenantBudget(tenantId, budget) {
        this.budgets.set(tenantId, { ...budget });
    }
    getBudget(tenantId) {
        const budget = this.budgets.get(tenantId);
        if (!budget) {
            return { epsilon: 0, delta: 0 };
        }
        return { ...budget };
    }
    canAfford(tenantId, cost) {
        const budget = this.getBudget(tenantId);
        return budget.epsilon >= cost.epsilon && budget.delta >= cost.delta;
    }
    consume(tenantId, cost) {
        const budget = this.getBudget(tenantId);
        if (!this.canAfford(tenantId, cost)) {
            return { ok: false, remaining: budget };
        }
        const updated = {
            epsilon: budget.epsilon - cost.epsilon,
            delta: budget.delta - cost.delta,
        };
        this.budgets.set(tenantId, updated);
        return { ok: true, remaining: updated };
    }
}
exports.FcrPrivacyBudgetService = FcrPrivacyBudgetService;
