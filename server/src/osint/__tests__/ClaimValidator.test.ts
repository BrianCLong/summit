/**
 * ClaimValidator Service - Test Suite
 * Tests for Automation Turn #5: Source-Independent Validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClaimValidator, ValidationStrategy, ValidationContext } from '../ClaimValidator';
import { Claim, VerificationResult } from '../types';

describe('ClaimValidator', () => {
  let validator: ClaimValidator;

  beforeEach(() => {
    validator = new ClaimValidator();
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

  describe('validate()', () => {
    it('should return claims with updated verification history', async () => {
      const claims = [createClaim()];
      const validated = await validator.validate(claims);

      expect(validated.length).toBe(1);
      expect(validated[0].verificationHistory).toBeDefined();
    });

    it('should preserve original claim properties', async () => {
      const originalClaim = createClaim({
        id: 'claim-original',
        subject: 'original-subject',
        predicate: 'originalPredicate',
        object: { key: 'value' },
      });

      const validated = await validator.validate([originalClaim]);

      expect(validated[0].id).toBe('claim-original');
      expect(validated[0].subject).toBe('original-subject');
      expect(validated[0].predicate).toBe('originalPredicate');
      expect(validated[0].object).toEqual({ key: 'value' });
    });
  });

  describe('Corroboration Strategy', () => {
    it('should increase confidence when multiple sources agree', async () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'entity-1',
          predicate: 'hasName',
          object: 'John Doe',
          confidence: 0.7,
        }),
        createClaim({
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'entity-1',
          predicate: 'hasName',
          object: 'John Doe',
          confidence: 0.7,
        }),
      ];

      const validated = await validator.validate(claims);

      // Both claims should have increased confidence due to corroboration
      expect(validated[0].confidence).toBeGreaterThan(0.7);
      expect(validated[1].confidence).toBeGreaterThan(0.7);

      // Check verification history
      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'corroboration'
      );
      expect(verification?.status).toBe('confirmed');
      expect(verification?.confidenceDelta).toBeGreaterThan(0);
    });

    it('should decrease confidence when sources conflict', async () => {
      const claims = [
        createClaim({
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'entity-1',
          predicate: 'hasName',
          object: 'John Doe',
          confidence: 0.8,
        }),
        createClaim({
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'entity-1',
          predicate: 'hasName',
          object: 'Jane Doe',
          confidence: 0.8,
        }),
      ];

      const validated = await validator.validate(claims);

      // Claims should have decreased confidence due to conflict
      expect(validated[0].confidence).toBeLessThan(0.8);
      expect(validated[1].confidence).toBeLessThan(0.8);

      // Check verification history
      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'corroboration'
      );
      expect(verification?.status).toBe('refuted');
    });

    it('should mark as uncertain when no corroborating sources exist', async () => {
      const claims = [createClaim({ sourceId: 'sole-source' })];
      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'corroboration'
      );
      expect(verification?.status).toBe('uncertain');
      expect(verification?.confidenceDelta).toBe(0);
    });
  });

  describe('Temporal Consistency Strategy', () => {
    it('should confirm claims with valid temporal bounds', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const claims = [
        createClaim({
          validFrom: yesterday.toISOString(),
          validTo: tomorrow.toISOString(),
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'temporal-consistency'
      );
      expect(verification?.status).toBe('confirmed');
    });

    it('should mark claims as uncertain when expired', async () => {
      const past = new Date('2020-01-01');
      const pastEnd = new Date('2020-12-31');

      const claims = [
        createClaim({
          validFrom: past.toISOString(),
          validTo: pastEnd.toISOString(),
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'temporal-consistency'
      );
      expect(verification?.status).toBe('uncertain');
      expect(verification?.confidenceDelta).toBeLessThan(0);
    });

    it('should refute claims with invalid temporal range', async () => {
      const claims = [
        createClaim({
          validFrom: '2026-12-31T00:00:00Z',
          validTo: '2026-01-01T00:00:00Z', // validTo before validFrom
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'temporal-consistency'
      );
      expect(verification?.status).toBe('refuted');
      expect(verification?.evidence).toContain('Invalid temporal range: validFrom > validTo');
    });
  });

  describe('Semantic Plausibility Strategy', () => {
    it('should confirm valid follower counts', async () => {
      const claims = [
        createClaim({
          predicate: 'hasFollowerCount',
          object: 50000,
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'semantic-plausibility'
      );
      expect(verification?.status).toBe('confirmed');
    });

    it('should refute implausible follower counts', async () => {
      const claims = [
        createClaim({
          predicate: 'hasFollowerCount',
          object: -100, // Negative followers
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'semantic-plausibility'
      );
      expect(verification?.status).toBe('refuted');
      expect(verification?.confidenceDelta).toBeLessThan(0);
    });

    it('should refute billion+ follower counts', async () => {
      const claims = [
        createClaim({
          predicate: 'hasFollowerCount',
          object: 2000000000, // 2 billion - implausible
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'semantic-plausibility'
      );
      expect(verification?.status).toBe('refuted');
    });

    it('should confirm valid status values', async () => {
      const claims = [
        createClaim({
          predicate: 'hasStatus',
          object: 'active',
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'semantic-plausibility'
      );
      expect(verification?.status).toBe('confirmed');
    });

    it('should refute invalid status values', async () => {
      const claims = [
        createClaim({
          predicate: 'hasStatus',
          object: 'unknown-status',
        }),
      ];

      const validated = await validator.validate(claims);

      const verification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'semantic-plausibility'
      );
      expect(verification?.status).toBe('refuted');
    });
  });

  describe('Confidence Bounds', () => {
    it('should not exceed confidence of 1.0', async () => {
      // Create many corroborating claims
      const claims = Array.from({ length: 20 }, (_, i) =>
        createClaim({
          id: `claim-${i}`,
          sourceId: `source-${i}`,
          subject: 'entity-1',
          predicate: 'hasName',
          object: 'John Doe',
          confidence: 0.95,
        })
      );

      const validated = await validator.validate(claims);

      for (const claim of validated) {
        expect(claim.confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it('should not go below confidence of 0.0', async () => {
      // Create conflicting claims with low initial confidence
      const claims = Array.from({ length: 10 }, (_, i) =>
        createClaim({
          id: `claim-${i}`,
          sourceId: `source-${i}`,
          subject: 'entity-1',
          predicate: 'hasName',
          object: `Name-${i}`, // All different values
          confidence: 0.1,
        })
      );

      const validated = await validator.validate(claims);

      for (const claim of validated) {
        expect(claim.confidence).toBeGreaterThanOrEqual(0.0);
      }
    });
  });

  describe('Custom Strategy Registration', () => {
    it('should allow registering custom validation strategies', async () => {
      const customStrategy: ValidationStrategy = {
        id: 'custom-strategy',
        name: 'Custom Test Strategy',
        canValidate: () => true,
        validate: async () => ({
          verifierId: 'custom-strategy',
          timestamp: new Date().toISOString(),
          status: 'confirmed' as const,
          confidenceDelta: 0.05,
          evidence: ['Custom validation passed'],
        }),
      };

      validator.registerStrategy(customStrategy);

      const claims = [createClaim()];
      const validated = await validator.validate(claims);

      const customVerification = validated[0].verificationHistory?.find(
        v => v.verifierId === 'custom-strategy'
      );
      expect(customVerification).toBeDefined();
      expect(customVerification?.status).toBe('confirmed');
    });
  });
});
