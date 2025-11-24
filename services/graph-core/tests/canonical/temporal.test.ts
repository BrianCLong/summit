/**
 * Unit Tests for Bitemporal Behavior
 *
 * Tests:
 * - Entity snapshot-at-time queries
 * - Relationship temporal queries
 * - Version history tracking
 * - Overlapping intervals
 * - Gaps in validity
 * - Time-travel neighborhood queries
 */

import {
  GraphStore,
  CanonicalEntityType,
  CanonicalRelationshipType,
  SensitivityLevel,
  ClearanceLevel,
  RetentionClass,
  VerificationStatus,
} from '../../src/canonical/index.js';

describe('Bitemporal Behavior', () => {
  let store: GraphStore;

  // Helper to create a minimal entity input
  const createEntity = (
    overrides: Partial<{
      id: string;
      label: string;
      entityType: CanonicalEntityType;
      validFrom: Date | null;
      validTo: Date | null;
      observedAt: Date | null;
    }> = {}
  ) => ({
    entityType: CanonicalEntityType.PERSON,
    label: 'Test Entity',
    tenantId: 'test-tenant',
    properties: {},
    confidence: 0.8,
    source: 'test',
    provenance: {
      sourceId: 'test',
      assertions: [],
      verificationStatus: VerificationStatus.UNVERIFIED,
      trustScore: 0.5,
    },
    policyLabels: {
      origin: 'test',
      sensitivity: SensitivityLevel.INTERNAL,
      clearance: ClearanceLevel.AUTHORIZED,
      legalBasis: '',
      needToKnow: [],
      purposeLimitation: [],
      retentionClass: RetentionClass.MEDIUM_TERM,
    },
    createdBy: 'test-user',
    tags: [],
    validFrom: null as Date | null,
    validTo: null as Date | null,
    observedAt: null as Date | null,
    ...overrides,
  });

  // Helper to create a minimal relationship input
  const createRelationship = (
    fromId: string,
    toId: string,
    overrides: Partial<{
      id: string;
      type: CanonicalRelationshipType;
      validFrom: Date | null;
      validTo: Date | null;
    }> = {}
  ) => ({
    type: CanonicalRelationshipType.CONNECTED_TO,
    fromEntityId: fromId,
    toEntityId: toId,
    tenantId: 'test-tenant',
    directed: true,
    properties: {},
    confidence: 0.8,
    source: 'test',
    provenance: {
      sourceId: 'test',
      assertions: [],
      verificationStatus: VerificationStatus.UNVERIFIED,
      trustScore: 0.5,
    },
    policyLabels: {
      origin: 'test',
      sensitivity: SensitivityLevel.INTERNAL,
      clearance: ClearanceLevel.AUTHORIZED,
      legalBasis: '',
      needToKnow: [],
      purposeLimitation: [],
      retentionClass: RetentionClass.MEDIUM_TERM,
    },
    createdBy: 'test-user',
    validFrom: null as Date | null,
    validTo: null as Date | null,
    observedAt: null as Date | null,
    ...overrides,
  });

  beforeEach(() => {
    store = new GraphStore();
  });

  // ==========================================================================
  // ENTITY TEMPORAL QUERIES
  // ==========================================================================

  describe('Entity Snapshot-at-Time', () => {
    it('should return entity within its validity window', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Bob',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Query within the valid window
      const result = store.getEntityAt(entity.id, new Date('2021-06-01'));
      expect(result).toBeDefined();
      expect(result?.label).toBe('Bob');
    });

    it('should return null before validity window', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Alice',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Query before validFrom
      const result = store.getEntityAt(entity.id, new Date('2019-01-01'));
      expect(result).toBeUndefined();
    });

    it('should return null after validity window', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Charlie',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Query after validTo
      const result = store.getEntityAt(entity.id, new Date('2023-01-01'));
      expect(result).toBeUndefined();
    });

    it('should handle entity with no validTo (still current)', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Current Entity',
          validFrom: new Date('2020-01-01'),
          validTo: null,
        })
      );

      // Query in the future should still return it
      const result = store.getEntityAt(entity.id, new Date('2099-01-01'));
      expect(result).toBeDefined();
      expect(result?.label).toBe('Current Entity');
    });

    it('should handle entity with no validFrom (always existed)', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Eternal Entity',
          validFrom: null,
          validTo: new Date('2025-01-01'),
        })
      );

      // Query in the distant past should return it
      const result = store.getEntityAt(entity.id, new Date('1900-01-01'));
      expect(result).toBeDefined();
      expect(result?.label).toBe('Eternal Entity');
    });

    it('should handle entity with no temporal bounds (always valid)', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Boundless Entity',
          validFrom: null,
          validTo: null,
        })
      );

      // Should be valid at any time
      expect(store.getEntityAt(entity.id, new Date('1900-01-01'))).toBeDefined();
      expect(store.getEntityAt(entity.id, new Date('2099-01-01'))).toBeDefined();
    });

    it('should handle validTo boundary (exclusive)', () => {
      const entity = store.upsertEntity(
        createEntity({
          label: 'Boundary Test',
          validFrom: new Date('2020-01-01T00:00:00.000Z'),
          validTo: new Date('2020-01-02T00:00:00.000Z'),
        })
      );

      // At exact validTo should return undefined (exclusive)
      const result = store.getEntityAt(
        entity.id,
        new Date('2020-01-02T00:00:00.000Z')
      );
      expect(result).toBeUndefined();

      // Just before validTo should work
      const resultBefore = store.getEntityAt(
        entity.id,
        new Date('2020-01-01T23:59:59.999Z')
      );
      expect(resultBefore).toBeDefined();
    });
  });

  // ==========================================================================
  // VERSION HISTORY
  // ==========================================================================

  describe('Version History', () => {
    it('should track entity versions on update', () => {
      // Create initial entity
      const entity1 = store.upsertEntity(
        createEntity({
          label: 'Version 1',
        })
      );
      expect(entity1.version).toBe(1);

      // Update entity
      const entity2 = store.upsertEntity(
        createEntity({
          id: entity1.id,
          label: 'Version 2',
        })
      );
      expect(entity2.version).toBe(2);
      expect(entity2.id).toBe(entity1.id);

      // Check version history
      const versions = store.getEntityVersions(entity1.id);
      expect(versions.length).toBe(2);
      expect(versions[0].label).toBe('Version 1');
      expect(versions[1].label).toBe('Version 2');
    });

    it('should preserve recordedAt timestamp across updates', () => {
      const entity1 = store.upsertEntity(
        createEntity({
          label: 'Original',
        })
      );
      const originalRecordedAt = entity1.recordedAt;

      // Wait a bit and update
      const entity2 = store.upsertEntity(
        createEntity({
          id: entity1.id,
          label: 'Updated',
        })
      );

      // recordedAt should be immutable
      expect(entity2.recordedAt).toEqual(originalRecordedAt);
      // updatedAt should be different
      expect(entity2.updatedAt.getTime()).toBeGreaterThanOrEqual(
        entity2.createdAt.getTime()
      );
    });

    it('should preserve createdBy across updates', () => {
      const entity1 = store.upsertEntity(
        createEntity({
          label: 'Original',
          createdBy: 'original-user',
        })
      );

      const entity2 = store.upsertEntity(
        createEntity({
          id: entity1.id,
          label: 'Updated',
          createdBy: 'different-user', // This should become updatedBy
        })
      );

      expect(entity2.createdBy).toBe('original-user');
      expect(entity2.updatedBy).toBe('different-user');
    });
  });

  // ==========================================================================
  // RELATIONSHIP TEMPORAL QUERIES
  // ==========================================================================

  describe('Relationship Temporal Queries', () => {
    it('should return relationship within its validity window', () => {
      const e1 = store.upsertEntity(createEntity({ label: 'Entity 1' }));
      const e2 = store.upsertEntity(createEntity({ label: 'Entity 2' }));

      const rel = store.upsertRelationship(
        createRelationship(e1.id, e2.id, {
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      const result = store.getRelationshipAt(rel.id, new Date('2021-06-01'));
      expect(result).toBeDefined();
    });

    it('should return null for relationship outside validity', () => {
      const e1 = store.upsertEntity(createEntity({ label: 'Entity 1' }));
      const e2 = store.upsertEntity(createEntity({ label: 'Entity 2' }));

      const rel = store.upsertRelationship(
        createRelationship(e1.id, e2.id, {
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      expect(store.getRelationshipAt(rel.id, new Date('2019-01-01'))).toBeUndefined();
      expect(store.getRelationshipAt(rel.id, new Date('2023-01-01'))).toBeUndefined();
    });
  });

  // ==========================================================================
  // GRAPH SNAPSHOTS
  // ==========================================================================

  describe('Graph Snapshots', () => {
    it('should return only entities valid at snapshot time', () => {
      // Entity valid 2020-2022
      store.upsertEntity(
        createEntity({
          label: 'Entity A',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Entity valid 2021-2023
      store.upsertEntity(
        createEntity({
          label: 'Entity B',
          validFrom: new Date('2021-01-01'),
          validTo: new Date('2023-01-01'),
        })
      );

      // Entity valid 2019-2020
      store.upsertEntity(
        createEntity({
          label: 'Entity C',
          validFrom: new Date('2019-01-01'),
          validTo: new Date('2020-01-01'),
        })
      );

      // Snapshot at 2021-06-01 should include A and B but not C
      const snapshot = store.getSnapshot(new Date('2021-06-01'));
      expect(snapshot.entities.length).toBe(2);
      expect(snapshot.entities.map((e) => e.label).sort()).toEqual([
        'Entity A',
        'Entity B',
      ]);
    });

    it('should return relationships valid at snapshot time', () => {
      const e1 = store.upsertEntity(createEntity({ label: 'E1' }));
      const e2 = store.upsertEntity(createEntity({ label: 'E2' }));

      // Relationship valid 2020-2022
      store.upsertRelationship(
        createRelationship(e1.id, e2.id, {
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      const snapshot2021 = store.getSnapshot(new Date('2021-06-01'));
      expect(snapshot2021.relationships.length).toBe(1);

      const snapshot2023 = store.getSnapshot(new Date('2023-01-01'));
      expect(snapshot2023.relationships.length).toBe(0);
    });
  });

  // ==========================================================================
  // NEIGHBORHOOD QUERIES WITH TIME TRAVEL
  // ==========================================================================

  describe('Neighborhood Queries with Time Travel', () => {
    it('should traverse only edges valid at specified time', () => {
      // Create entities
      const center = store.upsertEntity(
        createEntity({
          label: 'Center',
          validFrom: new Date('2015-01-01'),
          validTo: null,
        })
      );
      const neighbor1 = store.upsertEntity(
        createEntity({
          label: 'Neighbor 1',
          validFrom: new Date('2015-01-01'),
          validTo: null,
        })
      );
      const neighbor2 = store.upsertEntity(
        createEntity({
          label: 'Neighbor 2',
          validFrom: new Date('2015-01-01'),
          validTo: null,
        })
      );

      // Create relationships with different validity periods
      // Rel1: Valid 2018-2020
      store.upsertRelationship(
        createRelationship(center.id, neighbor1.id, {
          validFrom: new Date('2018-01-01'),
          validTo: new Date('2020-01-01'),
        })
      );

      // Rel2: Valid 2019-2022
      store.upsertRelationship(
        createRelationship(center.id, neighbor2.id, {
          validFrom: new Date('2019-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Query at 2019-06-01 - both relationships should be valid
      const result2019 = store.queryNeighborhood({
        entityId: center.id,
        depth: 1,
        temporal: { asOf: new Date('2019-06-01') },
      });
      expect(result2019.totalEntities).toBe(3); // center + 2 neighbors

      // Query at 2021-01-01 - only Rel2 should be valid
      const result2021 = store.queryNeighborhood({
        entityId: center.id,
        depth: 1,
        temporal: { asOf: new Date('2021-01-01') },
      });
      expect(result2021.totalEntities).toBe(2); // center + neighbor2 only

      // Query at 2023-01-01 - no relationships valid
      const result2023 = store.queryNeighborhood({
        entityId: center.id,
        depth: 1,
        temporal: { asOf: new Date('2023-01-01') },
      });
      expect(result2023.totalEntities).toBe(1); // just center
    });

    it('should exclude entities not valid at query time', () => {
      // Center always valid
      const center = store.upsertEntity(
        createEntity({
          label: 'Center',
          validFrom: null,
          validTo: null,
        })
      );

      // Neighbor only valid 2020-2022
      const neighbor = store.upsertEntity(
        createEntity({
          label: 'Temporal Neighbor',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Relationship always valid
      store.upsertRelationship(
        createRelationship(center.id, neighbor.id, {
          validFrom: null,
          validTo: null,
        })
      );

      // Query in 2021 - neighbor should be included
      const result2021 = store.queryNeighborhood({
        entityId: center.id,
        depth: 1,
        temporal: { asOf: new Date('2021-06-01') },
      });
      expect(result2021.totalEntities).toBe(2);

      // Query in 2023 - neighbor should NOT be included
      const result2023 = store.queryNeighborhood({
        entityId: center.id,
        depth: 1,
        temporal: { asOf: new Date('2023-01-01') },
      });
      expect(result2023.totalEntities).toBe(1); // only center
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle non-existent entity', () => {
      const result = store.getEntityAt(
        '00000000-0000-0000-0000-000000000000',
        new Date()
      );
      expect(result).toBeUndefined();
    });

    it('should handle overlapping validity periods across versions', () => {
      // Create entity with validity 2020-2022
      const entity1 = store.upsertEntity(
        createEntity({
          label: 'Version 1',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2022-01-01'),
        })
      );

      // Update to extend validity to 2025
      store.upsertEntity(
        createEntity({
          id: entity1.id,
          label: 'Version 2',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2025-01-01'),
        })
      );

      // Current state should use version 2
      const current = store.getEntity(entity1.id);
      expect(current?.validTo).toEqual(new Date('2025-01-01'));

      // Query at 2023 should return version 2
      const result = store.getEntityAt(entity1.id, new Date('2023-01-01'));
      expect(result).toBeDefined();
      expect(result?.label).toBe('Version 2');
    });

    it('should handle observedAt vs validFrom correctly', () => {
      // Fact was true from 2018, but we only observed it in 2020
      const entity = store.upsertEntity(
        createEntity({
          label: 'Late Discovery',
          validFrom: new Date('2018-01-01'),
          validTo: null,
          observedAt: new Date('2020-06-01'),
        })
      );

      expect(entity.validFrom).toEqual(new Date('2018-01-01'));
      expect(entity.observedAt).toEqual(new Date('2020-06-01'));

      // Should be valid at 2019 (validFrom perspective)
      const result = store.getEntityAt(entity.id, new Date('2019-01-01'));
      expect(result).toBeDefined();
    });
  });
});
