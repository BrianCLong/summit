import { describe, it, expect } from '@jest/globals';
import {
  tokenize,
  jaccardSimilarity,
  normalizedLevenshtein,
  phoneticSignature,
  extractFeatures,
} from '../../src/core/features';
import type { EntityRecord } from '../../src/types';

describe('Feature Extraction', () => {
  describe('tokenize', () => {
    it('should tokenize text correctly', () => {
      expect(tokenize('John Michael Smith')).toEqual(['john', 'michael', 'smith']);
      expect(tokenize('ACME Corp.')).toEqual(['acme', 'corp']);
      expect(tokenize('test-123')).toEqual(['test', '123']);
    });

    it('should handle empty strings', () => {
      expect(tokenize('')).toEqual([]);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should calculate Jaccard similarity correctly', () => {
      const a = ['john', 'smith'];
      const b = ['john', 'smith'];
      expect(jaccardSimilarity(a, b)).toBe(1);
    });

    it('should handle partial overlap', () => {
      const a = ['john', 'michael', 'smith'];
      const b = ['john', 'smith', 'jr'];
      const similarity = jaccardSimilarity(a, b);
      expect(similarity).toBeCloseTo(0.5, 1); // 2 common / 4 total
    });

    it('should return 0 for no overlap', () => {
      const a = ['john', 'smith'];
      const b = ['jane', 'doe'];
      expect(jaccardSimilarity(a, b)).toBe(0);
    });
  });

  describe('normalizedLevenshtein', () => {
    it('should return 1 for identical strings', () => {
      expect(normalizedLevenshtein('john', 'john')).toBe(1);
    });

    it('should calculate distance for similar strings', () => {
      const similarity = normalizedLevenshtein('john', 'jon');
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should calculate distance for different strings', () => {
      const similarity = normalizedLevenshtein('john', 'jane');
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('phoneticSignature', () => {
    it('should generate phonetic signature', () => {
      expect(phoneticSignature('Smith')).toBe('ssmt');
      expect(phoneticSignature('Smyth')).toBe('ssmy');
    });

    it('should handle empty strings', () => {
      expect(phoneticSignature('')).toBe('');
    });
  });

  describe('extractFeatures', () => {
    const entityA: EntityRecord = {
      id: 'e1',
      type: 'person',
      name: 'John Smith',
      tenantId: 'test',
      attributes: { email: 'john@example.com', age: 30 },
      deviceIds: ['device-1', 'device-2'],
      accountIds: ['acct-1'],
    };

    const entityB: EntityRecord = {
      id: 'e2',
      type: 'person',
      name: 'Jon Smith',
      tenantId: 'test',
      attributes: { email: 'john@example.com', age: 30 },
      deviceIds: ['device-1'],
      accountIds: ['acct-1'],
    };

    it('should extract all features', () => {
      const features = extractFeatures(entityA, entityB);

      expect(features.nameSimilarity).toBeGreaterThan(0.8);
      expect(features.typeMatch).toBe(true);
      expect(features.semanticSimilarity).toBeGreaterThan(0);
      expect(features.deviceIdMatch).toBeGreaterThan(0);
      expect(features.accountIdMatch).toBeGreaterThan(0);
    });

    it('should detect type mismatch', () => {
      const entityC = { ...entityB, type: 'organization' };
      const features = extractFeatures(entityA, entityC);
      expect(features.typeMatch).toBe(false);
    });

    it('should calculate device ID overlap', () => {
      const features = extractFeatures(entityA, entityB);
      expect(features.deviceIdMatch).toBeGreaterThan(0.3); // Jaccard: 1/3
    });
  });
});
