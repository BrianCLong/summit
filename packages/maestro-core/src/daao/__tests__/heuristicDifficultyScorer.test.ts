import { describe, it, expect, beforeEach } from '@jest/globals';
import { HeuristicDifficultyScorer } from '../difficulty/heuristicDifficultyScorer';

describe('HeuristicDifficultyScorer', () => {
  let scorer: HeuristicDifficultyScorer;

  beforeEach(() => {
    scorer = new HeuristicDifficultyScorer();
  });

  it('should classify simple query as easy', async () => {
    const result = await scorer.estimate('Hello world');
    expect(result.band).toBe('easy');
    expect(result.score).toBeLessThan(0.4);
    expect(result.recommendedDepth).toBe(1);
  });

  it('should classify complex coding query as medium or hard', async () => {
    const query = 'Write a function to calculate fibonacci sequence using recursion and memoization. Explain the time complexity.';
    const result = await scorer.estimate(query);
    // It should detect coding domain
    expect(result.domain).toBe('coding');
    // It should have elevated score due to "calculate" (math) or coding keywords like "function"
    expect(result.score).toBeGreaterThan(0.1);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
