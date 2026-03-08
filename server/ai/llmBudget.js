"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prBudgetTracker = exports.PRBudgetTracker = exports.BudgetExceededError = exports.Budget = void 0;
exports.callModel = callModel;
const logger_js_1 = require("../utils/logger.js");
class Budget {
    maxUSD;
    softLimitPct;
    agentId;
    agentVersion;
    usedUSD = 0;
    transactions = [];
    constructor(maxUSD, softLimitPct = 0.8, agentId, agentVersion) {
        this.maxUSD = maxUSD;
        this.softLimitPct = softLimitPct;
        this.agentId = agentId;
        this.agentVersion = agentVersion;
    }
    charge(usd, description) {
        this.usedUSD += usd;
        const transaction = {
            amount: usd,
            timestamp: new Date(),
            description: description || 'LLM API call',
            remainingBudget: this.maxUSD - this.usedUSD,
        };
        this.transactions.push(transaction);
        logger_js_1.logger.debug('Budget charged', {
            amount: usd,
            used: this.usedUSD,
            remaining: this.maxUSD - this.usedUSD,
            utilization: (this.usedUSD / this.maxUSD) * 100,
        });
        // Check limits
        if (this.usedUSD > this.maxUSD) {
            throw new BudgetExceededError(`Budget cap exceeded: $${this.usedUSD.toFixed(3)} > $${this.maxUSD.toFixed(3)}`, this.usedUSD, this.maxUSD);
        }
        // Soft limit warning
        if (this.usedUSD > this.maxUSD * this.softLimitPct) {
            logger_js_1.logger.warn('Budget soft limit exceeded', {
                used: this.usedUSD,
                limit: this.maxUSD * this.softLimitPct,
                remaining: this.maxUSD - this.usedUSD,
            });
        }
    }
    getRemainingBudget() {
        return Math.max(0, this.maxUSD - this.usedUSD);
    }
    getUtilization() {
        return (this.usedUSD / this.maxUSD) * 100;
    }
    getTransactions() {
        return [...this.transactions];
    }
    canAfford(amount) {
        return this.usedUSD + amount <= this.maxUSD;
    }
    suggestDownshift() {
        if (this.getUtilization() > 70) {
            return {
                reason: `Budget ${this.getUtilization().toFixed(1)}% utilized`,
                suggestions: [
                    'Switch to smaller model (e.g. gpt-3.5-turbo instead of gpt-4)',
                    'Use cached responses where possible',
                    'Reduce prompt size',
                    'Batch similar requests',
                ],
            };
        }
        return null;
    }
}
exports.Budget = Budget;
class BudgetExceededError extends Error {
    used;
    limit;
    constructor(message, used, limit) {
        super(message);
        this.used = used;
        this.limit = limit;
        this.name = 'BudgetExceededError';
    }
}
exports.BudgetExceededError = BudgetExceededError;
// Budget guard wrapper for LLM calls
async function callModel(budget, call, description) {
    const result = await call();
    budget.charge(result.costUSD, description);
    return result.output;
}
// Per-PR budget tracker
class PRBudgetTracker {
    prBudgets = new Map();
    getOrCreateBudget(prNumber, maxUSD = 10, agentId, agentVersion) {
        if (!this.prBudgets.has(prNumber)) {
            this.prBudgets.set(prNumber, new Budget(maxUSD, 0.8, agentId, agentVersion));
            logger_js_1.logger.info('Created PR budget', { pr: prNumber, budget: maxUSD, agentId });
        }
        return this.prBudgets.get(prNumber);
    }
    getBudgetSummary(prNumber) {
        const budget = this.prBudgets.get(prNumber);
        if (!budget)
            return null;
        return {
            prNumber,
            maxUSD: budget.maxUSD,
            usedUSD: budget.usedUSD,
            remainingUSD: budget.getRemainingBudget(),
            utilization: budget.getUtilization(),
            transactions: budget.getTransactions(),
            downshiftSuggestion: budget.suggestDownshift(),
        };
    }
    getAllBudgetSummaries() {
        return Array.from(this.prBudgets.keys())
            .map((pr) => this.getBudgetSummary(pr))
            .filter(Boolean);
    }
    clearPRBudget(prNumber) {
        if (this.prBudgets.delete(prNumber)) {
            logger_js_1.logger.info('Cleared PR budget', { pr: prNumber });
        }
    }
}
exports.PRBudgetTracker = PRBudgetTracker;
// Singleton instance for tracking PR budgets
exports.prBudgetTracker = new PRBudgetTracker();
