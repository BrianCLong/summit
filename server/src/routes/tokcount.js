"use strict";
// @ts-nocheck
/**
 * Token counting API endpoints
 * Provides real-time token counts and cost estimates for LLM operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokcountRouter = void 0;
const express_1 = require("express");
const tokcount_js_1 = require("../lib/tokcount.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
exports.tokcountRouter = (0, express_1.Router)();
// Apply authentication to all token counting routes
exports.tokcountRouter.use(auth_js_1.authMiddleware);
/**
 * POST /api/tokcount
 * Count tokens for a given text and model
 */
exports.tokcountRouter.post('/api/tokcount', async (req, res) => {
    try {
        const { provider, model, prompt, completion } = req.body || {};
        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields: model and prompt are required',
            });
        }
        const inferredProvider = provider || (0, tokcount_js_1.getModelFamily)(model);
        const result = await (0, tokcount_js_1.countTokens)(inferredProvider, model, prompt, completion);
        // Add budget validation
        const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
        const budgetCheck = (0, tokcount_js_1.validateTokenBudget)(result.total, budgetLimit);
        res.json({
            ...result,
            budget: {
                limit: budgetLimit,
                ...budgetCheck,
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('Token counting error:', error);
        res.status(500).json({
            error: 'Failed to count tokens',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /api/tokcount/batch
 * Count tokens for multiple prompts/models in batch
 */
exports.tokcountRouter.post('/api/tokcount/batch', async (req, res) => {
    try {
        const { requests } = req.body || {};
        if (!Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({
                error: 'requests must be a non-empty array',
            });
        }
        if (requests.length > 50) {
            return res.status(400).json({
                error: 'Maximum 50 requests allowed per batch',
            });
        }
        const results = await Promise.all(requests.map(async ({ provider, model, prompt, completion, id }) => {
            try {
                if (!model || !prompt) {
                    throw new Error('Missing model or prompt');
                }
                const inferredProvider = provider || (0, tokcount_js_1.getModelFamily)(model);
                const result = await (0, tokcount_js_1.countTokens)(inferredProvider, model, prompt, completion);
                return {
                    id: id || `${model}-${Date.now()}`,
                    success: true,
                    ...result,
                };
            }
            catch (error) {
                return {
                    id: id || `error-${Date.now()}`,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        const totalTokens = results
            .filter((r) => r.success)
            .reduce((sum, r) => sum + (r.total || 0), 0);
        const totalCost = results
            .filter((r) => r.success)
            .reduce((sum, r) => sum + (r.estimatedCostUSD || 0), 0);
        res.json({
            results,
            summary: {
                totalRequests: requests.length,
                successfulRequests: results.filter((r) => r.success).length,
                totalTokens,
                totalEstimatedCostUSD: Number(totalCost.toFixed(6)),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('Batch token counting error:', error);
        res.status(500).json({
            error: 'Failed to process batch token counting',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/tokcount/models
 * Get supported models and their pricing
 */
exports.tokcountRouter.get('/api/tokcount/models', (req, res) => {
    const models = {
        openai: [
            { name: 'gpt-4o', family: 'openai', inputCost: 0.0025, outputCost: 0.01 },
            {
                name: 'gpt-4o-mini',
                family: 'openai',
                inputCost: 0.00015,
                outputCost: 0.0006,
            },
            {
                name: 'gpt-4-turbo',
                family: 'openai',
                inputCost: 0.01,
                outputCost: 0.03,
            },
            {
                name: 'gpt-3.5-turbo',
                family: 'openai',
                inputCost: 0.0005,
                outputCost: 0.0015,
            },
        ],
        anthropic: [
            {
                name: 'claude-3-5-sonnet-20241022',
                family: 'anthropic',
                inputCost: 0.003,
                outputCost: 0.015,
            },
            {
                name: 'claude-3-opus',
                family: 'anthropic',
                inputCost: 0.015,
                outputCost: 0.075,
            },
            {
                name: 'claude-3-haiku',
                family: 'anthropic',
                inputCost: 0.00025,
                outputCost: 0.00125,
            },
        ],
        gemini: [
            {
                name: 'gemini-1.5-pro',
                family: 'gemini',
                inputCost: 0.00125,
                outputCost: 0.005,
            },
            {
                name: 'gemini-1.5-flash',
                family: 'gemini',
                inputCost: 0.000075,
                outputCost: 0.0003,
            },
        ],
    };
    res.json({
        models,
        note: 'Costs are per 1K tokens in USD. Actual costs may vary.',
    });
});
/**
 * GET /api/tokcount/budget
 * Get current token budget configuration
 */
exports.tokcountRouter.get('/api/tokcount/budget', (req, res) => {
    const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
    const warningThreshold = Number(process.env.TOKEN_WARNING_THRESHOLD || 80);
    res.json({
        limit: budgetLimit,
        warningThreshold,
        configured: !!process.env.TOKEN_BUDGET_LIMIT,
        environment: process.env.NODE_ENV || 'development',
    });
});
