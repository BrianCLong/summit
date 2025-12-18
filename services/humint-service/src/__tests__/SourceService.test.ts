/**
 * Source Service Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  CreateSourceSchema,
  UpdateSourceSchema,
  SourceSearchCriteriaSchema,
  validateCryptonym,
  calculateCredibilityScore,
  isContactOverdue,
  CREDIBILITY_RATINGS,
  SOURCE_STATUS,
  SOURCE_TYPES,
} from '@intelgraph/humint-types';

describe('Source Validation Schemas', () => {
  describe('CreateSourceSchema', () => {
    it('should validate a valid source creation input', () => {
      const validInput = {
        cryptonym: 'FALCON-7',
        sourceType: 'ASSET',
        handlerId: '123e4567-e89b-12d3-a456-426614174000',
        credibilityRating: 'C',
        riskLevel: 'MODERATE',
        areaOfOperation: ['Eastern Europe', 'Middle East'],
        topicalAccess: ['Military', 'Political'],
        recruitmentDate: new Date('2024-01-15'),
        languages: ['Russian', 'Arabic'],
        motivationFactors: ['Ideological', 'Financial'],
        contactMethods: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'SECURE_PHONE',
            identifier: '+1-555-0123',
            protocol: 'encrypted',
            isActive: true,
          },
        ],
        compensation: {
          type: 'STIPEND',
          amount: 5000,
          currency: 'USD',
        },
        policyLabels: {
          classification: 'SECRET',
          caveats: [],
          releasableTo: ['USA'],
          originatorControl: true,
          legalBasis: 'EO 12333',
          needToKnow: ['HUMINT'],
          retentionPeriod: 365,
        },
        notes: 'Initial assessment positive',
      };

      const result = CreateSourceSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid cryptonym format', () => {
      const invalidInput = {
        cryptonym: 'invalid-lowercase',
        sourceType: 'ASSET',
        handlerId: '123e4567-e89b-12d3-a456-426614174000',
        areaOfOperation: ['Test'],
        recruitmentDate: new Date(),
        languages: ['English'],
        motivationFactors: ['Test'],
        contactMethods: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'IN_PERSON',
            identifier: 'test',
            protocol: 'standard',
            isActive: true,
          },
        ],
        compensation: { type: 'NONE' },
        policyLabels: {
          classification: 'SECRET',
          caveats: [],
          releasableTo: [],
          originatorControl: false,
          legalBasis: 'EO 12333',
          needToKnow: [],
          retentionPeriod: 365,
        },
      };

      const result = CreateSourceSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty contact methods', () => {
      const invalidInput = {
        cryptonym: 'FALCON-7',
        sourceType: 'ASSET',
        handlerId: '123e4567-e89b-12d3-a456-426614174000',
        areaOfOperation: ['Test'],
        recruitmentDate: new Date(),
        languages: ['English'],
        motivationFactors: ['Test'],
        contactMethods: [],
        compensation: { type: 'NONE' },
        policyLabels: {
          classification: 'SECRET',
          caveats: [],
          releasableTo: [],
          originatorControl: false,
          legalBasis: 'EO 12333',
          needToKnow: [],
          retentionPeriod: 365,
        },
      };

      const result = CreateSourceSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('SourceSearchCriteriaSchema', () => {
    it('should apply default values', () => {
      const input = {};
      const result = SourceSearchCriteriaSchema.parse(input);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should validate filter arrays', () => {
      const input = {
        sourceTypes: ['ASSET', 'LIAISON'],
        statuses: ['ACTIVE', 'DEVELOPMENTAL'],
        riskLevels: ['HIGH', 'CRITICAL'],
      };

      const result = SourceSearchCriteriaSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should enforce max limit', () => {
      const input = { limit: 500 };
      const result = SourceSearchCriteriaSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Source Validation Helpers', () => {
  describe('validateCryptonym', () => {
    it('should accept valid cryptonyms', () => {
      expect(validateCryptonym('FALCON-7')).toBe(true);
      expect(validateCryptonym('ALPHA_BRAVO')).toBe(true);
      expect(validateCryptonym('X1')).toBe(false); // Too short
      expect(validateCryptonym('ABC')).toBe(true);
    });

    it('should reject invalid cryptonyms', () => {
      expect(validateCryptonym('falcon-7')).toBe(false); // lowercase
      expect(validateCryptonym('123ABC')).toBe(false); // starts with number
      expect(validateCryptonym('AB')).toBe(false); // too short
      expect(validateCryptonym('')).toBe(false);
    });
  });

  describe('calculateCredibilityScore', () => {
    it('should calculate weighted score correctly', () => {
      // Source A (100) + Info 1 (100) + 100% corroboration
      const score1 = calculateCredibilityScore('A', '1', 100);
      expect(score1).toBe(100);

      // Source C (60) + Info 3 (60) + 50% corroboration
      const score2 = calculateCredibilityScore('C', '3', 50);
      expect(score2).toBe(58); // 60*0.4 + 60*0.4 + 50*0.2

      // Source F (0) + Info 6 (0) + 0% corroboration
      const score3 = calculateCredibilityScore('F', '6', 0);
      expect(score3).toBe(0);
    });
  });

  describe('isContactOverdue', () => {
    it('should return true for null date', () => {
      expect(isContactOverdue(undefined)).toBe(true);
    });

    it('should detect overdue contacts', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      expect(isContactOverdue(thirtyOneDaysAgo, 30)).toBe(true);
    });

    it('should return false for recent contacts', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isContactOverdue(yesterday, 30)).toBe(false);
    });
  });
});

describe('Constants', () => {
  describe('CREDIBILITY_RATINGS', () => {
    it('should have correct scores', () => {
      expect(CREDIBILITY_RATINGS.A.score).toBe(100);
      expect(CREDIBILITY_RATINGS.B.score).toBe(80);
      expect(CREDIBILITY_RATINGS.C.score).toBe(60);
      expect(CREDIBILITY_RATINGS.D.score).toBe(40);
      expect(CREDIBILITY_RATINGS.E.score).toBe(20);
      expect(CREDIBILITY_RATINGS.F.score).toBe(0);
    });
  });

  describe('SOURCE_TYPES', () => {
    it('should include all standard types', () => {
      expect(SOURCE_TYPES.ASSET).toBe('ASSET');
      expect(SOURCE_TYPES.LIAISON).toBe('LIAISON');
      expect(SOURCE_TYPES.WALK_IN).toBe('WALK_IN');
      expect(SOURCE_TYPES.DEFECTOR).toBe('DEFECTOR');
    });
  });

  describe('SOURCE_STATUS', () => {
    it('should include all status values', () => {
      expect(SOURCE_STATUS.ACTIVE).toBe('ACTIVE');
      expect(SOURCE_STATUS.DORMANT).toBe('DORMANT');
      expect(SOURCE_STATUS.TERMINATED).toBe('TERMINATED');
      expect(SOURCE_STATUS.COMPROMISED).toBe('COMPROMISED');
    });
  });
});
