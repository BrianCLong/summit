"use strict";
/**
 * LLM preflight middleware for token budget enforcement
 * Guards against excessive token usage before API calls
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTokenBudget = enforceTokenBudget;
exports.truncatePromptIfNeeded = truncatePromptIfNeeded;
exports.enforceTokenBudgetWithTracking = enforceTokenBudgetWithTracking;
const tokcount_js_1 = require("../lib/tokcount.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Middleware to enforce token budgets before LLM API calls
 */
async function enforceTokenBudget(req, res, next) {
    try {
        const { provider, model, prompt, completion } = req.body;
        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields for token counting',
                required: ['model', 'prompt'],
            });
        }
        const inferredProvider = provider || (0, tokcount_js_1.getModelFamily)(model);
        const tokenCount = await (0, tokcount_js_1.countTokens)(inferredProvider, model, prompt, completion);
        const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
        const budgetCheck = (0, tokcount_js_1.validateTokenBudget)(tokenCount.total, budgetLimit);
        // Add token count info to request for downstream use
        req.body._tokcount = {
            total: tokenCount.total,
            truncated: false,
            estimatedCostUSD: tokenCount.estimatedCostUSD,
            budgetStatus: budgetCheck.recommendAction,
        };
        // Handle different budget scenarios
        switch (budgetCheck.recommendAction) {
            case 'block':
                logger_js_1.default.warn(`Token budget exceeded: ${tokenCount.total} tokens (limit: ${budgetLimit})`, {
                    model,
                    tokens: tokenCount.total,
                    cost: tokenCount.estimatedCostUSD,
                });
                return res.status(429).json({
                    error: 'Token budget exceeded',
                    details: {
                        tokensRequested: tokenCount.total,
                        budgetLimit,
                        percentUsed: budgetCheck.percentUsed,
                        estimatedCostUSD: tokenCount.estimatedCostUSD,
                    },
                    suggestion: 'Reduce prompt length or increase budget limit',
                });
            case 'warn':
                logger_js_1.default.warn(`Token budget warning: ${tokenCount.total} tokens (${budgetCheck.percentUsed}% of limit)`, {
                    model,
                    tokens: tokenCount.total,
                    cost: tokenCount.estimatedCostUSD,
                });
                // Add warning headers but continue
                res.setHeader('X-Token-Budget-Warning', 'true');
                res.setHeader('X-Token-Usage-Percent', budgetCheck.percentUsed.toString());
                break;
            case 'proceed':
                logger_js_1.default.debug(`Token budget check passed: ${tokenCount.total} tokens`, {
                    model,
                    tokens: tokenCount.total,
                });
                break;
        }
        // Set informational headers
        res.setHeader('X-Token-Count', tokenCount.total.toString());
        res.setHeader('X-Estimated-Cost-USD', (tokenCount.estimatedCostUSD || 0).toString());
        next();
    }
    catch (error) {
        logger_js_1.default.error('Token budget enforcement error:', error);
        // Don't block requests on token counting errors, but log them
        req.body._tokcount = {
            total: 0,
            truncated: false,
            budgetStatus: 'proceed',
        };
        next();
    }
}
/**
 * Middleware to truncate prompts that exceed budget
 */
async function truncatePromptIfNeeded(req, res, next) {
    try {
        const { provider, model, prompt } = req.body;
        const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
        const maxTokens = Math.floor(budgetLimit * 0.9); // Use 90% of budget for safety
        if (!model || !prompt) {
            return next();
        }
        const inferredProvider = provider || (0, tokcount_js_1.getModelFamily)(model);
        const tokenCount = await (0, tokcount_js_1.countTokens)(inferredProvider, model, prompt);
        if (tokenCount.total > maxTokens) {
            // Simple truncation strategy - take first portion of prompt
            const averageCharsPerToken = prompt.length / tokenCount.total;
            const maxChars = Math.floor(maxTokens * averageCharsPerToken * 0.9);
            const truncatedPrompt = prompt.substring(0, maxChars) +
                '\n\n[... content truncated due to token limit ...]';
            req.body.prompt = truncatedPrompt;
            req.body._tokcount = {
                total: maxTokens,
                truncated: true,
                budgetStatus: 'proceed',
            };
            logger_js_1.default.warn(`Prompt truncated: ${tokenCount.total} -> ${maxTokens} tokens`, {
                model,
                originalTokens: tokenCount.total,
                truncatedTokens: maxTokens,
            });
        }
        next();
    }
    catch (error) {
        logger_js_1.default.error('Prompt truncation error:', error);
        next();
    }
}
/**
 * Enhanced middleware with cost tracking per user/tenant
 */
async function enforceTokenBudgetWithTracking(req, res, next) {
    try {
        // Extract user/tenant info from auth context
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        const { provider, model, prompt, completion } = req.body;
        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields for token counting',
            });
        }
        const inferredProvider = provider || (0, tokcount_js_1.getModelFamily)(model);
        const tokenCount = await (0, tokcount_js_1.countTokens)(inferredProvider, model, prompt, completion);
        // TODO: Implement usage tracking per user/tenant
        // This would integrate with a usage tracking service
        // const usage = await trackTokenUsage(userId, tenantId, tokenCount);
        const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
        const budgetCheck = (0, tokcount_js_1.validateTokenBudget)(tokenCount.total, budgetLimit);
        req.body._tokcount = {
            total: tokenCount.total,
            truncated: false,
            estimatedCostUSD: tokenCount.estimatedCostUSD,
            budgetStatus: budgetCheck.recommendAction,
        };
        if (budgetCheck.recommendAction === 'block') {
            return res.status(429).json({
                error: 'Token budget exceeded',
                details: {
                    tokensRequested: tokenCount.total,
                    budgetLimit,
                    percentUsed: budgetCheck.percentUsed,
                    estimatedCostUSD: tokenCount.estimatedCostUSD,
                    userId,
                    tenantId,
                },
            });
        }
        next();
    }
    catch (error) {
        logger_js_1.default.error('Enhanced token budget enforcement error:', error);
        next();
    }
}
