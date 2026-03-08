"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUDGETS = void 0;
exports.checkBudget = checkBudget;
exports.BUDGETS = {
    maxTokensPerWorkflow: 4000,
    maxTimeMs: 8000,
    rerankTopK: 50 // Rerank top-K only
};
function checkBudget(tokensUsed, timeSpentMs) {
    if (tokensUsed > exports.BUDGETS.maxTokensPerWorkflow)
        return false;
    if (timeSpentMs > exports.BUDGETS.maxTimeMs)
        return false;
    return true;
}
