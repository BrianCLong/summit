"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REASONING_BUDGET = void 0;
exports.normalizeReasoningBudget = normalizeReasoningBudget;
exports.buildBudgetEvidence = buildBudgetEvidence;
exports.summarizeBudgetForPolicy = summarizeBudgetForPolicy;
exports.DEFAULT_REASONING_BUDGET = {
    thinkMode: 'normal',
    thinkingBudget: 1024,
    maxTokens: 2048,
    toolBudget: 16,
    timeBudgetMs: 60000,
    redactionPolicy: 'summary_only',
};
const MIN_BUDGET = 0;
function clampNonNegative(value, fallback) {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(MIN_BUDGET, Math.floor(value));
}
function normalizeReasoningBudget(input) {
    const base = exports.DEFAULT_REASONING_BUDGET;
    const thinkMode = input?.thinkMode ?? base.thinkMode;
    const thinkingBudget = clampNonNegative(input?.thinkingBudget ?? base.thinkingBudget, base.thinkingBudget);
    const maxTokens = clampNonNegative(input?.maxTokens ?? base.maxTokens, base.maxTokens);
    const toolBudget = clampNonNegative(input?.toolBudget ?? base.toolBudget, base.toolBudget);
    const timeBudgetMs = clampNonNegative(input?.timeBudgetMs ?? base.timeBudgetMs, base.timeBudgetMs);
    const redactionPolicy = input?.redactionPolicy ?? base.redactionPolicy;
    return {
        thinkMode,
        thinkingBudget: thinkMode === 'off' ? 0 : thinkingBudget,
        maxTokens,
        toolBudget,
        timeBudgetMs,
        redactionPolicy,
    };
}
function buildBudgetEvidence(budget, outcome, recordedAt = new Date().toISOString()) {
    return {
        budget,
        outcome,
        recordedAt,
    };
}
function summarizeBudgetForPolicy(budget) {
    return {
        think_mode: budget.thinkMode,
        thinking_budget: budget.thinkingBudget,
        max_tokens: budget.maxTokens,
        tool_budget: budget.toolBudget,
        time_budget_ms: budget.timeBudgetMs,
        redaction_policy: budget.redactionPolicy,
    };
}
