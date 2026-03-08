"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAdmit = shouldAdmit;
// server/src/conductor/limits.ts
function shouldAdmit(req, costUsd) {
    const budgetDaily = Number(process.env.CONDUCTOR_BUDGET_DAILY_USD || 0);
    // fetch rolling cost from Redis/DB…
    const projected = /* currentDayCost */ 0 + costUsd;
    if (budgetDaily && projected > budgetDaily)
        return { admit: false, reason: 'BudgetExceeded' };
    // token bucket / leaky bucket here for RPS…
    return { admit: true };
}
