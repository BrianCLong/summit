"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetManager = void 0;
const logger_1 = __importDefault(require("../../server/src/config/logger"));
const logger = logger_1.default.child({ name: 'BudgetManager' });
/**
 * Manages query cost budgets for multiple tenants.
 */
class BudgetManager {
    budgets = new Map();
    static DEFAULT_BUDGET_LIMIT = 100000; // Default cost units
    constructor() {
        logger.warn('Initializing BudgetManager with in-memory store. This is not production-ready.');
    }
    /**
     * Sets or updates the budget for a specific tenant.
     * @param tenantId The tenant's identifier.
     * @param limit The new budget limit.
     */
    setBudget(tenantId, limit) {
        const currentBudget = this.budgets.get(tenantId) || { tenantId, limit, usage: 0 };
        currentBudget.limit = limit;
        this.budgets.set(tenantId, currentBudget);
        logger.info({ tenantId, limit }, 'Tenant budget updated.');
    }
    /**
     * Retrieves the current budget and usage for a tenant.
     * If the tenant does not have a budget, a default one is created.
     * @param tenantId The tenant's identifier.
     * @returns The tenant's budget information.
     */
    getBudget(tenantId) {
        if (!this.budgets.has(tenantId)) {
            this.budgets.set(tenantId, {
                tenantId,
                limit: BudgetManager.DEFAULT_BUDGET_LIMIT,
                usage: 0,
            });
        }
        return this.budgets.get(tenantId);
    }
    /**
     * Records a query cost against a tenant's budget.
     * @param tenantId The tenant's identifier.
     * @param cost The cost of the query to add to the usage.
     * @returns The updated budget information.
     */
    recordCost(tenantId, cost) {
        const budget = this.getBudget(tenantId);
        budget.usage += cost;
        this.budgets.set(tenantId, budget);
        return budget;
    }
    /**
     * Checks if a potential cost will exceed the tenant's budget.
     * @param tenantId The tenant's identifier.
     * @param prospectiveCost The estimated cost of the query to be executed.
     * @returns True if the cost would exceed the budget, false otherwise.
     */
    willExceedBudget(tenantId, prospectiveCost) {
        const budget = this.getBudget(tenantId);
        return budget.usage + prospectiveCost > budget.limit;
    }
    /**
     * Resets the usage for all tenants back to zero.
     * Useful for periodic budget rollovers (e.g., daily).
     */
    resetAllBudgets() {
        for (const budget of this.budgets.values()) {
            budget.usage = 0;
        }
        logger.info('All tenant budgets have been reset.');
    }
    /**
     * Clears all budget data. Mainly for testing purposes.
     */
    _clearForTesting() {
        this.budgets.clear();
    }
}
// Export a singleton instance of the BudgetManager.
exports.budgetManager = new BudgetManager();
