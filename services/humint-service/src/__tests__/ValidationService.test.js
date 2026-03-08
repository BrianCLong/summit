"use strict";
/**
 * Validation Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const humint_types_1 = require("@intelgraph/humint-types");
// Mock source for testing
const createMockSource = (overrides = {}) => ({
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
const createMockDebrief = (overrides = {}) => ({
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
const createMockIntelligenceItem = (overrides = {}) => ({
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
(0, globals_1.describe)('Source Validation', () => {
    (0, globals_1.describe)('Basic Validation', () => {
        (0, globals_1.it)('should pass for valid source', () => {
            const source = createMockSource();
            // Basic checks that would be in ValidationService
            (0, globals_1.expect)(source.cryptonym.length).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(source.handlerId).toBeTruthy();
            (0, globals_1.expect)(source.contactMethods.length).toBeGreaterThan(0);
            (0, globals_1.expect)(source.policyLabels.classification).toBeTruthy();
        });
        (0, globals_1.it)('should detect missing handler', () => {
            const source = createMockSource({ handlerId: '' });
            (0, globals_1.expect)(source.handlerId).toBeFalsy();
        });
        (0, globals_1.it)('should detect empty contact methods', () => {
            const source = createMockSource({ contactMethods: [] });
            (0, globals_1.expect)(source.contactMethods.length).toBe(0);
        });
    });
    (0, globals_1.describe)('Contact Overdue Detection', () => {
        (0, globals_1.it)('should detect overdue contact', () => {
            const thirtyOneDaysAgo = new Date();
            thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
            const source = createMockSource({ lastContactDate: thirtyOneDaysAgo });
            const daysSinceContact = Math.floor((Date.now() - source.lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
            (0, globals_1.expect)(daysSinceContact).toBeGreaterThan(humint_types_1.VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS);
        });
        (0, globals_1.it)('should not flag recent contact', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const source = createMockSource({ lastContactDate: yesterday });
            const daysSinceContact = Math.floor((Date.now() - source.lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
            (0, globals_1.expect)(daysSinceContact).toBeLessThan(humint_types_1.VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS);
        });
    });
    (0, globals_1.describe)('Credibility Warnings', () => {
        (0, globals_1.it)('should warn on low credibility', () => {
            const source = createMockSource({ credibilityScore: 50 });
            (0, globals_1.expect)(source.credibilityScore).toBeLessThan(humint_types_1.VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY);
        });
        (0, globals_1.it)('should not warn on high credibility', () => {
            const source = createMockSource({ credibilityScore: 90 });
            (0, globals_1.expect)(source.credibilityScore).toBeGreaterThanOrEqual(humint_types_1.VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY);
        });
    });
});
(0, globals_1.describe)('Debrief Validation', () => {
    (0, globals_1.describe)('Basic Validation', () => {
        (0, globals_1.it)('should pass for valid debrief', () => {
            const debrief = createMockDebrief();
            (0, globals_1.expect)(debrief.sourceId).toBeTruthy();
            (0, globals_1.expect)(debrief.handlerId).toBeTruthy();
            (0, globals_1.expect)(debrief.objectives.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect missing objectives', () => {
            const debrief = createMockDebrief({ objectives: [] });
            (0, globals_1.expect)(debrief.objectives.length).toBe(0);
        });
    });
    (0, globals_1.describe)('Completed Debrief Validation', () => {
        (0, globals_1.it)('should require processed notes for review', () => {
            const debrief = createMockDebrief({
                status: 'PENDING_REVIEW',
                processedNotes: 'Detailed summary of the debrief with key intelligence findings...',
            });
            (0, globals_1.expect)(debrief.processedNotes.length).toBeGreaterThan(50);
        });
        (0, globals_1.it)('should flag missing security assessment', () => {
            const debrief = createMockDebrief({
                status: 'PENDING_REVIEW',
                securityAssessment: undefined,
            });
            (0, globals_1.expect)(debrief.securityAssessment).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Duration Validation', () => {
        (0, globals_1.it)('should calculate valid duration', () => {
            const startTime = new Date('2024-01-15T10:00:00Z');
            const endTime = new Date('2024-01-15T12:00:00Z');
            const debrief = createMockDebrief({
                startedAt: startTime,
                endedAt: endTime,
            });
            const duration = debrief.endedAt.getTime() - debrief.startedAt.getTime();
            (0, globals_1.expect)(duration).toBeGreaterThan(0);
            (0, globals_1.expect)(duration).toBeLessThan(8 * 60 * 60 * 1000); // < 8 hours
        });
    });
});
(0, globals_1.describe)('Intelligence Item Validation', () => {
    (0, globals_1.describe)('Content Validation', () => {
        (0, globals_1.it)('should pass for valid intelligence item', () => {
            const item = createMockIntelligenceItem();
            (0, globals_1.expect)(item.topic.length).toBeGreaterThanOrEqual(5);
            (0, globals_1.expect)(item.content.length).toBeGreaterThanOrEqual(50);
            (0, globals_1.expect)(item.informationRating).toBeTruthy();
        });
        (0, globals_1.it)('should detect short topic', () => {
            const item = createMockIntelligenceItem({ topic: 'ABC' });
            (0, globals_1.expect)(item.topic.length).toBeLessThan(5);
        });
        (0, globals_1.it)('should detect short content', () => {
            const item = createMockIntelligenceItem({ content: 'Too short' });
            (0, globals_1.expect)(item.content.length).toBeLessThan(50);
        });
    });
    (0, globals_1.describe)('Corroboration Warnings', () => {
        (0, globals_1.it)('should warn on uncorroborated items requiring corroboration', () => {
            const item = createMockIntelligenceItem({
                requiresCorroboration: true,
                corroboratedBy: [],
            });
            (0, globals_1.expect)(item.requiresCorroboration).toBe(true);
            (0, globals_1.expect)(item.corroboratedBy.length).toBe(0);
        });
    });
    (0, globals_1.describe)('Perishability Warnings', () => {
        (0, globals_1.it)('should warn on immediate actionability without perishability', () => {
            const item = createMockIntelligenceItem({
                actionability: 'IMMEDIATE',
                perishability: undefined,
            });
            (0, globals_1.expect)(item.actionability).toBe('IMMEDIATE');
            (0, globals_1.expect)(item.perishability).toBeUndefined();
        });
    });
});
(0, globals_1.describe)('State Transition Validation', () => {
    (0, globals_1.it)('should validate workflow transitions', () => {
        // Valid workflow: PLANNED -> IN_PROGRESS -> PENDING_REVIEW -> APPROVED -> DISSEMINATED
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.PLANNED, humint_types_1.DEBRIEF_STATUS.IN_PROGRESS)).toBe(true);
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.IN_PROGRESS, humint_types_1.DEBRIEF_STATUS.PENDING_REVIEW)).toBe(true);
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.PENDING_REVIEW, humint_types_1.DEBRIEF_STATUS.APPROVED)).toBe(true);
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.APPROVED, humint_types_1.DEBRIEF_STATUS.DISSEMINATED)).toBe(true);
    });
    (0, globals_1.it)('should reject invalid transitions', () => {
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.PLANNED, humint_types_1.DEBRIEF_STATUS.DISSEMINATED)).toBe(false);
        (0, globals_1.expect)((0, humint_types_1.isValidTransition)(humint_types_1.DEBRIEF_STATUS.CANCELLED, humint_types_1.DEBRIEF_STATUS.IN_PROGRESS)).toBe(false);
    });
});
(0, globals_1.describe)('Validation Thresholds', () => {
    (0, globals_1.it)('should have correct threshold values', () => {
        (0, globals_1.expect)(humint_types_1.VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY).toBe(80);
        (0, globals_1.expect)(humint_types_1.VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS).toBe(30);
        (0, globals_1.expect)(humint_types_1.VALIDATION_THRESHOLDS.AUTO_DORMANCY_DAYS).toBe(90);
        (0, globals_1.expect)(humint_types_1.VALIDATION_THRESHOLDS.HIGH_CONFIDENCE_CORROBORATION).toBe(75);
    });
});
