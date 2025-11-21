import { SimilarityEngine } from './index';

describe('SimilarityEngine', () => {
  let engine: SimilarityEngine;

  beforeEach(() => {
    engine = new SimilarityEngine();
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const similarity = engine.cosineSimilarity('hello world', 'hello world');
      expect(similarity).toBe(1);
    });

    it('should return high similarity for similar texts', () => {
      const similarity = engine.cosineSimilarity('hello world', 'hello there world');
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should return low similarity for different texts', () => {
      const similarity = engine.cosineSimilarity('hello world', 'goodbye moon');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle empty strings', () => {
      const similarity = engine.cosineSimilarity('', '');
      expect(similarity).toBe(0);
    });

    it('should return value between 0 and 1', () => {
      const similarity = engine.cosineSimilarity('test one', 'test two');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const similarity = engine.jaccardSimilarity('hello world', 'hello world');
      expect(similarity).toBe(1);
    });

    it('should calculate correct similarity', () => {
      const similarity = engine.jaccardSimilarity('hello world', 'hello there');
      // 'hello' is common, 'world' and 'there' are unique
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should return 0 for completely different texts', () => {
      const similarity = engine.jaccardSimilarity('abc', 'xyz');
      expect(similarity).toBe(0);
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(engine.levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate correct distance for single edit', () => {
      expect(engine.levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    it('should calculate correct distance for multiple edits', () => {
      expect(engine.levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(engine.levenshteinDistance('', 'hello')).toBe(5);
      expect(engine.levenshteinDistance('hello', '')).toBe(5);
      expect(engine.levenshteinDistance('', '')).toBe(0);
    });
  });

  describe('fuzzyMatch', () => {
    it('should return true for similar strings', () => {
      expect(engine.fuzzyMatch('hello', 'helo', 0.7)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(engine.fuzzyMatch('hello', 'world', 0.8)).toBe(false);
    });

    it('should respect threshold', () => {
      const result1 = engine.fuzzyMatch('hello', 'hallo', 0.9);
      const result2 = engine.fuzzyMatch('hello', 'hallo', 0.7);
      expect(result2).toBe(true);
    });

    it('should return true for exact match', () => {
      expect(engine.fuzzyMatch('hello', 'hello', 1.0)).toBe(true);
    });
  });
});
