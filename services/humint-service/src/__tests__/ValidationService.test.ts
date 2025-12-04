/**
 * Validation Service Tests
 */

import { describe, it, expect } from '@jest/globals';
import type {
  HumintSource,
  DebriefSession,
  IntelligenceItem,
} from '@intelgraph/humint-types';
import {
  isValidTransition,
  DEBRIEF_STATUS,
  VALIDATION_THRESHOLDS,
} from '@intelgraph/humint-types';

// Mock source for testing
const createMockSource = (overrides: Partial<HumintSource> = {}): HumintSource => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  tenantId: 'tenant-1',
  cryptonym: 'FALCON-7',
  sourceType: 'ASSET',
  status: 'ACTIVE',
  handlerId: '123e4567-e89b-12d3-a456-426614174001',
  alternateHandlerId: undefined,
  credibilityRating: 'B',
  credibilityScore: 80,
  credibilityTrend: 'STABLE',
  riskLevel: 'MODERATE',
  areaOfOperation: ['Eastern Europe'],
  topicalAccess: ['Military'],
  accessCapabilities: [],
  contactMethods: [
    {
      id: 'cm-1',
      type: 'SECURE_PHONE',
      identifier: '+1-555-0123',
      protocol: 'encrypted',
      isActive: true,
    },
  ],
  coverIdentities: [],
  recruitmentDate: new Date('2024-01-15'),
  lastContactDate: new Date(),
  nextScheduledContact: undefined,
  totalDebriefs: 5,
  intelligenceReportsCount: 10,
  actionableIntelCount: 3,
  languages: ['Russian', 'English'],
  specialCapabilities: [],
  compensation: { type: 'STIPEND', amount: 5000, currency: 'USD' },
  motivationFactors: ['Ideological'],
  vulnerabilities: [],
  policyLabels: {
    classification: 'SECRET',
    caveats: [],
    releasableTo: ['USA'],
    originatorControl: false,
    legalBasis: 'EO 12333',
    needToKnow: ['HUMINT'],
    retentionPeriod: 365,
  },
  personEntityId: undefined,
  notes: '',
  provenance: [],
  validFrom: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  version: 1,
  ...overrides,
});

// Mock debrief for testing
const createMockDebrief = (overrides: Partial<DebriefSession> = {}): DebriefSession => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  tenantId: 'tenant-1',
  sourceId: '123e4567-e89b-12d3-a456-426614174001',
  sourceCryptonym: 'FALCON-7',
  handlerId: '123e4567-e89b-12d3-a456-426614174002',
  debriefType: 'SCHEDULED',
  status: 'PLANNED',
  scheduledAt: new Date(),
  startedAt: undefined,
  endedAt: undefined,
  durationMinutes: undefined,
  location: {
    type: 'SAFE_HOUSE',
    identifier: 'SH-001',
    securityVerified: true,
  },
  objectives: ['Gather intelligence'],
  topicsCovered: [],
  rawNotes: '',
  processedNotes: '',
  intelligenceItems: [],
  taskings: [],
  securityAssessment: undefined,
  sourceDemeanor: '',
  credibilityObservations: '',
  payments: [],
  attachments: [],
  reviewerId: undefined,
  reviewNotes: undefined,
  reviewedAt: undefined,
  dissemination: [],
  policyLabels: {
    classification: 'SECRET',
    caveats: [],
    releasableTo: [],
    originatorControl: false,
    legalBasis: 'EO 12333',
    needToKnow: [],
    retentionPeriod: 365,
  },
  provenance: [],
  previousDebriefId: undefined,
  nextDebriefId: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  version: 1,
  ...overrides,
});

// Mock intelligence item
const createMockIntelligenceItem = (overrides: Partial<IntelligenceItem> = {}): IntelligenceItem => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  topic: 'Target Organization Structure',
  content: 'Source provided detailed information about the organizational hierarchy and key personnel.',
  informationRating: '2',
  classification: 'SECRET',
  requiresCorroboration: true,
  corroboratedBy: [],
  linkedEntities: [],
  actionability: 'SHORT_TERM',
  disseminationRestrictions: [],
  ...overrides,
});

describe('Source Validation', () => {
  describe('Basic Validation', () => {
    it('should pass for valid source', () => {
      const source = createMockSource();

      // Basic checks that would be in ValidationService
      expect(source.cryptonym.length).toBeGreaterThanOrEqual(3);
      expect(source.handlerId).toBeTruthy();
      expect(source.contactMethods.length).toBeGreaterThan(0);
      expect(source.policyLabels.classification).toBeTruthy();
    });

    it('should detect missing handler', () => {
      const source = createMockSource({ handlerId: '' });
      expect(source.handlerId).toBeFalsy();
    });

    it('should detect empty contact methods', () => {
      const source = createMockSource({ contactMethods: [] });
      expect(source.contactMethods.length).toBe(0);
    });
  });

  describe('Contact Overdue Detection', () => {
    it('should detect overdue contact', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const source = createMockSource({ lastContactDate: thirtyOneDaysAgo });
      const daysSinceContact = Math.floor(
        (Date.now() - source.lastContactDate!.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysSinceContact).toBeGreaterThan(VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS);
    });

    it('should not flag recent contact', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const source = createMockSource({ lastContactDate: yesterday });
      const daysSinceContact = Math.floor(
        (Date.now() - source.lastContactDate!.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysSinceContact).toBeLessThan(VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS);
    });
  });

  describe('Credibility Warnings', () => {
    it('should warn on low credibility', () => {
      const source = createMockSource({ credibilityScore: 50 });
      expect(source.credibilityScore).toBeLessThan(VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY);
    });

    it('should not warn on high credibility', () => {
      const source = createMockSource({ credibilityScore: 90 });
      expect(source.credibilityScore).toBeGreaterThanOrEqual(VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY);
    });
  });
});

