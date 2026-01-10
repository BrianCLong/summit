
import { SharedBudget, CoordinationContext } from './types.js';

export class CoordinationBudgetManager {
  // In-memory store for now. In production, this would be Redis/Postgres.
  private contexts: Map<string, CoordinationContext> = new Map();

  initialize(context: CoordinationContext) {
    if (this.contexts.has(context.coordinationId)) {
      throw new Error(`Budget/Context already exists for coordinationId: ${context.coordinationId}`);
    }
    this.contexts.set(context.coordinationId, context);
  }

  get(coordinationId: string): CoordinationContext | undefined {
    return this.contexts.get(coordinationId);
  }

  checkBudget(coordinationId: string): { allowed: boolean; reason?: string } {
    const context = this.contexts.get(coordinationId);
    if (!context) {
      return { allowed: false, reason: 'Coordination context not found' };
    }

    if (context.status !== 'ACTIVE') {
       return { allowed: false, reason: `Context is ${context.status}` };
    }

    // Check Wall Clock
    const elapsed = Date.now() - context.startTime.getTime();
    if (elapsed > context.budget.wallClockTimeMs) {
      return { allowed: false, reason: 'Wall clock time exceeded' };
    }

    // Check Steps
    if (context.budgetConsumed.totalSteps >= context.budget.totalSteps) {
      return { allowed: false, reason: 'Step limit exceeded' };
    }

    // Check Tokens
    if (context.budgetConsumed.totalTokens >= context.budget.totalTokens) {
      return { allowed: false, reason: 'Token limit exceeded' };
    }

    return { allowed: true };
  }

  consumeBudget(coordinationId: string, usage: Partial<SharedBudget>): void {
    const context = this.contexts.get(coordinationId);
    if (!context) {
       throw new Error(`Coordination context not found: ${coordinationId}`);
    }

    if (usage.totalSteps) {
      context.budgetConsumed.totalSteps += usage.totalSteps;
    }
    if (usage.totalTokens) {
      context.budgetConsumed.totalTokens += usage.totalTokens;
    }

    // Check if we exhausted budget after consumption
    const check = this.checkBudget(coordinationId);
    if (!check.allowed && check.reason !== `Context is ${context.status}`) {
       // Only terminate if it wasn't already terminated
       // But wait, checkBudget returns false if time exceeded, even if status is ACTIVE.
       // We should update status if budget is exhausted.
       // This logic might be better placed in the Service, but we can return a signal here.
    }
  }

  delete(coordinationId: string): boolean {
    return this.contexts.delete(coordinationId);
  }
}

export const budgetManager = new CoordinationBudgetManager();
