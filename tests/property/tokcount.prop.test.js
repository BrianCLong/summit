"use strict";
/**
 * Property-based tests for token counting system
 * Uses fast-check to validate token counting properties across all scenarios
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const globals_1 = require("@jest/globals");
const tokcount_enhanced_1 = require("../../server/src/lib/tokcount-enhanced");
const tokcount_1 = require("../../server/src/lib/tokcount");
(0, globals_1.describe)('Token Counting Property Tests', () => {
    /**
     * Property: Token count should be monotonic with text length
     * Longer text should never result in fewer tokens
     */
    (0, globals_1.test)('token count monotonicity with text length', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 1, maxLength: 1000 }), fc.string({ minLength: 1, maxLength: 1000 }), fc.constantFrom('openai', 'anthropic', 'gemini'), async (baseText, additionalText, provider) => {
            const baseResult = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: baseText },
                provider: provider,
            });
            const longerResult = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: baseText + additionalText },
                provider: provider,
            });
            // Longer text should have >= tokens
            (0, globals_1.expect)(longerResult.totalTokens).toBeGreaterThanOrEqual(baseResult.totalTokens);
            // Cost should also be monotonic
            (0, globals_1.expect)(longerResult.totalUSD).toBeGreaterThanOrEqual(baseResult.totalUSD);
        }), { numRuns: 50, timeout: 10000 });
    });
    /**
     * Property: Token count consistency across providers
     * Same text should produce similar token counts across providers (within reason)
     */
    (0, globals_1.test)('token count consistency across providers', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 10, maxLength: 500 }), async (text) => {
            const providers = ['openai', 'anthropic', 'gemini'];
            const results = await Promise.all(providers.map((provider) => (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: text },
                provider,
            })));
            // All results should be positive
            results.forEach((result) => {
                (0, globals_1.expect)(result.totalTokens).toBeGreaterThan(0);
                (0, globals_1.expect)(result.totalUSD).toBeGreaterThanOrEqual(0);
            });
            // Token counts shouldn't vary by more than 50% between providers
            const tokenCounts = results.map((r) => r.totalTokens);
            const minTokens = Math.min(...tokenCounts);
            const maxTokens = Math.max(...tokenCounts);
            if (minTokens > 0) {
                const variation = (maxTokens - minTokens) / minTokens;
                (0, globals_1.expect)(variation).toBeLessThan(0.5); // Less than 50% variation
            }
        }), { numRuns: 30 });
    });
    /**
     * Property: Cost calculation correctness
     * Cost should be calculated correctly based on token counts and pricing
     */
    (0, globals_1.test)('cost calculation correctness', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 1, maxLength: 200 }), fc.constantFrom('openai', 'anthropic', 'gemini'), async (text, provider) => {
            const result = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: text },
                provider: provider,
            });
            const pricing = (0, tokcount_enhanced_1.getModelPricing)(provider, result.model);
            (0, globals_1.expect)(pricing).toBeTruthy();
            if (pricing) {
                // Manually calculate expected cost
                const expectedPromptCost = (result.promptTokens / 1000) * pricing.per1k.prompt;
                const expectedCompletionCost = (result.completionTokens / 1000) * pricing.per1k.completion;
                const expectedTotal = expectedPromptCost + expectedCompletionCost;
                // Allow for small floating point differences
                (0, globals_1.expect)(Math.abs(result.totalUSD - expectedTotal)).toBeLessThan(0.000001);
            }
        }), { numRuns: 40 });
    });
    /**
     * Property: Budget validation consistency
     * Budget validation should be consistent with the same inputs
     */
    (0, globals_1.test)('budget validation consistency', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 1000000 }), fc.integer({ min: 1, max: 1000000 }), (tokens, budgetLimit) => {
            const result1 = (0, tokcount_1.validateTokenBudget)(tokens, budgetLimit);
            const result2 = (0, tokcount_1.validateTokenBudget)(tokens, budgetLimit);
            // Results should be identical
            (0, globals_1.expect)(result1.withinBudget).toBe(result2.withinBudget);
            (0, globals_1.expect)(result1.percentUsed).toBe(result2.percentUsed);
            (0, globals_1.expect)(result1.recommendAction).toBe(result2.recommendAction);
            // Logical consistency checks
            if (tokens <= budgetLimit) {
                (0, globals_1.expect)(result1.withinBudget).toBe(true);
                (0, globals_1.expect)(result1.percentUsed).toBeLessThanOrEqual(100);
            }
            else {
                (0, globals_1.expect)(result1.withinBudget).toBe(false);
                (0, globals_1.expect)(result1.percentUsed).toBeGreaterThan(100);
            }
        }), { numRuns: 100 });
    });
    /**
     * Property: Message array handling consistency
     * Token counting should handle message arrays consistently
     */
    (0, globals_1.test)('message array handling consistency', async () => {
        await fc.assert(fc.asyncProperty(fc.array(fc.record({
            role: fc.constantFrom('user', 'assistant', 'system'),
            content: fc.string({ minLength: 1, maxLength: 100 }),
        }), { minLength: 1, maxLength: 10 }), async (messages) => {
            const result = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { messages },
            });
            // Basic sanity checks
            (0, globals_1.expect)(result.totalTokens).toBeGreaterThan(0);
            (0, globals_1.expect)(result.totalUSD).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.provider).toBeTruthy();
            (0, globals_1.expect)(result.model).toBeTruthy();
            // Token count should roughly correlate with total message length
            const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
            const tokensPerChar = result.totalTokens / Math.max(totalLength, 1);
            // Should be roughly 0.1 to 1 token per character (loose bounds)
            (0, globals_1.expect)(tokensPerChar).toBeGreaterThan(0.05);
            (0, globals_1.expect)(tokensPerChar).toBeLessThan(2.0);
        }), { numRuns: 30 });
    });
    /**
     * Property: Supported models have valid pricing
     * All supported models should have valid, positive pricing
     */
    (0, globals_1.test)('supported models have valid pricing', () => {
        const supportedModels = (0, tokcount_enhanced_1.getSupportedModels)();
        (0, globals_1.expect)(supportedModels.length).toBeGreaterThan(0);
        supportedModels.forEach((modelInfo) => {
            (0, globals_1.expect)(modelInfo.provider).toBeTruthy();
            (0, globals_1.expect)(modelInfo.model).toBeTruthy();
            (0, globals_1.expect)(modelInfo.pricing).toBeTruthy();
            // Pricing should be positive
            (0, globals_1.expect)(modelInfo.pricing.per1k.prompt).toBeGreaterThan(0);
            (0, globals_1.expect)(modelInfo.pricing.per1k.completion).toBeGreaterThan(0);
            // Completion pricing should generally be higher than prompt pricing
            (0, globals_1.expect)(modelInfo.pricing.per1k.completion).toBeGreaterThanOrEqual(modelInfo.pricing.per1k.prompt);
        });
    });
    /**
     * Property: Cache behavior consistency
     * Multiple calls with same input should use cache after first call
     */
    (0, globals_1.test)('cache behavior consistency', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 10, maxLength: 100 }), async (text) => {
            // First call - should not hit cache
            const result1 = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: text },
            });
            // Second call - should hit cache
            const result2 = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: text },
            });
            // Results should be identical
            (0, globals_1.expect)(result1.totalTokens).toBe(result2.totalTokens);
            (0, globals_1.expect)(result1.totalUSD).toBe(result2.totalUSD);
            (0, globals_1.expect)(result1.provider).toBe(result2.provider);
            (0, globals_1.expect)(result1.model).toBe(result2.model);
            // Second call should indicate cache hit
            (0, globals_1.expect)(result2.cacheHit).toBe(true);
        }), { numRuns: 20 });
    });
    /**
     * Property: Empty input handling
     * Empty or minimal inputs should be handled gracefully
     */
    (0, globals_1.test)('empty input handling', async () => {
        const emptyInputs = [
            { input: '' },
            { input: ' ' },
            { messages: [] },
            { messages: [{ role: 'user', content: '' }] },
            {},
        ];
        for (const payload of emptyInputs) {
            const result = await (0, tokcount_enhanced_1.estimateTokensAndCost)({ payload });
            // Should not crash and should return sensible values
            (0, globals_1.expect)(result.totalTokens).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.totalUSD).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.provider).toBeTruthy();
            (0, globals_1.expect)(result.model).toBeTruthy();
        }
    });
    /**
     * Property: Large input handling
     * Very large inputs should be handled without errors
     */
    (0, globals_1.test)('large input handling', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 10000, maxLength: 50000 }), async (largeText) => {
            const result = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: largeText },
            });
            // Should handle large inputs gracefully
            (0, globals_1.expect)(result.totalTokens).toBeGreaterThan(1000); // Should be substantial
            (0, globals_1.expect)(result.totalUSD).toBeGreaterThan(0);
            // Should not exceed reasonable maximums
            (0, globals_1.expect)(result.totalTokens).toBeLessThan(200000); // Reasonable upper bound
            (0, globals_1.expect)(result.totalUSD).toBeLessThan(1000); // $1000 upper bound for safety
        }), { numRuns: 10 });
    });
    /**
     * Property: Estimation method consistency
     * Estimation method should be reported correctly
     */
    (0, globals_1.test)('estimation method consistency', async () => {
        await fc.assert(fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (text) => {
            const result = await (0, tokcount_enhanced_1.estimateTokensAndCost)({
                payload: { input: text },
            });
            // Estimation method should be one of the expected values
            (0, globals_1.expect)(['precise', 'heuristic', 'cached']).toContain(result.estimationMethod);
        }), { numRuns: 30 });
    });
});
