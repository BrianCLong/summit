"use strict";
/**
 * Source Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const humint_types_1 = require("@intelgraph/humint-types");
(0, globals_1.describe)('Source Validation Schemas', () => {
    (0, globals_1.describe)('CreateSourceSchema', () => {
        (0, globals_1.it)('should validate a valid source creation input', () => {
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
            const result = humint_types_1.CreateSourceSchema.safeParse(validInput);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid cryptonym format', () => {
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
            const result = humint_types_1.CreateSourceSchema.safeParse(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('should reject empty contact methods', () => {
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
            const result = humint_types_1.CreateSourceSchema.safeParse(invalidInput);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('SourceSearchCriteriaSchema', () => {
        (0, globals_1.it)('should apply default values', () => {
            const input = {};
            const result = humint_types_1.SourceSearchCriteriaSchema.parse(input);
            (0, globals_1.expect)(result.limit).toBe(20);
            (0, globals_1.expect)(result.offset).toBe(0);
            (0, globals_1.expect)(result.sortBy).toBe('createdAt');
            (0, globals_1.expect)(result.sortOrder).toBe('desc');
        });
        (0, globals_1.it)('should validate filter arrays', () => {
            const input = {
                sourceTypes: ['ASSET', 'LIAISON'],
                statuses: ['ACTIVE', 'DEVELOPMENTAL'],
                riskLevels: ['HIGH', 'CRITICAL'],
            };
            const result = humint_types_1.SourceSearchCriteriaSchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should enforce max limit', () => {
            const input = { limit: 500 };
            const result = humint_types_1.SourceSearchCriteriaSchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
});
(0, globals_1.describe)('Source Validation Helpers', () => {
    (0, globals_1.describe)('validateCryptonym', () => {
        (0, globals_1.it)('should accept valid cryptonyms', () => {
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('FALCON-7')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('ALPHA_BRAVO')).toBe(true);
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('X1')).toBe(false); // Too short
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('ABC')).toBe(true);
        });
        (0, globals_1.it)('should reject invalid cryptonyms', () => {
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('falcon-7')).toBe(false); // lowercase
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('123ABC')).toBe(false); // starts with number
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('AB')).toBe(false); // too short
            (0, globals_1.expect)((0, humint_types_1.validateCryptonym)('')).toBe(false);
        });
    });
    (0, globals_1.describe)('calculateCredibilityScore', () => {
        (0, globals_1.it)('should calculate weighted score correctly', () => {
            // Source A (100) + Info 1 (100) + 100% corroboration
            const score1 = (0, humint_types_1.calculateCredibilityScore)('A', '1', 100);
            (0, globals_1.expect)(score1).toBe(100);
            // Source C (60) + Info 3 (60) + 50% corroboration
            const score2 = (0, humint_types_1.calculateCredibilityScore)('C', '3', 50);
            (0, globals_1.expect)(score2).toBe(58); // 60*0.4 + 60*0.4 + 50*0.2
            // Source F (0) + Info 6 (0) + 0% corroboration
            const score3 = (0, humint_types_1.calculateCredibilityScore)('F', '6', 0);
            (0, globals_1.expect)(score3).toBe(0);
        });
    });
    (0, globals_1.describe)('isContactOverdue', () => {
        (0, globals_1.it)('should return true for null date', () => {
            (0, globals_1.expect)((0, humint_types_1.isContactOverdue)(undefined)).toBe(true);
        });
        (0, globals_1.it)('should detect overdue contacts', () => {
            const thirtyOneDaysAgo = new Date();
            thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
            (0, globals_1.expect)((0, humint_types_1.isContactOverdue)(thirtyOneDaysAgo, 30)).toBe(true);
        });
        (0, globals_1.it)('should return false for recent contacts', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            (0, globals_1.expect)((0, humint_types_1.isContactOverdue)(yesterday, 30)).toBe(false);
        });
    });
});
(0, globals_1.describe)('Constants', () => {
    (0, globals_1.describe)('CREDIBILITY_RATINGS', () => {
        (0, globals_1.it)('should have correct scores', () => {
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.A.score).toBe(100);
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.B.score).toBe(80);
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.C.score).toBe(60);
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.D.score).toBe(40);
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.E.score).toBe(20);
            (0, globals_1.expect)(humint_types_1.CREDIBILITY_RATINGS.F.score).toBe(0);
        });
    });
    (0, globals_1.describe)('SOURCE_TYPES', () => {
        (0, globals_1.it)('should include all standard types', () => {
            (0, globals_1.expect)(humint_types_1.SOURCE_TYPES.ASSET).toBe('ASSET');
            (0, globals_1.expect)(humint_types_1.SOURCE_TYPES.LIAISON).toBe('LIAISON');
            (0, globals_1.expect)(humint_types_1.SOURCE_TYPES.WALK_IN).toBe('WALK_IN');
            (0, globals_1.expect)(humint_types_1.SOURCE_TYPES.DEFECTOR).toBe('DEFECTOR');
        });
    });
    (0, globals_1.describe)('SOURCE_STATUS', () => {
        (0, globals_1.it)('should include all status values', () => {
            (0, globals_1.expect)(humint_types_1.SOURCE_STATUS.ACTIVE).toBe('ACTIVE');
            (0, globals_1.expect)(humint_types_1.SOURCE_STATUS.DORMANT).toBe('DORMANT');
            (0, globals_1.expect)(humint_types_1.SOURCE_STATUS.TERMINATED).toBe('TERMINATED');
            (0, globals_1.expect)(humint_types_1.SOURCE_STATUS.COMPROMISED).toBe('COMPROMISED');
        });
    });
});
