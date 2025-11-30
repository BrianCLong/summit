/**
 * Entity Resolution Service - Classifier Tests
 */

import { describe, it, expect } from '@jest/globals';
import { scoreMatch, decideMatch, DEFAULT_CONFIG } from '../matching/classifier.js';
import { FeatureVector, EntityRecord } from '../domain/EntityRecord.js';

describe('Classifier', () => {
  describe('scoreMatch', () => {
    it('should return high score for exact match features', () => {
      const features: FeatureVector = {
        nameSimilarity: 1.0,
        emailSimilarity: 1.0,
        orgSimilarity: 1.0,
        temporalOverlapScore: 1.0,
        sharedIdentifiersCount: 2,
      };

      const { score, contributions } = scoreMatch(features, DEFAULT_CONFIG);

      expect(score).toBeGreaterThan(0.9);
      expect(contributions).toBeDefined();
      expect(contributions.length).toBeGreaterThan(0);
    });

    it('should return low score for no match features', () => {
      const features: FeatureVector = {
        nameSimilarity: 0.0,
        emailSimilarity: 0.0,
        orgSimilarity: 0.0,
        temporalOverlapScore: 0.0,
        sharedIdentifiersCount: 0,
      };

      const { score } = scoreMatch(features, DEFAULT_CONFIG);

      expect(score).toBeLessThan(0.2);
    });

    it('should handle missing features gracefully', () => {
      const features: FeatureVector = {
        nameSimilarity: 0.9,
        // Other features missing
      };

      const { score, contributions } = scoreMatch(features, DEFAULT_CONFIG);

      expect(score).toBeGreaterThan(0);
      expect(contributions).toBeDefined();
      expect(contributions.some((c) => c.value === null)).toBe(true);
    });

    it('should provide explainability with rationales', () => {
      const features: FeatureVector = {
        nameSimilarity: 0.95,
        emailSimilarity: 1.0,
      };

      const { contributions } = scoreMatch(features, DEFAULT_CONFIG);

      const nameContrib = contributions.find((c) => c.feature === 'nameSimilarity');
      expect(nameContrib).toBeDefined();
      expect(nameContrib?.rationale).toContain('match');
      expect(typeof nameContrib?.contribution).toBe('number');
    });
  });

  describe('decideMatch', () => {
    const recordA: EntityRecord = {
      id: 'A1',
      entityType: 'Person',
      attributes: {
        name: 'John Smith',
        email: 'john.smith@example.com',
      },
    };

    const recordB: EntityRecord = {
      id: 'B1',
      entityType: 'Person',
      attributes: {
        name: 'John Smith',
        email: 'john.smith@example.com',
      },
    };

    it('should recommend MERGE for clear matches', () => {
      const decision = decideMatch(recordA, recordB, DEFAULT_CONFIG);

      expect(decision.outcome).toBe('MERGE');
      expect(decision.matchScore).toBeGreaterThan(DEFAULT_CONFIG.mergeThreshold);
      expect(decision.explanation.summary).toBeDefined();
      expect(decision.explanation.featureContributions).toBeDefined();
    });

    it('should recommend NO_MATCH for clear non-matches', () => {
      const recordC: EntityRecord = {
        id: 'C1',
        entityType: 'Person',
        attributes: {
          name: 'Jane Doe',
          email: 'jane.doe@different.com',
        },
      };

      const decision = decideMatch(recordA, recordC, DEFAULT_CONFIG);

      expect(decision.outcome).toBe('NO_MATCH');
      expect(decision.matchScore).toBeLessThan(DEFAULT_CONFIG.reviewThreshold);
    });

    it('should recommend REVIEW for ambiguous cases', () => {
      const recordD: EntityRecord = {
        id: 'D1',
        entityType: 'Person',
        attributes: {
          name: 'John Smith', // Same name
          email: 'j.smith@different.com', // Different email
        },
      };

      const decision = decideMatch(recordA, recordD, DEFAULT_CONFIG);

      expect(decision.outcome).toBe('REVIEW');
      expect(decision.matchScore).toBeGreaterThan(DEFAULT_CONFIG.reviewThreshold);
      expect(decision.matchScore).toBeLessThan(DEFAULT_CONFIG.mergeThreshold);
    });

    it('should include explanation summary', () => {
      const decision = decideMatch(recordA, recordB, DEFAULT_CONFIG);

      expect(decision.explanation.summary).toBeTruthy();
      expect(decision.explanation.summary).toContain('MERGE');
    });

    it('should set decidedBy field', () => {
      const decision = decideMatch(recordA, recordB, DEFAULT_CONFIG, 'user-123');

      expect(decision.decidedBy).toBe('user-123');
    });

    it('should set decidedAt timestamp', () => {
      const decision = decideMatch(recordA, recordB, DEFAULT_CONFIG);

      expect(decision.decidedAt).toBeDefined();
      expect(new Date(decision.decidedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
