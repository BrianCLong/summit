export class BudgetService {
  async getBudgets(options: { provider?: string }) {
    return [];
  }

  async createBudget(config: any) {
    return { success: true, budgetId: 'budget-1' };
  }

  async getBudgetAlerts(options: { provider?: string }) {
    return [];
  }

  async checkBudgets() {
    // Check budgets implementation
  }
}
