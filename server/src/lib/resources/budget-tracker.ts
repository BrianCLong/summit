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

export interface Cost {
  tenantId: string;
  operation: string;
  amount: number;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface Budget {
  limit: number;
  thresholds: number[]; // e.g., [0.5, 0.8, 1.0]
  currentSpending: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface CostReport {
  tenantId: string;
  totalSpend: number;
  breakdown: Record<string, number>;
  periodStart: Date;
  periodEnd: Date;
}

export class BudgetTracker extends EventEmitter {
  private store: { [key: string]: any } = {};

  private getCosts(tenantId: string): Cost[] {
    return this.store[`costs_${tenantId}`] || [];
  }

  private addCost(cost: Cost): void {
    const costs = this.getCosts(cost.tenantId);
    costs.push(cost);
    this.store[`costs_${cost.tenantId}`] = costs;
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
    return this.store[`budget_${tenantId}`];
  }

  public setBudget(tenantId: string, budget: Budget): void {
    this.store[`budget_${tenantId}`] = budget;
  }

  private checkThresholds(tenantId: string, budget: Budget): void {
    const spendingRatio = budget.currentSpending / budget.limit;
    const costs = this.getCosts(tenantId);
    const previousSpending = budget.currentSpending - costs[costs.length - 1].amount;
    const previousRatio = previousSpending / budget.limit;

    for (const threshold of budget.thresholds) {
      // Alert only when crossing the threshold upwards
      if (spendingRatio >= threshold && previousRatio < threshold) {
        this.emit('alert', {
          tenantId,
          threshold,
          currentSpending: budget.currentSpending,
          limit: budget.limit,
          timestamp: new Date()
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

  public getTenantReport(tenantId: string, startDate?: Date, endDate?: Date): CostReport {
    const costs = this.getCosts(tenantId);
    const filteredCosts = costs.filter(c => {
      if (startDate && c.timestamp < startDate) return false;
      if (endDate && c.timestamp > endDate) return false;
      return true;
    });

    const breakdown: Record<string, number> = {};
    let totalSpend = 0;

    for (const cost of filteredCosts) {
      breakdown[cost.operation] = (breakdown[cost.operation] || 0) + cost.amount;
      totalSpend += cost.amount;
    }

    return {
      tenantId,
      totalSpend,
      breakdown,
      periodStart: startDate || (costs.length > 0 ? costs[0].timestamp : new Date()),
      periodEnd: endDate || new Date()
    };
  }

  public detectCostAnomalies(tenantId: string): void {
    // Logic to detect unusual spending patterns.
  }
}

export const budgetTracker = new BudgetTracker();
