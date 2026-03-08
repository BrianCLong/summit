"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
class BudgetService {
    async getBudgets(options) {
        return [];
    }
    async createBudget(config) {
        return { success: true, budgetId: 'budget-1' };
    }
    async getBudgetAlerts(options) {
        return [];
    }
    async checkBudgets() {
        // Check budgets implementation
    }
}
exports.BudgetService = BudgetService;