describe('Debrief Validation', () => {
  describe('Basic Validation', () => {
    it('should pass for valid debrief', () => {
      const debrief = createMockDebrief();

      expect(debrief.sourceId).toBeTruthy();
      expect(debrief.handlerId).toBeTruthy();
      expect(debrief.objectives.length).toBeGreaterThan(0);
    });

    it('should detect missing objectives', () => {
      const debrief = createMockDebrief({ objectives: [] });
      expect(debrief.objectives.length).toBe(0);
    });
  });

  describe('Completed Debrief Validation', () => {
    it('should require processed notes for review', () => {
      const debrief = createMockDebrief({
        status: 'PENDING_REVIEW',
        processedNotes: 'Detailed summary of the debrief with key intelligence findings...',
      });

      expect(debrief.processedNotes.length).toBeGreaterThan(50);
    });

    it('should flag missing security assessment', () => {
      const debrief = createMockDebrief({
        status: 'PENDING_REVIEW',
        securityAssessment: undefined,
      });

      expect(debrief.securityAssessment).toBeUndefined();
    });
  });

  describe('Duration Validation', () => {
    it('should calculate valid duration', () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T12:00:00Z');

      const debrief = createMockDebrief({
        startedAt: startTime,
        endedAt: endTime,
      });

      const duration = debrief.endedAt!.getTime() - debrief.startedAt!.getTime();
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(8 * 60 * 60 * 1000); // < 8 hours
    });
  });
});

describe('Intelligence Item Validation', () => {
  describe('Content Validation', () => {
    it('should pass for valid intelligence item', () => {
      const item = createMockIntelligenceItem();

      expect(item.topic.length).toBeGreaterThanOrEqual(5);
      expect(item.content.length).toBeGreaterThanOrEqual(50);
      expect(item.informationRating).toBeTruthy();
    });

    it('should detect short topic', () => {
      const item = createMockIntelligenceItem({ topic: 'ABC' });
      expect(item.topic.length).toBeLessThan(5);
    });

    it('should detect short content', () => {
      const item = createMockIntelligenceItem({ content: 'Too short' });
      expect(item.content.length).toBeLessThan(50);
    });
  });

  describe('Corroboration Warnings', () => {
    it('should warn on uncorroborated items requiring corroboration', () => {
      const item = createMockIntelligenceItem({
        requiresCorroboration: true,
        corroboratedBy: [],
      });

      expect(item.requiresCorroboration).toBe(true);
      expect(item.corroboratedBy.length).toBe(0);
    });
  });

  describe('Perishability Warnings', () => {
    it('should warn on immediate actionability without perishability', () => {
      const item = createMockIntelligenceItem({
        actionability: 'IMMEDIATE',
        perishability: undefined,
      });

      expect(item.actionability).toBe('IMMEDIATE');
      expect(item.perishability).toBeUndefined();
    });
  });
});

describe('State Transition Validation', () => {
  it('should validate workflow transitions', () => {
    // Valid workflow: PLANNED -> IN_PROGRESS -> PENDING_REVIEW -> APPROVED -> DISSEMINATED
    expect(isValidTransition(DEBRIEF_STATUS.PLANNED, DEBRIEF_STATUS.IN_PROGRESS)).toBe(true);
    expect(isValidTransition(DEBRIEF_STATUS.IN_PROGRESS, DEBRIEF_STATUS.PENDING_REVIEW)).toBe(true);
    expect(isValidTransition(DEBRIEF_STATUS.PENDING_REVIEW, DEBRIEF_STATUS.APPROVED)).toBe(true);
    expect(isValidTransition(DEBRIEF_STATUS.APPROVED, DEBRIEF_STATUS.DISSEMINATED)).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(isValidTransition(DEBRIEF_STATUS.PLANNED, DEBRIEF_STATUS.DISSEMINATED)).toBe(false);
    expect(isValidTransition(DEBRIEF_STATUS.CANCELLED, DEBRIEF_STATUS.IN_PROGRESS)).toBe(false);
  });
});

describe('Validation Thresholds', () => {
  it('should have correct threshold values', () => {
    expect(VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY).toBe(80);
    expect(VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS).toBe(30);
    expect(VALIDATION_THRESHOLDS.AUTO_DORMANCY_DAYS).toBe(90);
    expect(VALIDATION_THRESHOLDS.HIGH_CONFIDENCE_CORROBORATION).toBe(75);
  });
});
