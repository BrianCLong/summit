import { describe, it, expect } from 'vitest';
import { HeuristicDifficultyScorer } from '../../../src/daao/difficulty/heuristicDifficultyScorer.js';

describe('HeuristicDifficultyScorer', () => {
  const scorer = new HeuristicDifficultyScorer();

  it('should score short simple queries as easy', async () => {
    const result = await scorer.estimate("What is the capital of France?");
    expect(result.band).toBe("easy");
    expect(result.score).toBeLessThan(0.4);
    expect(result.recommendedDepth).toBe(1);
  });

  it('should score long queries as medium or hard', async () => {
    const longQuery = "A".repeat(501);
    const result = await scorer.estimate(longQuery);
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.reasons).toContain("Query length > 500 chars");
  });

  it('should detect complexity keywords', async () => {
    const complexQuery = "Please analyze and evaluate the comprehensive architecture design of this system.";
    const result = await scorer.estimate(complexQuery);
    const hasComplexityReason = result.reasons.some(r => /found .* complexity keywords/.test(r));
    expect(hasComplexityReason).toBe(true);
    expect(result.score).toBeGreaterThan(0.2); // Base score
  });

  it('should detect code snippets', async () => {
    const codeQuery = "Here is a function: ```javascript function test() {} ```";
    const result = await scorer.estimate(codeQuery);
    expect(result.reasons).toContain("Contains code snippets");
    expect(result.score).toBeGreaterThan(0.2);
  });

  it('should clamp scores between 0 and 1', async () => {
    // Construct a query that triggers all heuristics to potentially exceed 1.0
    const ultraHard = "analyze evaluate design architecture strategy comprehensive " + "A".repeat(600) + " ```code```";
    const result = await scorer.estimate(ultraHard);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.band).toBe("hard");
  });
});
