/**
 * ContradictionDetector Service - Test Suite
 * Tests for Automation Turn #5: Contradiction Detection
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContradictionDetector, ContradictionRule } from '../ContradictionDetector.js';
import { Claim, Contradiction } from '../types.js';

describe('ContradictionDetector', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
  });

  const createClaim = (overrides: Partial<Claim> = {}): Claim => ({
    id: `claim-${Math.random().toString(36).substr(2, 9)}`,
    sourceId: 'test-source',
    subject: 'test-subject',
    predicate: 'testPredicate',
    object: 'test-value',
    confidence: 0.8,
    timestamp: new Date().toISOString(),
    verificationHistory: [],
    ...overrides,
  });

  describe('detect()', () => {
    it('should return empty array for empty input', () => {
      const contradictions = detector.detect([]);
      expect(contradictions).toEqual([]);
    });

    it('should return empty array for single claim', () => {
      const claims = [createClaim()];
      const contradictions = detector.detect(claims);
      expect(contradictions).toEqual([]);
    });

    it('should not detect contradictions for claims about different subjects', () => {
      const claims = [
        createClaim({ subject: 'entity-1', object: 'value-1' }),
        createClaim({ subject: 'entity-2', object: 'value-2' }),
      ];
      const contradictions = detector.detect(claims);
      expect(contradictions).toEqual([]);
    });

    it('should not detect contradictions for claims with different predicates', () => {
      const claims = [
        createClaim({ subject: 'entity-1', predicate: 'hasName', object: 'John' }),
        createClaim({ subject: 'entity-1', predicate: 'hasEmail', object: 'john@example.com' }),
      ];
      const contradictions = detector.detect(claims);
      expect(contradictions).toEqual([]);
    });

    it('should not detect contradictions for matching values', () => {
      const claims = [
        createClaim({ id: 'c1', subject: 'entity-1', predicate: 'hasName', object: 'John' }),
        createClaim({ id: 'c2', subject: 'entity-1', predicate: 'hasName', object: 'John' }),
      ];
      const contradictions = detector.detect(claims);
      expect(contradictions).toEqual([]);
    });
  });

  describe('Temporal Overlap Rule', () => {
    it('should detect contradictions for temporally overlapping claims with different values', () => {
      // Use a predicate that doesn't trigger MutualExclusionRule to test TemporalOverlapRule in isolation
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasLocation',
          object: 'London',
          validFrom: '2025-01-01',
          validTo: '2025-12-31',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasLocation',
          object: 'Paris',
          validFrom: '2025-06-01',
          validTo: '2025-12-31',
        }),
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].claimIdA).toBe('claim-1');
      expect(contradictions[0].claimIdB).toBe('claim-2');
      expect(contradictions[0].reason).toContain('Temporal Overlap');
      expect(contradictions[0].severity).toBe('high');
    });

    it('should not detect contradictions for non-overlapping time periods', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'active',
          validFrom: '2020-01-01',
          validTo: '2020-12-31',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'dissolved',
          validFrom: '2021-01-01',
          validTo: '2021-12-31',
        }),
      ];

      const contradictions = detector.detect(claims);
      expect(contradictions.length).toBe(0);
    });
  });

  describe('Mutual Exclusion Rule', () => {
    it('should detect contradictions for mutually exclusive status values', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'active',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'dissolved',
        }),
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      const mutualExclusion = contradictions.find(c => c.reason.includes('Mutual Exclusion'));
      expect(mutualExclusion).toBeDefined();
      expect(mutualExclusion?.severity).toBe('high');
    });

    it('should detect active vs inactive exclusion', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'active',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'inactive',
        }),
      ];

      const contradictions = detector.detect(claims);

      const mutualExclusion = contradictions.find(c => c.reason.includes('Mutual Exclusion'));
      expect(mutualExclusion).toBeDefined();
    });
  });

  describe('Numeric Range Rule', () => {
    it('should detect significant numeric discrepancies', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'user-1',
          predicate: 'hasFollowerCount',
          object: 10000,
        }),
        createClaim({
          id: 'claim-2',
          subject: 'user-1',
          predicate: 'hasFollowerCount',
          object: 50000, // 400% difference
        }),
      ];

      const contradictions = detector.detect(claims);

      const numericRule = contradictions.find(c => c.reason.includes('Numeric Discrepancy'));
      expect(numericRule).toBeDefined();
    });

    it('should not detect contradictions within tolerance', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'user-1',
          predicate: 'hasFollowerCount',
          object: 10000,
        }),
        createClaim({
          id: 'claim-2',
          subject: 'user-1',
          predicate: 'hasFollowerCount',
          object: 10500, // 5% difference, within 10% tolerance
        }),
      ];

      const contradictions = detector.detect(claims);

      const numericRule = contradictions.find(c => c.reason.includes('Numeric Discrepancy'));
      expect(numericRule).toBeUndefined();
    });
  });

  describe('Status Transition Rule', () => {
    it('should detect invalid status transitions', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'dissolved',
          validFrom: '2024-01-01',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'active', // Cannot transition from dissolved to active
          validFrom: '2025-01-01',
        }),
      ];

      const contradictions = detector.detect(claims);

      const transitionRule = contradictions.find(c => c.reason.includes('Invalid Status Transition'));
      expect(transitionRule).toBeDefined();
      expect(transitionRule?.severity).toBe('high');
    });

    it('should allow valid status transitions', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'active',
          validFrom: '2024-01-01',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'company-1',
          predicate: 'hasStatus',
          object: 'inactive',
          validFrom: '2025-01-01',
        }),
      ];

      const contradictions = detector.detect(claims);

      const transitionRule = contradictions.find(c => c.reason.includes('Invalid Status Transition'));
      expect(transitionRule).toBeUndefined();
    });
  });

  describe('detectForClaim()', () => {
    it('should detect contradictions between new claim and existing claims', () => {
      const existingClaims = [
        createClaim({
          id: 'existing-1',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'active',
        }),
      ];

      const newClaim = createClaim({
        id: 'new-1',
        subject: 'entity-1',
        predicate: 'hasStatus',
        object: 'dissolved',
      });

      const contradictions = detector.detectForClaim(newClaim, existingClaims);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].claimIdA).toBe('new-1');
      expect(contradictions[0].claimIdB).toBe('existing-1');
    });

    it('should skip self-comparison', () => {
      const claim = createClaim({ id: 'same-claim' });
      const contradictions = detector.detectForClaim(claim, [claim]);
      expect(contradictions).toEqual([]);
    });
  });

  describe('Contradiction Structure', () => {
    it('should include all required contradiction fields', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'active',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'dissolved',
        }),
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      for (const contradiction of contradictions) {
        expect(contradiction.id).toBeDefined();
        expect(contradiction.id.startsWith('contradiction-')).toBe(true);
        expect(contradiction.claimIdA).toBeDefined();
        expect(contradiction.claimIdB).toBeDefined();
        expect(contradiction.reason).toBeDefined();
        expect(contradiction.detectedAt).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(contradiction.severity);
      }
    });

    it('should generate consistent IDs for same claim pair', () => {
      const claims = [
        createClaim({
          id: 'claim-a',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'active',
        }),
        createClaim({
          id: 'claim-b',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'dissolved',
        }),
      ];

      const contradictions1 = detector.detect(claims);
      const contradictions2 = detector.detect([...claims].reverse());

      // Same pair should generate same contradiction IDs
      const ids1 = new Set(contradictions1.map(c => c.id));
      const ids2 = new Set(contradictions2.map(c => c.id));

      expect(ids1).toEqual(ids2);
    });
  });

  describe('Custom Rule Registration', () => {
    it('should allow registering custom contradiction rules', () => {
      const customRule: ContradictionRule = {
        id: 'custom-rule',
        name: 'Custom Test Rule',
        detect: (claimA, claimB) => {
          if (claimA.predicate === 'customTest' && claimA.object !== claimB.object) {
            return { reason: 'Custom contradiction detected', severity: 'medium' };
          }
          return null;
        },
      };

      detector.registerRule(customRule);

      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'entity-1',
          predicate: 'customTest',
          object: 'value-a',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'entity-1',
          predicate: 'customTest',
          object: 'value-b',
        }),
      ];

      const contradictions = detector.detect(claims);

      const customContradiction = contradictions.find(c => c.reason.includes('Custom Test Rule'));
      expect(customContradiction).toBeDefined();
      expect(customContradiction?.severity).toBe('medium');
    });
  });

  describe('Deduplication', () => {
    it('should not produce duplicate contradictions', () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'active',
          validFrom: '2025-01-01',
          validTo: '2025-12-31',
        }),
        createClaim({
          id: 'claim-2',
          subject: 'entity-1',
          predicate: 'hasStatus',
          object: 'dissolved',
          validFrom: '2025-06-01',
          validTo: '2025-12-31',
        }),
      ];

      const contradictions = detector.detect(claims);
      const ids = contradictions.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
