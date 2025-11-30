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

import {
  EntityInputSchema,
  RelationshipInputSchema,
  PolicyLabelsSchema,
  BitemporalFieldsSchema,
  validateEntityInput,
  validateRelationshipInput,
  validatePolicyLabels,
  getDefaultPolicyLabels,
} from '../../src/canonical/validation.js';
import {
  CanonicalEntityType,
  CanonicalRelationshipType,
  SensitivityLevel,
  ClearanceLevel,
  RetentionClass,
  requiresLegalBasis,
  compareSensitivity,
  compareClearance,
} from '../../src/canonical/types.js';

describe('Canonical Model Validation', () => {
  // ==========================================================================
  // POLICY LABELS VALIDATION
  // ==========================================================================

  describe('PolicyLabelsSchema', () => {
    it('should accept valid policy labels', () => {
      const validLabels = {
        origin: 'test-connector',
        sensitivity: SensitivityLevel.INTERNAL,
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(validLabels);
      expect(result.success).toBe(true);
    });

    it('should reject missing origin', () => {
      const invalidLabels = {
        sensitivity: SensitivityLevel.INTERNAL,
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(invalidLabels);
      expect(result.success).toBe(false);
    });

    it('should reject empty origin', () => {
      const invalidLabels = {
        origin: '',
        sensitivity: SensitivityLevel.INTERNAL,
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(invalidLabels);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('origin');
      }
    });

    it('should require legalBasis when sensitivity > INTERNAL', () => {
      const invalidLabels = {
        origin: 'test',
        sensitivity: SensitivityLevel.CONFIDENTIAL,
        clearance: ClearanceLevel.CONFIDENTIAL,
        legalBasis: '', // Empty but required for CONFIDENTIAL
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(invalidLabels);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('legalBasis');
      }
    });

    it('should accept empty legalBasis when sensitivity <= INTERNAL', () => {
      const validLabels = {
        origin: 'test',
        sensitivity: SensitivityLevel.INTERNAL,
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(validLabels);
      expect(result.success).toBe(true);
    });

    it('should accept valid legalBasis for TOP_SECRET', () => {
      const validLabels = {
        origin: 'classified-source',
        sensitivity: SensitivityLevel.TOP_SECRET,
        clearance: ClearanceLevel.TOP_SECRET,
        legalBasis: 'EXECUTIVE ORDER 12333',
        needToKnow: ['ALPHA', 'BRAVO'],
        purposeLimitation: ['SIGINT', 'ANALYSIS'],
        retentionClass: RetentionClass.PERMANENT,
      };

      const result = PolicyLabelsSchema.safeParse(validLabels);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sensitivity level', () => {
      const invalidLabels = {
        origin: 'test',
        sensitivity: 'INVALID_LEVEL',
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: RetentionClass.MEDIUM_TERM,
      };

      const result = PolicyLabelsSchema.safeParse(invalidLabels);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // ENTITY INPUT VALIDATION
  // ==========================================================================

  describe('EntityInputSchema', () => {
    it('should accept minimal valid entity', () => {
      const entity = {
        entityType: CanonicalEntityType.PERSON,
        label: 'John Doe',
      };

      const result = validateEntityInput(entity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityType).toBe(CanonicalEntityType.PERSON);
        expect(result.data.label).toBe('John Doe');
        expect(result.data.tenantId).toBe('default');
        expect(result.data.confidence).toBe(0.5);
        expect(result.data.policyLabels).toBeDefined();
      }
    });

    it('should apply default policy labels', () => {
      const entity = {
        entityType: CanonicalEntityType.ORGANIZATION,
        label: 'Acme Corp',
      };

      const result = validateEntityInput(entity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.policyLabels.sensitivity).toBe(SensitivityLevel.INTERNAL);
        expect(result.data.policyLabels.clearance).toBe(ClearanceLevel.AUTHORIZED);
      }
    });

    it('should accept full entity with all fields', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        canonicalId: '123e4567-e89b-12d3-a456-426614174001',
        tenantId: 'tenant-1',
        entityType: CanonicalEntityType.ASSET,
        label: 'Vehicle ABC123',
        description: 'A suspect vehicle',
        properties: { make: 'Toyota', model: 'Camry' },
        customMetadata: { priority: 'high' },
        confidence: 0.95,
        source: 'dmv-connector',
        policyLabels: {
          origin: 'dmv',
          sensitivity: SensitivityLevel.RESTRICTED,
          clearance: ClearanceLevel.SECRET,
          legalBasis: 'INVESTIGATION #1234',
          needToKnow: ['CASE-1234'],
          purposeLimitation: ['INVESTIGATION'],
          retentionClass: RetentionClass.LONG_TERM,
        },
        validFrom: new Date('2020-01-01'),
        validTo: new Date('2025-01-01'),
        observedAt: new Date('2020-06-15'),
        createdBy: 'analyst@example.com',
        tags: ['vehicle', 'suspect'],
        investigationId: 'inv-123',
        caseId: 'case-456',
      };

      const result = validateEntityInput(entity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(entity.id);
        expect(result.data.properties).toEqual(entity.properties);
        expect(result.data.policyLabels.legalBasis).toBe('INVESTIGATION #1234');
      }
    });

    it('should reject entity without label', () => {
      const entity = {
        entityType: CanonicalEntityType.PERSON,
      };

      const result = validateEntityInput(entity);
      expect(result.success).toBe(false);
    });

    it('should reject entity with invalid type', () => {
      const entity = {
        entityType: 'InvalidType',
        label: 'Test',
      };

      const result = validateEntityInput(entity);
      expect(result.success).toBe(false);
    });

    it('should validate all 21 entity types', () => {
      const allTypes = Object.values(CanonicalEntityType);
      expect(allTypes.length).toBe(22); // 22 enum values in the type

      for (const type of allTypes) {
        const entity = {
          entityType: type,
          label: `Test ${type}`,
        };

        const result = validateEntityInput(entity);
        expect(result.success).toBe(true);
      }
    });

    it('should enforce confidence range 0-1', () => {
      const invalidEntity = {
        entityType: CanonicalEntityType.PERSON,
        label: 'Test',
        confidence: 1.5,
      };

      const result = validateEntityInput(invalidEntity);
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
        type: CanonicalRelationshipType.CONNECTED_TO,
        fromEntityId: validFromId,
        toEntityId: validToId,
      };

      const result = validateRelationshipInput(rel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(CanonicalRelationshipType.CONNECTED_TO);
        expect(result.data.directed).toBe(true);
      }
    });

    it('should reject self-loop (from == to)', () => {
      const rel = {
        type: CanonicalRelationshipType.CONNECTED_TO,
        fromEntityId: validFromId,
        toEntityId: validFromId, // Same as from
      };

      const result = validateRelationshipInput(rel);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Self-loops');
      }
    });

    it('should reject invalid UUID for fromEntityId', () => {
      const rel = {
        type: CanonicalRelationshipType.OWNS,
        fromEntityId: 'not-a-uuid',
        toEntityId: validToId,
      };

      const result = validateRelationshipInput(rel);
      expect(result.success).toBe(false);
    });

    it('should validate all 30 relationship types', () => {
      const allTypes = Object.values(CanonicalRelationshipType);
      expect(allTypes.length).toBeGreaterThanOrEqual(30);

      for (const type of allTypes) {
        const rel = {
          type,
          fromEntityId: validFromId,
          toEntityId: validToId,
        };

        const result = validateRelationshipInput(rel);
        expect(result.success).toBe(true);
      }
    });

    it('should accept relationship with temporal fields', () => {
      const rel = {
        type: CanonicalRelationshipType.WORKS_FOR,
        fromEntityId: validFromId,
        toEntityId: validToId,
        validFrom: new Date('2020-01-01'),
        validTo: new Date('2022-12-31'),
        since: new Date('2020-01-15'),
        until: new Date('2022-11-30'),
      };

      const result = validateRelationshipInput(rel);
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

      const result = BitemporalFieldsSchema.safeParse(fields);
      expect(result.success).toBe(true);
    });

    it('should reject validTo before validFrom', () => {
      const fields = {
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2020-01-01'), // Before validFrom
        observedAt: null,
        recordedAt: new Date(),
      };

      const result = BitemporalFieldsSchema.safeParse(fields);
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

      const result = BitemporalFieldsSchema.safeParse(fields);
      expect(result.success).toBe(true);
    });

    it('should allow null validTo (still current)', () => {
      const fields = {
        validFrom: new Date('2020-01-01'),
        validTo: null,
        observedAt: new Date('2020-06-01'),
        recordedAt: new Date(),
      };

      const result = BitemporalFieldsSchema.safeParse(fields);
      expect(result.success).toBe(true);
    });

    it('should set default recordedAt to now', () => {
      const before = new Date();
      const fields = {
        validFrom: null,
        validTo: null,
        observedAt: null,
      };

      const result = BitemporalFieldsSchema.safeParse(fields);
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
        expect(requiresLegalBasis(SensitivityLevel.PUBLIC)).toBe(false);
      });

      it('should return false for INTERNAL', () => {
        expect(requiresLegalBasis(SensitivityLevel.INTERNAL)).toBe(false);
      });

      it('should return true for CONFIDENTIAL', () => {
        expect(requiresLegalBasis(SensitivityLevel.CONFIDENTIAL)).toBe(true);
      });

      it('should return true for RESTRICTED', () => {
        expect(requiresLegalBasis(SensitivityLevel.RESTRICTED)).toBe(true);
      });

      it('should return true for TOP_SECRET', () => {
        expect(requiresLegalBasis(SensitivityLevel.TOP_SECRET)).toBe(true);
      });
    });

    describe('compareSensitivity', () => {
      it('should rank PUBLIC < INTERNAL', () => {
        expect(compareSensitivity(SensitivityLevel.PUBLIC, SensitivityLevel.INTERNAL)).toBeLessThan(0);
      });

      it('should rank INTERNAL < CONFIDENTIAL', () => {
        expect(compareSensitivity(SensitivityLevel.INTERNAL, SensitivityLevel.CONFIDENTIAL)).toBeLessThan(0);
      });

      it('should rank TOP_SECRET > all others', () => {
        expect(compareSensitivity(SensitivityLevel.TOP_SECRET, SensitivityLevel.RESTRICTED)).toBeGreaterThan(0);
        expect(compareSensitivity(SensitivityLevel.TOP_SECRET, SensitivityLevel.PUBLIC)).toBeGreaterThan(0);
      });

      it('should return 0 for equal levels', () => {
        expect(compareSensitivity(SensitivityLevel.CONFIDENTIAL, SensitivityLevel.CONFIDENTIAL)).toBe(0);
      });
    });

    describe('compareClearance', () => {
      it('should rank PUBLIC < AUTHORIZED', () => {
        expect(compareClearance(ClearanceLevel.PUBLIC, ClearanceLevel.AUTHORIZED)).toBeLessThan(0);
      });

      it('should rank SECRET < TOP_SECRET', () => {
        expect(compareClearance(ClearanceLevel.SECRET, ClearanceLevel.TOP_SECRET)).toBeLessThan(0);
      });
    });

    describe('getDefaultPolicyLabels', () => {
      it('should return valid default labels', () => {
        const defaults = getDefaultPolicyLabels();
        const result = PolicyLabelsSchema.safeParse(defaults);
        expect(result.success).toBe(true);
      });

      it('should have INTERNAL sensitivity by default', () => {
        const defaults = getDefaultPolicyLabels();
        expect(defaults.sensitivity).toBe(SensitivityLevel.INTERNAL);
      });
    });
  });
});
