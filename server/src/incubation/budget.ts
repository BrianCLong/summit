// @ts-nocheck
import { BudgetManager } from './types.ts';

export class SimpleBudgetManager implements BudgetManager {
  private limits: { tokens: number; steps: number };
  private consumed: { tokens: number; steps: number };

  constructor(limits: { tokens: number; steps: number }) {
    this.limits = limits;
    this.consumed = { tokens: 0, steps: 0 };
  }

  checkBudget(costType: 'tokens' | 'steps', amount: number): boolean {
    return this.consumed[costType] + amount <= this.limits[costType];
  }

  consume(costType: 'tokens' | 'steps', amount: number): void {
    if (!this.checkBudget(costType, amount)) {
      throw new Error(`Budget exceeded for ${costType}. Limit: ${this.limits[costType]}, Current: ${this.consumed[costType]}, Requested: ${amount}`);
    }
    this.consumed[costType] += amount;
  }

  getRemaining(costType: 'tokens' | 'steps'): number {
    return Math.max(0, this.limits[costType] - this.consumed[costType]);
  }
}
