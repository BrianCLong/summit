"use strict";
/**
 * Debrief Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const humint_types_1 = require("@intelgraph/humint-types");
(0, globals_1.describe)('Debrief Validation Schemas', () => {
    (0, globals_1.describe)('CreateDebriefSchema', () => {
        (0, globals_1.it)('should validate a valid debrief creation input', () => {
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
            const result = humint_types_1.CreateDebriefSchema.safeParse(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject empty objectives', () => {
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
            const result = humint_types_1.CreateDebriefSchema.safeParse(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('should validate location coordinates', () => {
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
            const result = humint_types_1.CreateDebriefSchema.safeParse(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid coordinates', () => {
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
            const result = humint_types_1.CreateDebriefSchema.safeParse(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('CompleteDebriefSchema', () => {
        (0, globals_1.it)('should validate complete debrief input', () => {
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
            const result = humint_types_1.CompleteDebriefSchema.safeParse(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should require processedNotes', () => {
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
            const result = humint_types_1.CompleteDebriefSchema.safeParse(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('ReviewDebriefSchema', () => {
        (0, globals_1.it)('should validate approval', () => {
            const input = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                approved: true,
                reviewNotes: 'Approved for dissemination. Quality intel extraction.',
            };
            const result = humint_types_1.ReviewDebriefSchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should validate rejection with modifications', () => {
            const input = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                approved: false,
                reviewNotes: 'Requires additional analysis of intel item 2.',
                modifications: {
                    intelligenceItems: [],
                },
            };
            const result = humint_types_1.ReviewDebriefSchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
    (0, globals_1.describe)('DebriefSearchCriteriaSchema', () => {
        (0, globals_1.it)('should apply defaults', () => {
            const input = {};
            const result = humint_types_1.DebriefSearchCriteriaSchema.parse(input);
            (0, globals_1.expect)(result.limit).toBe(20);
            (0, globals_1.expect)(result.offset).toBe(0);
        });
        (0, globals_1.it)('should validate date ranges', () => {
            const input = {
                scheduledAfter: new Date('2024-01-01'),
                scheduledBefore: new Date('2024-12-31'),
            };
            const result = humint_types_1.DebriefSearchCriteriaSchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
});
(0, globals_1.describe)('Debrief State Machine', () => {
    (0, globals_1.describe)('isValidTransition', () => {
        (0, globals_1.it)('should allow valid transitions', () => {
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PLANNED', 'IN_PROGRESS')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PLANNED', 'CANCELLED')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('IN_PROGRESS', 'PENDING_REVIEW')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PENDING_REVIEW', 'APPROVED')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('APPROVED', 'DISSEMINATED')).toBe(true);
        });
        (0, globals_1.it)('should reject invalid transitions', () => {
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PLANNED', 'APPROVED')).toBe(false);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('CANCELLED', 'IN_PROGRESS')).toBe(false);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('DISSEMINATED', 'APPROVED')).toBe(false);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('IN_PROGRESS', 'DISSEMINATED')).toBe(false);
        });
        (0, globals_1.it)('should allow return to IN_PROGRESS from PENDING_REVIEW', () => {
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PENDING_REVIEW', 'IN_PROGRESS')).toBe(true);
        });
        (0, globals_1.it)('should allow ACTION_REQUIRED transitions', () => {
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('PENDING_REVIEW', 'ACTION_REQUIRED')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('ACTION_REQUIRED', 'IN_PROGRESS')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.isValidTransition)('ACTION_REQUIRED', 'CANCELLED')).toBe(true);
        });
    });
    (0, globals_1.describe)('getAllowedTransitions', () => {
        (0, globals_1.it)('should return correct transitions for PLANNED', () => {
            const allowed = (0, humint_types_1.getAllowedTransitions)('PLANNED');
            (0, globals_1.expect)(allowed).toContain('IN_PROGRESS');
            (0, globals_1.expect)(allowed).toContain('CANCELLED');
            (0, globals_1.expect)(allowed).not.toContain('APPROVED');
        });
        (0, globals_1.it)('should return empty array for terminal states', () => {
            (0, globals_1.expect)((0, humint_types_1.getAllowedTransitions)('DISSEMINATED')).toEqual([]);
            (0, globals_1.expect)((0, humint_types_1.getAllowedTransitions)('CANCELLED')).toEqual([]);
        });
    });
});
(0, globals_1.describe)('Debrief Constants', () => {
    (0, globals_1.describe)('DEBRIEF_TYPES', () => {
        (0, globals_1.it)('should include all debrief types', () => {
            (0, globals_1.expect)(humint_types_1.DEBRIEF_TYPES.SCHEDULED).toBe('SCHEDULED');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_TYPES.EMERGENCY).toBe('EMERGENCY');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_TYPES.INITIAL).toBe('INITIAL');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_TYPES.TASKING).toBe('TASKING');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_TYPES.POLYGRAPH).toBe('POLYGRAPH');
        });
    });
    (0, globals_1.describe)('DEBRIEF_STATUS', () => {
        (0, globals_1.it)('should include all status values', () => {
            (0, globals_1.expect)(humint_types_1.DEBRIEF_STATUS.PLANNED).toBe('PLANNED');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_STATUS.PENDING_REVIEW).toBe('PENDING_REVIEW');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_STATUS.APPROVED).toBe('APPROVED');
            (0, globals_1.expect)(humint_types_1.DEBRIEF_STATUS.DISSEMINATED).toBe('DISSEMINATED');
        });
    });
});
