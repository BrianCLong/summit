import type { IterationMetrics, LongRunBudgets } from './types.js';

export class BudgetTracker {
  private readonly budgets: LongRunBudgets;
  private readonly startTime: number;
  private totalCost: number;
  private totalTokens: number;

  constructor(budgets: LongRunBudgets, now: number = Date.now()) {
    this.budgets = budgets;
    this.startTime = now;
    this.totalCost = 0;
    this.totalTokens = 0;
  }

  record(metrics?: IterationMetrics): void {
    if (!metrics) {
      return;
    }
    this.totalCost += metrics.costUsd;
    this.totalTokens += metrics.tokensUsed;
  }

  get spentCost(): number {
    return this.totalCost;
  }

  get spentTokens(): number {
    return this.totalTokens;
  }

  get elapsedHours(): number {
    const elapsedMs = Date.now() - this.startTime;
    return elapsedMs / 1000 / 60 / 60;
  }

  isBudgetExceeded(): { exceeded: boolean; reason?: string } {
    if (this.totalCost > this.budgets.totalUsd) {
      return {
        exceeded: true,
        reason: `Total cost cap exceeded (${this.totalCost.toFixed(2)} > ${this.budgets.totalUsd.toFixed(2)})`,
      };
    }
    if (this.totalTokens > this.budgets.tokens) {
      return {
        exceeded: true,
        reason: `Token cap exceeded (${this.totalTokens} > ${this.budgets.tokens})`,
      };
    }
    const hourlySpend = this.elapsedHours > 0 ? this.totalCost / this.elapsedHours : 0;
    if (hourlySpend > this.budgets.perHourUsd) {
      return {
        exceeded: true,
        reason: `Hourly spend cap exceeded (${hourlySpend.toFixed(2)} > ${this.budgets.perHourUsd.toFixed(2)})`,
      };
    }
    return { exceeded: false };
  }
}
