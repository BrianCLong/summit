/**
 * Property-based tests for token counting system
 * Uses fast-check to validate token counting properties across all scenarios
 */

import * as fc from 'fast-check';
import { describe, test, expect } from '@jest/globals';
import {
  estimateTokensAndCost,
  getSupportedModels,
  getModelPricing,
} from '../../server/src/lib/tokcount-enhanced';
import { validateTokenBudget } from '../../server/src/lib/tokcount';

describe('Token Counting Property Tests', () => {
  /**
   * Property: Token count should be monotonic with text length
   * Longer text should never result in fewer tokens
   */
  test('token count monotonicity with text length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.constantFrom('openai', 'anthropic', 'gemini'),
        async (baseText: string, additionalText: string, provider: string) => {
          const baseResult = await estimateTokensAndCost({
            payload: { input: baseText },
            provider: provider as any,
          });

          const longerResult = await estimateTokensAndCost({
            payload: { input: baseText + additionalText },
            provider: provider as any,
          });

          // Longer text should have >= tokens
          expect(longerResult.totalTokens).toBeGreaterThanOrEqual(
            baseResult.totalTokens,
          );

          // Cost should also be monotonic
          expect(longerResult.totalUSD).toBeGreaterThanOrEqual(
            baseResult.totalUSD,
          );
        },
      ),
      { numRuns: 50, timeout: 10000 },
    );
  });

  /**
   * Property: Token count consistency across providers
   * Same text should produce similar token counts across providers (within reason)
   */
  test('token count consistency across providers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 500 }),
        async (text: string) => {
          const providers = ['openai', 'anthropic', 'gemini'] as const;
          const results = await Promise.all(
            providers.map((provider) =>
              estimateTokensAndCost({
                payload: { input: text },
                provider,
              }),
            ),
          );

          // All results should be positive
          results.forEach((result) => {
            expect(result.totalTokens).toBeGreaterThan(0);
            expect(result.totalUSD).toBeGreaterThanOrEqual(0);
          });

          // Token counts shouldn't vary by more than 50% between providers
          const tokenCounts = results.map((r) => r.totalTokens);
          const minTokens = Math.min(...tokenCounts);
          const maxTokens = Math.max(...tokenCounts);

          if (minTokens > 0) {
            const variation = (maxTokens - minTokens) / minTokens;
            expect(variation).toBeLessThan(0.5); // Less than 50% variation
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property: Cost calculation correctness
   * Cost should be calculated correctly based on token counts and pricing
   */
  test('cost calculation correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.constantFrom('openai', 'anthropic', 'gemini'),
        async (text: string, provider: string) => {
          const result = await estimateTokensAndCost({
            payload: { input: text },
            provider: provider as any,
          });

          const pricing = getModelPricing(provider as any, result.model);
          expect(pricing).toBeTruthy();

          if (pricing) {
            // Manually calculate expected cost
            const expectedPromptCost =
              (result.promptTokens / 1000) * pricing.per1k.prompt;
            const expectedCompletionCost =
              (result.completionTokens / 1000) * pricing.per1k.completion;
            const expectedTotal = expectedPromptCost + expectedCompletionCost;

            // Allow for small floating point differences
            expect(Math.abs(result.totalUSD - expectedTotal)).toBeLessThan(
              0.000001,
            );
          }
        },
      ),
      { numRuns: 40 },
    );
  });

  /**
   * Property: Budget validation consistency
   * Budget validation should be consistent with the same inputs
   */
  test('budget validation consistency', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (tokens: number, budgetLimit: number) => {
          const result1 = validateTokenBudget(tokens, budgetLimit);
          const result2 = validateTokenBudget(tokens, budgetLimit);

          // Results should be identical
          expect(result1.withinBudget).toBe(result2.withinBudget);
          expect(result1.percentUsed).toBe(result2.percentUsed);
          expect(result1.recommendAction).toBe(result2.recommendAction);

          // Logical consistency checks
          if (tokens <= budgetLimit) {
            expect(result1.withinBudget).toBe(true);
            expect(result1.percentUsed).toBeLessThanOrEqual(100);
          } else {
            expect(result1.withinBudget).toBe(false);
            expect(result1.percentUsed).toBeGreaterThan(100);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Message array handling consistency
   * Token counting should handle message arrays consistently
   */
  test('message array handling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            role: fc.constantFrom('user', 'assistant', 'system'),
            content: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (messages: Array<{ role: string; content: string }>) => {
          const result = await estimateTokensAndCost({
            payload: { messages },
          });

          // Basic sanity checks
          expect(result.totalTokens).toBeGreaterThan(0);
          expect(result.totalUSD).toBeGreaterThanOrEqual(0);
          expect(result.provider).toBeTruthy();
          expect(result.model).toBeTruthy();

          // Token count should roughly correlate with total message length
          const totalLength = messages.reduce(
            (sum, msg) => sum + msg.content.length,
            0,
          );
          const tokensPerChar = result.totalTokens / Math.max(totalLength, 1);

          // Should be roughly 0.1 to 1 token per character (loose bounds)
          expect(tokensPerChar).toBeGreaterThan(0.05);
          expect(tokensPerChar).toBeLessThan(2.0);
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property: Supported models have valid pricing
   * All supported models should have valid, positive pricing
   */
  test('supported models have valid pricing', () => {
    const supportedModels = getSupportedModels();

    expect(supportedModels.length).toBeGreaterThan(0);

    supportedModels.forEach((modelInfo) => {
      expect(modelInfo.provider).toBeTruthy();
      expect(modelInfo.model).toBeTruthy();
      expect(modelInfo.pricing).toBeTruthy();

      // Pricing should be positive
      expect(modelInfo.pricing.per1k.prompt).toBeGreaterThan(0);
      expect(modelInfo.pricing.per1k.completion).toBeGreaterThan(0);

      // Completion pricing should generally be higher than prompt pricing
      expect(modelInfo.pricing.per1k.completion).toBeGreaterThanOrEqual(
        modelInfo.pricing.per1k.prompt,
      );
    });
  });

  /**
   * Property: Cache behavior consistency
   * Multiple calls with same input should use cache after first call
   */
  test('cache behavior consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (text: string) => {
          // First call - should not hit cache
          const result1 = await estimateTokensAndCost({
            payload: { input: text },
          });

          // Second call - should hit cache
          const result2 = await estimateTokensAndCost({
            payload: { input: text },
          });

          // Results should be identical
          expect(result1.totalTokens).toBe(result2.totalTokens);
          expect(result1.totalUSD).toBe(result2.totalUSD);
          expect(result1.provider).toBe(result2.provider);
          expect(result1.model).toBe(result2.model);

          // Second call should indicate cache hit
          expect(result2.cacheHit).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Empty input handling
   * Empty or minimal inputs should be handled gracefully
   */
  test('empty input handling', async () => {
    const emptyInputs = [
      { input: '' },
      { input: ' ' },
      { messages: [] },
      { messages: [{ role: 'user', content: '' }] },
      {},
    ];

    for (const payload of emptyInputs) {
      const result = await estimateTokensAndCost({ payload });

      // Should not crash and should return sensible values
      expect(result.totalTokens).toBeGreaterThanOrEqual(0);
      expect(result.totalUSD).toBeGreaterThanOrEqual(0);
      expect(result.provider).toBeTruthy();
      expect(result.model).toBeTruthy();
    }
  });

  /**
   * Property: Large input handling
   * Very large inputs should be handled without errors
   */
  test('large input handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10000, maxLength: 50000 }),
        async (largeText: string) => {
          const result = await estimateTokensAndCost({
            payload: { input: largeText },
          });

          // Should handle large inputs gracefully
          expect(result.totalTokens).toBeGreaterThan(1000); // Should be substantial
          expect(result.totalUSD).toBeGreaterThan(0);

          // Should not exceed reasonable maximums
          expect(result.totalTokens).toBeLessThan(200000); // Reasonable upper bound
          expect(result.totalUSD).toBeLessThan(1000); // $1000 upper bound for safety
        },
      ),
      { numRuns: 10 }, // Fewer runs for large inputs
    );
  });

  /**
   * Property: Estimation method consistency
   * Estimation method should be reported correctly
   */
  test('estimation method consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (text: string) => {
          const result = await estimateTokensAndCost({
            payload: { input: text },
          });

          // Estimation method should be one of the expected values
          expect(['precise', 'heuristic', 'cached']).toContain(
            result.estimationMethod,
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});
