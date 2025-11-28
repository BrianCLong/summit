import baseLogger from '../../server/src/config/logger';

const logger = baseLogger.child({ name: 'BudgetManager' });

/**
 * @ JSDoc
 * NOTE: This is a prototype implementation using an in-memory store.
 * For production use, this should be backed by a persistent, distributed
 * data store like Redis or a dedicated database table to ensure that
 * budget state is consistent across multiple server instances and persists
 * across restarts. The current implementation is not suitable for a
 * multi-node environment.
 */

export interface TenantBudget {
  /**
   * The unique identifier for the tenant.
   */
  tenantId: string;
  /**
   * The total budget allocated for a specific period (e.g., daily, monthly).
   */
  limit: number;
  /**
   * The current accumulated usage against the budget.
   */
  usage: number;
}

/**
 * Manages query cost budgets for multiple tenants.
 */
class BudgetManager {
  private budgets: Map<string, TenantBudget> = new Map();
  private static readonly DEFAULT_BUDGET_LIMIT = 100000; // Default cost units

  constructor() {
    logger.warn('Initializing BudgetManager with in-memory store. This is not production-ready.');
  }

  /**
   * Sets or updates the budget for a specific tenant.
   * @param tenantId The tenant's identifier.
   * @param limit The new budget limit.
   */
  public setBudget(tenantId: string, limit: number): void {
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
  public getBudget(tenantId: string): TenantBudget {
    if (!this.budgets.has(tenantId)) {
      this.budgets.set(tenantId, {
        tenantId,
        limit: BudgetManager.DEFAULT_BUDGET_LIMIT,
        usage: 0,
      });
    }
    return this.budgets.get(tenantId)!;
  }

  /**
   * Records a query cost against a tenant's budget.
   * @param tenantId The tenant's identifier.
   * @param cost The cost of the query to add to the usage.
   * @returns The updated budget information.
   */
  public recordCost(tenantId: string, cost: number): TenantBudget {
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
  public willExceedBudget(tenantId: string, prospectiveCost: number): boolean {
    const budget = this.getBudget(tenantId);
    return budget.usage + prospectiveCost > budget.limit;
  }

  /**
   * Resets the usage for all tenants back to zero.
   * Useful for periodic budget rollovers (e.g., daily).
   */
  public resetAllBudgets(): void {
    for (const budget of this.budgets.values()) {
      budget.usage = 0;
    }
    logger.info('All tenant budgets have been reset.');
  }

  /**
   * Clears all budget data. Mainly for testing purposes.
   */
  public _clearForTesting(): void {
    this.budgets.clear();
  }
}

// Export a singleton instance of the BudgetManager.
export const budgetManager = new BudgetManager();
