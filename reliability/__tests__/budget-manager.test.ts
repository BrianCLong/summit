import { budgetManager } from '../query-cost-guard/budget-manager';

describe('BudgetManager', () => {
  beforeEach(() => {
    budgetManager._clearForTesting();
  });

  it('should create a default budget for a new tenant', () => {
    const budget = budgetManager.getBudget('tenant-1');
    expect(budget.tenantId).toBe('tenant-1');
    expect(budget.limit).toBe(100000);
    expect(budget.usage).toBe(0);
  });

  it('should allow setting a custom budget limit', () => {
    budgetManager.setBudget('tenant-1', 50000);
    const budget = budgetManager.getBudget('tenant-1');
    expect(budget.limit).toBe(50000);
  });

  it('should record costs against a tenant budget', () => {
    budgetManager.recordCost('tenant-1', 100);
    budgetManager.recordCost('tenant-1', 200);
    const budget = budgetManager.getBudget('tenant-1');
    expect(budget.usage).toBe(300);
  });

  it('should correctly report when a budget will be exceeded', () => {
    budgetManager.setBudget('tenant-1', 500);
    budgetManager.recordCost('tenant-1', 400);

    expect(budgetManager.willExceedBudget('tenant-1', 50)).toBe(false);
    expect(budgetManager.willExceedBudget('tenant-1', 100)).toBe(false);
    expect(budgetManager.willExceedBudget('tenant-1', 101)).toBe(true);
  });

  it('should reset all budgets to zero usage', () => {
    budgetManager.setBudget('tenant-1', 1000);
    budgetManager.recordCost('tenant-1', 500);

    budgetManager.setBudget('tenant-2', 2000);
    budgetManager.recordCost('tenant-2', 1000);

    budgetManager.resetAllBudgets();

    const budget1 = budgetManager.getBudget('tenant-1');
    const budget2 = budgetManager.getBudget('tenant-2');

    expect(budget1.usage).toBe(0);
    expect(budget1.limit).toBe(1000);

    expect(budget2.usage).toBe(0);
    expect(budget2.limit).toBe(2000);
  });
});
