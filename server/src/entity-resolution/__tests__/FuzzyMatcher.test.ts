import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { FuzzyMatcher } from '../engine/FuzzyMatcher.js';

describe('FuzzyMatcher', () => {
  describe('levenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(FuzzyMatcher.levenshteinSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
       // Note: normalized strings. 'abc' and 'xyz' have distance 3. max length 3. 1 - 3/3 = 0.
      expect(FuzzyMatcher.levenshteinSimilarity('abc', 'xyz')).toBe(0);
    });

    it('should handle partial matches', () => {
      // 'kitten' vs 'sitten' distance is 1. max length 6. 1 - 1/6 = 0.833
      const sim = FuzzyMatcher.levenshteinSimilarity('kitten', 'sitten');
      expect(sim).toBeCloseTo(0.833, 2);
    });

    it('should normalize strings', () => {
      expect(FuzzyMatcher.levenshteinSimilarity('Hello ', 'hello')).toBe(1);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical token sets', () => {
      expect(FuzzyMatcher.cosineSimilarity('hello world', 'world hello')).toBeCloseTo(1);
    });

    it('should return 0 for no shared tokens', () => {
      expect(FuzzyMatcher.cosineSimilarity('hello world', 'foo bar')).toBe(0);
    });

    it('should handle partial overlap', () => {
      // A: "apple banana" B: "apple orange"
      // Tokens: apple, banana, orange
      // A: [1, 1, 0]
      // B: [1, 0, 1]
      // Dot: 1*1 = 1
      // MagA: sqrt(2), MagB: sqrt(2)
      // Sim: 1 / 2 = 0.5
      expect(FuzzyMatcher.cosineSimilarity('apple banana', 'apple orange')).toBeCloseTo(0.5);
    });
  });
});
