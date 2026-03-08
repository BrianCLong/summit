"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleBudgetManager = void 0;
class SimpleBudgetManager {
    limits;
    consumed;
    constructor(limits) {
        this.limits = limits;
        this.consumed = { tokens: 0, steps: 0 };
    }
    checkBudget(costType, amount) {
        return this.consumed[costType] + amount <= this.limits[costType];
    }
    consume(costType, amount) {
        if (!this.checkBudget(costType, amount)) {
            throw new Error(`Budget exceeded for ${costType}. Limit: ${this.limits[costType]}, Current: ${this.consumed[costType]}, Requested: ${amount}`);
        }
        this.consumed[costType] += amount;
    }
    getRemaining(costType) {
        return Math.max(0, this.limits[costType] - this.consumed[costType]);
    }
}
exports.SimpleBudgetManager = SimpleBudgetManager;
