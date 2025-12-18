// server/src/lib/resources/budget-tracker.ts

import { EventEmitter } from 'events';

/**
 * @file Tracks costs and budgets for tenants.
 * @author Jules
 * @version 1.0.0
 *
 * @warning This implementation uses a non-persistent in-memory store.
 * All budget and cost data will be lost on application restart.
 * This is a prototype and is NOT suitable for production use without
 * being refactored to use a persistent data store.
 */

// A simple in-memory key-value store to simulate a persistent data store.
const store: { [key: string]: any } = {};

interface Cost {
  tenantId: string;
  operation: string;
  amount: number;
  timestamp: Date;
}

interface Budget {
  limit: number;
  thresholds: number[]; // e.g., [0.5, 0.8, 1.0]
  currentSpending: number;
}

class BudgetTracker extends EventEmitter {
  private getCosts(tenantId: string): Cost[] {
    return store[`costs_${tenantId}`] || [];
  }

  private addCost(cost: Cost): void {
    const costs = this.getCosts(cost.tenantId);
    costs.push(cost);
    store[`costs_${cost.tenantId}`] = costs;
  }

  public trackCost(cost: Cost): void {
    this.addCost(cost);
    const budget = this.getBudgetStatus(cost.tenantId);
    if (budget) {
      budget.currentSpending += cost.amount;
      this.setBudget(cost.tenantId, budget);
      this.checkThresholds(cost.tenantId, budget);
    }
  }

  public getBudgetStatus(tenantId: string): Budget | undefined {
    return store[`budget_${tenantId}`];
  }

  public setBudget(tenantId: string, budget: Budget): void {
    store[`budget_${tenantId}`] = budget;
  }

  private checkThresholds(tenantId: string, budget: Budget): void {
    const spendingRatio = budget.currentSpending / budget.limit;
    const costs = this.getCosts(tenantId);
    for (const threshold of budget.thresholds) {
      if (spendingRatio >= threshold && (budget.currentSpending - costs[costs.length - 1].amount) / budget.limit < threshold) {
        this.emit('alert', {
          tenantId,
          threshold,
          currentSpending: budget.currentSpending,
          limit: budget.limit,
        });
      }
    }
  }

  public getSpendingForecast(tenantId: string): number {
    const tenantCosts = this.getCosts(tenantId);
    if (tenantCosts.length < 2) {
      return 0;
    }
    const firstCost = tenantCosts[0];
    const lastCost = tenantCosts[tenantCosts.length - 1];
    const timeDiff = lastCost.timestamp.getTime() - firstCost.timestamp.getTime();
    const days = Math.max(1, timeDiff / (1000 * 3600 * 24));
    const totalSpend = tenantCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const avgDailySpend = totalSpend / days;
    return avgDailySpend * 30;
  }

  public detectCostAnomalies(tenantId: string): void {
    // Logic to detect unusual spending patterns.
  }
}

export const budgetTracker = new BudgetTracker();
