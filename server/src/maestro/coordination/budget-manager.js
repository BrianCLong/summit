"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetManager = exports.CoordinationBudgetManager = void 0;
class CoordinationBudgetManager {
    // In-memory store for now. In production, this would be Redis/Postgres.
    contexts = new Map();
    initialize(context) {
        if (this.contexts.has(context.coordinationId)) {
            throw new Error(`Budget/Context already exists for coordinationId: ${context.coordinationId}`);
        }
        this.contexts.set(context.coordinationId, context);
    }
    get(coordinationId) {
        return this.contexts.get(coordinationId);
    }
    checkBudget(coordinationId) {
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
    consumeBudget(coordinationId, usage) {
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
    delete(coordinationId) {
        return this.contexts.delete(coordinationId);
    }
}
exports.CoordinationBudgetManager = CoordinationBudgetManager;
exports.budgetManager = new CoordinationBudgetManager();
