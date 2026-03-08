"use strict";
/**
 * Unit Tests for Canonical Model Validation
 *
 * Tests:
 * - Entity type validation
 * - Relationship type validation
 * - Policy label validation (including cross-field rules)
 * - Bitemporal field validation
 * - Schema enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
const validation_js_1 = require("../../src/canonical/validation.js");
const types_js_1 = require("../../src/canonical/types.js");
describe('Canonical Model Validation', () => {
    // ==========================================================================
    // POLICY LABELS VALIDATION
    // ==========================================================================
    describe('PolicyLabelsSchema', () => {
        it('should accept valid policy labels', () => {
            const validLabels = {
                origin: 'test-connector',
                sensitivity: types_js_1.SensitivityLevel.INTERNAL,
                clearance: types_js_1.ClearanceLevel.AUTHORIZED,
                legalBasis: '',
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(validLabels);
            expect(result.success).toBe(true);
        });
        it('should reject missing origin', () => {
            const invalidLabels = {
                sensitivity: types_js_1.SensitivityLevel.INTERNAL,
                clearance: types_js_1.ClearanceLevel.AUTHORIZED,
                legalBasis: '',
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(invalidLabels);
            expect(result.success).toBe(false);
        });
        it('should reject empty origin', () => {
            const invalidLabels = {
                origin: '',
                sensitivity: types_js_1.SensitivityLevel.INTERNAL,
                clearance: types_js_1.ClearanceLevel.AUTHORIZED,
                legalBasis: '',
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(invalidLabels);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('origin');
            }
        });
        it('should require legalBasis when sensitivity > INTERNAL', () => {
            const invalidLabels = {
                origin: 'test',
                sensitivity: types_js_1.SensitivityLevel.CONFIDENTIAL,
                clearance: types_js_1.ClearanceLevel.CONFIDENTIAL,
                legalBasis: '', // Empty but required for CONFIDENTIAL
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(invalidLabels);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('legalBasis');
            }
        });
        it('should accept empty legalBasis when sensitivity <= INTERNAL', () => {
            const validLabels = {
                origin: 'test',
                sensitivity: types_js_1.SensitivityLevel.INTERNAL,
                clearance: types_js_1.ClearanceLevel.AUTHORIZED,
                legalBasis: '',
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(validLabels);
            expect(result.success).toBe(true);
        });
        it('should accept valid legalBasis for TOP_SECRET', () => {
            const validLabels = {
                origin: 'classified-source',
                sensitivity: types_js_1.SensitivityLevel.TOP_SECRET,
                clearance: types_js_1.ClearanceLevel.TOP_SECRET,
                legalBasis: 'EXECUTIVE ORDER 12333',
                needToKnow: ['ALPHA', 'BRAVO'],
                purposeLimitation: ['SIGINT', 'ANALYSIS'],
                retentionClass: types_js_1.RetentionClass.PERMANENT,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(validLabels);
            expect(result.success).toBe(true);
        });
        it('should reject invalid sensitivity level', () => {
            const invalidLabels = {
                origin: 'test',
                sensitivity: 'INVALID_LEVEL',
                clearance: types_js_1.ClearanceLevel.AUTHORIZED,
                legalBasis: '',
                needToKnow: [],
                purposeLimitation: [],
                retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
            };
            const result = validation_js_1.PolicyLabelsSchema.safeParse(invalidLabels);
            expect(result.success).toBe(false);
        });
    });
    // ==========================================================================
    // ENTITY INPUT VALIDATION
    // ==========================================================================
    describe('EntityInputSchema', () => {
        it('should accept minimal valid entity', () => {
            const entity = {
                entityType: types_js_1.CanonicalEntityType.PERSON,
                label: 'John Doe',
            };
            const result = (0, validation_js_1.validateEntityInput)(entity);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.entityType).toBe(types_js_1.CanonicalEntityType.PERSON);
                expect(result.data.label).toBe('John Doe');
                expect(result.data.tenantId).toBe('default');
                expect(result.data.confidence).toBe(0.5);
                expect(result.data.policyLabels).toBeDefined();
            }
        });
        it('should apply default policy labels', () => {
            const entity = {
                entityType: types_js_1.CanonicalEntityType.ORGANIZATION,
                label: 'Acme Corp',
            };
            const result = (0, validation_js_1.validateEntityInput)(entity);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.policyLabels.sensitivity).toBe(types_js_1.SensitivityLevel.INTERNAL);
                expect(result.data.policyLabels.clearance).toBe(types_js_1.ClearanceLevel.AUTHORIZED);
            }
        });
        it('should accept full entity with all fields', () => {
            const entity = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                canonicalId: '123e4567-e89b-12d3-a456-426614174001',
                tenantId: 'tenant-1',
                entityType: types_js_1.CanonicalEntityType.ASSET,
                label: 'Vehicle ABC123',
                description: 'A suspect vehicle',
                properties: { make: 'Toyota', model: 'Camry' },
                customMetadata: { priority: 'high' },
                confidence: 0.95,
                source: 'dmv-connector',
                policyLabels: {
                    origin: 'dmv',
                    sensitivity: types_js_1.SensitivityLevel.RESTRICTED,
                    clearance: types_js_1.ClearanceLevel.SECRET,
                    legalBasis: 'INVESTIGATION #1234',
                    needToKnow: ['CASE-1234'],
                    purposeLimitation: ['INVESTIGATION'],
                    retentionClass: types_js_1.RetentionClass.LONG_TERM,
                },
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2025-01-01'),
                observedAt: new Date('2020-06-15'),
                createdBy: 'analyst@example.com',
                tags: ['vehicle', 'suspect'],
                investigationId: 'inv-123',
                caseId: 'case-456',
            };
            const result = (0, validation_js_1.validateEntityInput)(entity);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe(entity.id);
                expect(result.data.properties).toEqual(entity.properties);
                expect(result.data.policyLabels.legalBasis).toBe('INVESTIGATION #1234');
            }
        });
        it('should reject entity without label', () => {
            const entity = {
                entityType: types_js_1.CanonicalEntityType.PERSON,
            };
            const result = (0, validation_js_1.validateEntityInput)(entity);
            expect(result.success).toBe(false);
        });
        it('should reject entity with invalid type', () => {
            const entity = {
                entityType: 'InvalidType',
                label: 'Test',
            };
            const result = (0, validation_js_1.validateEntityInput)(entity);
            expect(result.success).toBe(false);
        });
        it('should validate all 21 entity types', () => {
            const allTypes = Object.values(types_js_1.CanonicalEntityType);
            expect(allTypes.length).toBe(22); // 22 enum values in the type
            for (const type of allTypes) {
                const entity = {
                    entityType: type,
                    label: `Test ${type}`,
                };
                const result = (0, validation_js_1.validateEntityInput)(entity);
                expect(result.success).toBe(true);
            }
        });
        it('should enforce confidence range 0-1', () => {
            const invalidEntity = {
                entityType: types_js_1.CanonicalEntityType.PERSON,
                label: 'Test',
                confidence: 1.5,
            };
            const result = (0, validation_js_1.validateEntityInput)(invalidEntity);
            expect(result.success).toBe(false);
        });
    });
    // ==========================================================================
    // RELATIONSHIP INPUT VALIDATION
    // ==========================================================================
    describe('RelationshipInputSchema', () => {
        const validFromId = '123e4567-e89b-12d3-a456-426614174000';
        const validToId = '123e4567-e89b-12d3-a456-426614174001';
        it('should accept minimal valid relationship', () => {
            const rel = {
                type: types_js_1.CanonicalRelationshipType.CONNECTED_TO,
                fromEntityId: validFromId,
                toEntityId: validToId,
            };
            const result = (0, validation_js_1.validateRelationshipInput)(rel);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.type).toBe(types_js_1.CanonicalRelationshipType.CONNECTED_TO);
                expect(result.data.directed).toBe(true);
            }
        });
        it('should reject self-loop (from == to)', () => {
            const rel = {
                type: types_js_1.CanonicalRelationshipType.CONNECTED_TO,
                fromEntityId: validFromId,
                toEntityId: validFromId, // Same as from
            };
            const result = (0, validation_js_1.validateRelationshipInput)(rel);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('Self-loops');
            }
        });
        it('should reject invalid UUID for fromEntityId', () => {
            const rel = {
                type: types_js_1.CanonicalRelationshipType.OWNS,
                fromEntityId: 'not-a-uuid',
                toEntityId: validToId,
            };
            const result = (0, validation_js_1.validateRelationshipInput)(rel);
            expect(result.success).toBe(false);
        });
        it('should validate all 30 relationship types', () => {
            const allTypes = Object.values(types_js_1.CanonicalRelationshipType);
            expect(allTypes.length).toBeGreaterThanOrEqual(30);
            for (const type of allTypes) {
                const rel = {
                    type,
                    fromEntityId: validFromId,
                    toEntityId: validToId,
                };
                const result = (0, validation_js_1.validateRelationshipInput)(rel);
                expect(result.success).toBe(true);
            }
        });
        it('should accept relationship with temporal fields', () => {
            const rel = {
                type: types_js_1.CanonicalRelationshipType.WORKS_FOR,
                fromEntityId: validFromId,
                toEntityId: validToId,
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2022-12-31'),
                since: new Date('2020-01-15'),
                until: new Date('2022-11-30'),
            };
            const result = (0, validation_js_1.validateRelationshipInput)(rel);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.since).toEqual(new Date('2020-01-15'));
                expect(result.data.until).toEqual(new Date('2022-11-30'));
            }
        });
    });
    // ==========================================================================
    // BITEMPORAL VALIDATION
    // ==========================================================================
    describe('BitemporalFieldsSchema', () => {
        it('should accept valid temporal range', () => {
            const fields = {
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2025-01-01'),
                observedAt: new Date('2020-06-01'),
                recordedAt: new Date('2020-06-15'),
            };
            const result = validation_js_1.BitemporalFieldsSchema.safeParse(fields);
            expect(result.success).toBe(true);
        });
        it('should reject validTo before validFrom', () => {
            const fields = {
                validFrom: new Date('2025-01-01'),
                validTo: new Date('2020-01-01'), // Before validFrom
                observedAt: null,
                recordedAt: new Date(),
            };
            const result = validation_js_1.BitemporalFieldsSchema.safeParse(fields);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('validTo must be after validFrom');
            }
        });
        it('should allow null validFrom (unknown start)', () => {
            const fields = {
                validFrom: null,
                validTo: new Date('2025-01-01'),
                observedAt: null,
                recordedAt: new Date(),
            };
            const result = validation_js_1.BitemporalFieldsSchema.safeParse(fields);
            expect(result.success).toBe(true);
        });
        it('should allow null validTo (still current)', () => {
            const fields = {
                validFrom: new Date('2020-01-01'),
                validTo: null,
                observedAt: new Date('2020-06-01'),
                recordedAt: new Date(),
            };
            const result = validation_js_1.BitemporalFieldsSchema.safeParse(fields);
            expect(result.success).toBe(true);
        });
        it('should set default recordedAt to now', () => {
            const before = new Date();
            const fields = {
                validFrom: null,
                validTo: null,
                observedAt: null,
            };
            const result = validation_js_1.BitemporalFieldsSchema.safeParse(fields);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
        });
    });
    // ==========================================================================
    // HELPER FUNCTION TESTS
    // ==========================================================================
    describe('Helper Functions', () => {
        describe('requiresLegalBasis', () => {
            it('should return false for PUBLIC', () => {
                expect((0, types_js_1.requiresLegalBasis)(types_js_1.SensitivityLevel.PUBLIC)).toBe(false);
            });
            it('should return false for INTERNAL', () => {
                expect((0, types_js_1.requiresLegalBasis)(types_js_1.SensitivityLevel.INTERNAL)).toBe(false);
            });
            it('should return true for CONFIDENTIAL', () => {
                expect((0, types_js_1.requiresLegalBasis)(types_js_1.SensitivityLevel.CONFIDENTIAL)).toBe(true);
            });
            it('should return true for RESTRICTED', () => {
                expect((0, types_js_1.requiresLegalBasis)(types_js_1.SensitivityLevel.RESTRICTED)).toBe(true);
            });
            it('should return true for TOP_SECRET', () => {
                expect((0, types_js_1.requiresLegalBasis)(types_js_1.SensitivityLevel.TOP_SECRET)).toBe(true);
            });
        });
        describe('compareSensitivity', () => {
            it('should rank PUBLIC < INTERNAL', () => {
                expect((0, types_js_1.compareSensitivity)(types_js_1.SensitivityLevel.PUBLIC, types_js_1.SensitivityLevel.INTERNAL)).toBeLessThan(0);
            });
            it('should rank INTERNAL < CONFIDENTIAL', () => {
                expect((0, types_js_1.compareSensitivity)(types_js_1.SensitivityLevel.INTERNAL, types_js_1.SensitivityLevel.CONFIDENTIAL)).toBeLessThan(0);
            });
            it('should rank TOP_SECRET > all others', () => {
                expect((0, types_js_1.compareSensitivity)(types_js_1.SensitivityLevel.TOP_SECRET, types_js_1.SensitivityLevel.RESTRICTED)).toBeGreaterThan(0);
                expect((0, types_js_1.compareSensitivity)(types_js_1.SensitivityLevel.TOP_SECRET, types_js_1.SensitivityLevel.PUBLIC)).toBeGreaterThan(0);
            });
            it('should return 0 for equal levels', () => {
                expect((0, types_js_1.compareSensitivity)(types_js_1.SensitivityLevel.CONFIDENTIAL, types_js_1.SensitivityLevel.CONFIDENTIAL)).toBe(0);
            });
        });
        describe('compareClearance', () => {
            it('should rank PUBLIC < AUTHORIZED', () => {
                expect((0, types_js_1.compareClearance)(types_js_1.ClearanceLevel.PUBLIC, types_js_1.ClearanceLevel.AUTHORIZED)).toBeLessThan(0);
            });
            it('should rank SECRET < TOP_SECRET', () => {
                expect((0, types_js_1.compareClearance)(types_js_1.ClearanceLevel.SECRET, types_js_1.ClearanceLevel.TOP_SECRET)).toBeLessThan(0);
            });
        });
        describe('getDefaultPolicyLabels', () => {
            it('should return valid default labels', () => {
                const defaults = (0, validation_js_1.getDefaultPolicyLabels)();
                const result = validation_js_1.PolicyLabelsSchema.safeParse(defaults);
                expect(result.success).toBe(true);
            });
            it('should have INTERNAL sensitivity by default', () => {
                const defaults = (0, validation_js_1.getDefaultPolicyLabels)();
                expect(defaults.sensitivity).toBe(types_js_1.SensitivityLevel.INTERNAL);
            });
        });
    });
});
