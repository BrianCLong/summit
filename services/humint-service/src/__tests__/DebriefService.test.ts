/**
 * Debrief Service Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  CreateDebriefSchema,
  CompleteDebriefSchema,
  ReviewDebriefSchema,
  DebriefSearchCriteriaSchema,
  isValidTransition,
  getAllowedTransitions,
  DEBRIEF_STATUS,
  DEBRIEF_TYPES,
} from '@intelgraph/humint-types';

describe('Debrief Validation Schemas', () => {
  describe('CreateDebriefSchema', () => {
    it('should validate a valid debrief creation input', () => {
      const validInput = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        debriefType: 'SCHEDULED',
        scheduledAt: new Date('2024-12-01T10:00:00Z'),
        location: {
          type: 'SAFE_HOUSE',
          identifier: 'SH-001',
          securityVerified: true,
        },
        objectives: ['Gather intelligence on target organization', 'Assess source access'],
        policyLabels: {
          classification: 'SECRET',
          caveats: [],
          releasableTo: ['USA'],
          originatorControl: false,
          legalBasis: 'EO 12333',
          needToKnow: ['HUMINT'],
          retentionPeriod: 365,
        },
      };

      const result = CreateDebriefSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty objectives', () => {
      const invalidInput = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        debriefType: 'SCHEDULED',
        scheduledAt: new Date(),
        location: {
          type: 'SAFE_HOUSE',
          identifier: 'SH-001',
          securityVerified: false,
        },
        objectives: [],
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

      const result = CreateDebriefSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate location coordinates', () => {
      const validInput = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        debriefType: 'SCHEDULED',
        scheduledAt: new Date(),
        location: {
          type: 'NEUTRAL',
          identifier: 'LOC-001',
          coordinates: {
            latitude: 38.8951,
            longitude: -77.0364,
          },
          securityVerified: true,
        },
        objectives: ['Test objective'],
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

      const result = CreateDebriefSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const invalidInput = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        debriefType: 'SCHEDULED',
        scheduledAt: new Date(),
        location: {
          type: 'NEUTRAL',
          identifier: 'LOC-001',
          coordinates: {
            latitude: 100, // Invalid: > 90
            longitude: -77.0364,
          },
          securityVerified: true,
        },
        objectives: ['Test objective'],
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

      const result = CreateDebriefSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('CompleteDebriefSchema', () => {
    it('should validate complete debrief input', () => {
      const validInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        endedAt: new Date(),
        processedNotes: 'Detailed summary of the debrief session with key findings...',
        intelligenceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            topic: 'Target Organization Structure',
            content: 'Source provided detailed information about the organizational hierarchy...',
            informationRating: '2',
            classification: 'SECRET',
            requiresCorroboration: true,
            corroboratedBy: [],
            linkedEntities: [],
            actionability: 'SHORT_TERM',
            disseminationRestrictions: ['NOFORN'],
          },
        ],
        taskings: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            description: 'Follow up on leadership changes',
            priority: 'HIGH',
            status: 'PENDING',
          },
        ],
        securityAssessment: {
          sourceCompromiseRisk: 'LOW',
          operationalSecurityIssues: [],
          counterintelligenceIndicators: [],
          recommendedMitigations: [],
          evaluatorNotes: 'No immediate concerns identified',
        },
      };

      const result = CompleteDebriefSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require processedNotes', () => {
      const invalidInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        endedAt: new Date(),
        processedNotes: '', // Empty
        intelligenceItems: [],
        taskings: [],
        securityAssessment: {
          sourceCompromiseRisk: 'NONE',
          operationalSecurityIssues: [],
          counterintelligenceIndicators: [],
          recommendedMitigations: [],
          evaluatorNotes: '',
        },
      };

      const result = CompleteDebriefSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('ReviewDebriefSchema', () => {
    it('should validate approval', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
        reviewNotes: 'Approved for dissemination. Quality intel extraction.',
      };

      const result = ReviewDebriefSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate rejection with modifications', () => {
      const input = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        approved: false,
        reviewNotes: 'Requires additional analysis of intel item 2.',
        modifications: {
          intelligenceItems: [],
        },
      };

      const result = ReviewDebriefSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('DebriefSearchCriteriaSchema', () => {
    it('should apply defaults', () => {
      const input = {};
      const result = DebriefSearchCriteriaSchema.parse(input);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should validate date ranges', () => {
      const input = {
        scheduledAfter: new Date('2024-01-01'),
        scheduledBefore: new Date('2024-12-31'),
      };

      const result = DebriefSearchCriteriaSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Debrief State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidTransition('PLANNED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('PLANNED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('IN_PROGRESS', 'PENDING_REVIEW')).toBe(true);
      expect(isValidTransition('PENDING_REVIEW', 'APPROVED')).toBe(true);
      expect(isValidTransition('APPROVED', 'DISSEMINATED')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidTransition('PLANNED', 'APPROVED')).toBe(false);
      expect(isValidTransition('CANCELLED', 'IN_PROGRESS')).toBe(false);
      expect(isValidTransition('DISSEMINATED', 'APPROVED')).toBe(false);
      expect(isValidTransition('IN_PROGRESS', 'DISSEMINATED')).toBe(false);
    });

    it('should allow return to IN_PROGRESS from PENDING_REVIEW', () => {
      expect(isValidTransition('PENDING_REVIEW', 'IN_PROGRESS')).toBe(true);
    });

    it('should allow ACTION_REQUIRED transitions', () => {
      expect(isValidTransition('PENDING_REVIEW', 'ACTION_REQUIRED')).toBe(true);
      expect(isValidTransition('ACTION_REQUIRED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('ACTION_REQUIRED', 'CANCELLED')).toBe(true);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for PLANNED', () => {
      const allowed = getAllowedTransitions('PLANNED');
      expect(allowed).toContain('IN_PROGRESS');
      expect(allowed).toContain('CANCELLED');
      expect(allowed).not.toContain('APPROVED');
    });

    it('should return empty array for terminal states', () => {
      expect(getAllowedTransitions('DISSEMINATED')).toEqual([]);
      expect(getAllowedTransitions('CANCELLED')).toEqual([]);
    });
  });
});

describe('Debrief Constants', () => {
  describe('DEBRIEF_TYPES', () => {
    it('should include all debrief types', () => {
      expect(DEBRIEF_TYPES.SCHEDULED).toBe('SCHEDULED');
      expect(DEBRIEF_TYPES.EMERGENCY).toBe('EMERGENCY');
      expect(DEBRIEF_TYPES.INITIAL).toBe('INITIAL');
      expect(DEBRIEF_TYPES.TASKING).toBe('TASKING');
      expect(DEBRIEF_TYPES.POLYGRAPH).toBe('POLYGRAPH');
    });
  });

  describe('DEBRIEF_STATUS', () => {
    it('should include all status values', () => {
      expect(DEBRIEF_STATUS.PLANNED).toBe('PLANNED');
      expect(DEBRIEF_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(DEBRIEF_STATUS.PENDING_REVIEW).toBe('PENDING_REVIEW');
      expect(DEBRIEF_STATUS.APPROVED).toBe('APPROVED');
      expect(DEBRIEF_STATUS.DISSEMINATED).toBe('DISSEMINATED');
    });
  });
});
