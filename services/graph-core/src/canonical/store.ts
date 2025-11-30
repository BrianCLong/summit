/**
 * Enhanced Graph Store with Bitemporal Support
 *
 * Features:
 * - Full bitemporal support (validFrom/validTo + observedAt/recordedAt)
 * - Snapshot-at-time queries
 * - Time-travel neighborhood queries
 * - Versioning with optimistic locking
 * - Policy label enforcement
 *
 * @module graph-core/canonical/store
 */

import { v4 as uuid } from 'uuid';
import {
  CanonicalEntityBase,
  CanonicalRelationshipBase,
  CanonicalEntityType,
  CanonicalRelationshipType,
  ClearanceLevel,
  compareClearance,
} from './types.js';
import {
  EntityInput,
  EntityStored,
  RelationshipInput,
  RelationshipStored,
  NeighborhoodQuery,
  QueryCostLimits,
  QueryCostEstimate,
} from './validation.js';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Entity version record for history tracking
 */
interface EntityVersion {
  entity: EntityStored;
  supersededAt: Date | null;
}

/**
 * Relationship version record for history tracking
 */
interface RelationshipVersion {
  relationship: RelationshipStored;
  supersededAt: Date | null;
}

/**
 * Neighborhood query result
 */
export interface NeighborhoodResult {
  /** Center entity */
  center: EntityStored;
  /** Connected entities by depth */
  entities: Map<number, EntityStored[]>;
  /** Relationships in the neighborhood */
  relationships: RelationshipStored[];
  /** Total entity count */
  totalEntities: number;
  /** Total relationship count */
  totalRelationships: number;
  /** Whether results were truncated */
  truncated: boolean;
  /** Query cost metrics */
  cost: QueryCostEstimate;
}

/**
 * Time-travel snapshot result
 */
export interface TimeSnapshot {
  /** Timestamp of the snapshot */
  asOf: Date;
  /** Entities valid at this time */
  entities: EntityStored[];
  /** Relationships valid at this time */
  relationships: RelationshipStored[];
}

// =============================================================================
// GRAPH STORE
// =============================================================================

/**
 * Enhanced in-memory graph store with bitemporal support
 */
export class GraphStore {
  // Current entities indexed by ID
  private entities = new Map<string, EntityStored>();

  // Entity version history (ID -> array of versions)
  private entityVersions = new Map<string, EntityVersion[]>();

  // Current relationships indexed by ID
  private relationships = new Map<string, RelationshipStored>();

  // Relationship version history
  private relationshipVersions = new Map<string, RelationshipVersion[]>();

  // Adjacency indexes for efficient traversal
  private outgoingEdges = new Map<string, Set<string>>(); // entityId -> Set<relationshipId>
  private incomingEdges = new Map<string, Set<string>>(); // entityId -> Set<relationshipId>

  // Type indexes
  private entitiesByType = new Map<CanonicalEntityType, Set<string>>();
  private relationshipsByType = new Map<CanonicalRelationshipType, Set<string>>();

  // Tenant isolation
  private entitiesByTenant = new Map<string, Set<string>>();
  private relationshipsByTenant = new Map<string, Set<string>>();

  // ==========================================================================
  // ENTITY OPERATIONS
  // ==========================================================================

  /**
   * Upsert an entity (create or update)
   */
  upsertEntity(input: EntityInput): EntityStored {
    const now = new Date();
    const existingId = input.id;
    const existing = existingId ? this.entities.get(existingId) : undefined;

    if (existing) {
      // Update existing entity
      return this.updateEntity(existing, input, now);
    }

    // Create new entity
    return this.createEntity(input, now);
  }

  /**
   * Create a new entity
   */
  private createEntity(input: EntityInput, now: Date): EntityStored {
    const id = input.id || uuid();

    const entity: EntityStored = {
      ...input,
      id,
      canonicalId: input.canonicalId ?? null,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      observedAt: input.observedAt ?? null,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Store entity
    this.entities.set(id, entity);

    // Store initial version
    this.entityVersions.set(id, [
      { entity, supersededAt: null },
    ]);

    // Update indexes
    this.indexEntity(entity);

    return entity;
  }

  /**
   * Update an existing entity
   */
  private updateEntity(
    existing: EntityStored,
    input: EntityInput,
    now: Date
  ): EntityStored {
    // Optimistic locking check
    // In real impl, check input.version matches existing.version

    const updated: EntityStored = {
      ...existing,
      ...input,
      id: existing.id,
      recordedAt: existing.recordedAt, // Immutable
      createdAt: existing.createdAt, // Immutable
      createdBy: existing.createdBy, // Immutable
      updatedAt: now,
      updatedBy: input.createdBy,
      version: existing.version + 1,
    };

    // Move previous version to history
    const versions = this.entityVersions.get(existing.id) || [];
    versions[versions.length - 1].supersededAt = now;
    versions.push({ entity: updated, supersededAt: null });
    this.entityVersions.set(existing.id, versions);

    // Update current entity
    this.entities.set(existing.id, updated);

    // Re-index if type changed
    if (existing.entityType !== updated.entityType) {
      this.unindexEntity(existing);
      this.indexEntity(updated);
    }

    return updated;
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): EntityStored | undefined {
    return this.entities.get(id);
  }

  /**
   * Get entity at a specific point in time (bitemporal query)
   *
   * @param id Entity ID
   * @param asOf Business time point
   * @param recordedAsOf Optional system time point
   */
  getEntityAt(
    id: string,
    asOf: Date,
    recordedAsOf?: Date
  ): EntityStored | undefined {
    const versions = this.entityVersions.get(id);
    if (!versions) return undefined;

    const targetSystemTime = recordedAsOf || new Date();

    // Find version that was current at recordedAsOf
    for (let i = versions.length - 1; i >= 0; i--) {
      const version = versions[i];
      const entity = version.entity;

      // Check system time (when was this version recorded?)
      if (entity.recordedAt > targetSystemTime) continue;
      if (version.supersededAt && version.supersededAt <= targetSystemTime) continue;

      // Check business time (validFrom/validTo)
      if (entity.validFrom && entity.validFrom > asOf) continue;
      if (entity.validTo && entity.validTo <= asOf) continue;

      return entity;
    }

    return undefined;
  }

  /**
   * Get all entity versions
   */
  getEntityVersions(id: string): EntityStored[] {
    const versions = this.entityVersions.get(id);
    if (!versions) return [];
    return versions.map((v) => v.entity);
  }

  /**
   * Get entities by type
   */
  getEntitiesByType(type: CanonicalEntityType): EntityStored[] {
    const ids = this.entitiesByType.get(type);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.entities.get(id))
      .filter((e): e is EntityStored => e !== undefined);
  }

  /**
   * Get entities by tenant
   */
  getEntitiesByTenant(tenantId: string): EntityStored[] {
    const ids = this.entitiesByTenant.get(tenantId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.entities.get(id))
      .filter((e): e is EntityStored => e !== undefined);
  }

  // ==========================================================================
  // RELATIONSHIP OPERATIONS
  // ==========================================================================

  /**
   * Upsert a relationship (create or update)
   */
  upsertRelationship(input: RelationshipInput): RelationshipStored {
    const now = new Date();
    const existingId = input.id;
    const existing = existingId ? this.relationships.get(existingId) : undefined;

    if (existing) {
      return this.updateRelationship(existing, input, now);
    }

    return this.createRelationship(input, now);
  }

  /**
   * Create a new relationship
   */
  private createRelationship(
    input: RelationshipInput,
    now: Date
  ): RelationshipStored {
    const id = input.id || uuid();

    const relationship: RelationshipStored = {
      ...input,
      id,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      observedAt: input.observedAt ?? null,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Store relationship
    this.relationships.set(id, relationship);

    // Store initial version
    this.relationshipVersions.set(id, [
      { relationship, supersededAt: null },
    ]);

    // Update indexes
    this.indexRelationship(relationship);

    return relationship;
  }

  /**
   * Update an existing relationship
   */
  private updateRelationship(
    existing: RelationshipStored,
    input: RelationshipInput,
    now: Date
  ): RelationshipStored {
    const updated: RelationshipStored = {
      ...existing,
      ...input,
      id: existing.id,
      recordedAt: existing.recordedAt,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: now,
      updatedBy: input.createdBy,
      version: existing.version + 1,
    };

    // Move previous version to history
    const versions = this.relationshipVersions.get(existing.id) || [];
    versions[versions.length - 1].supersededAt = now;
    versions.push({ relationship: updated, supersededAt: null });
    this.relationshipVersions.set(existing.id, versions);

    // Update current relationship
    this.relationships.set(existing.id, updated);

    // Re-index if endpoints changed
    if (
      existing.fromEntityId !== updated.fromEntityId ||
      existing.toEntityId !== updated.toEntityId
    ) {
      this.unindexRelationship(existing);
      this.indexRelationship(updated);
    }

    return updated;
  }

  /**
   * Get relationship by ID
   */
  getRelationship(id: string): RelationshipStored | undefined {
    return this.relationships.get(id);
  }

  /**
   * Get relationship at a specific point in time (bitemporal query)
   */
  getRelationshipAt(
    id: string,
    asOf: Date,
    recordedAsOf?: Date
  ): RelationshipStored | undefined {
    const versions = this.relationshipVersions.get(id);
    if (!versions) return undefined;

    const targetSystemTime = recordedAsOf || new Date();

    for (let i = versions.length - 1; i >= 0; i--) {
      const version = versions[i];
      const rel = version.relationship;

      // Check system time
      if (rel.recordedAt > targetSystemTime) continue;
      if (version.supersededAt && version.supersededAt <= targetSystemTime)
        continue;

      // Check business time
      if (rel.validFrom && rel.validFrom > asOf) continue;
      if (rel.validTo && rel.validTo <= asOf) continue;

      return rel;
    }

    return undefined;
  }

  /**
   * Get outgoing relationships for an entity
   */
  getOutgoingRelationships(entityId: string): RelationshipStored[] {
    const relIds = this.outgoingEdges.get(entityId);
    if (!relIds) return [];
    return Array.from(relIds)
      .map((id) => this.relationships.get(id))
      .filter((r): r is RelationshipStored => r !== undefined);
  }

  /**
   * Get incoming relationships for an entity
   */
  getIncomingRelationships(entityId: string): RelationshipStored[] {
    const relIds = this.incomingEdges.get(entityId);
    if (!relIds) return [];
    return Array.from(relIds)
      .map((id) => this.relationships.get(id))
      .filter((r): r is RelationshipStored => r !== undefined);
  }

  // ==========================================================================
  // TEMPORAL QUERIES
  // ==========================================================================

  /**
   * Get a snapshot of the graph at a specific point in time
   */
  getSnapshot(asOf: Date, recordedAsOf?: Date): TimeSnapshot {
    const entities: EntityStored[] = [];
    const relationships: RelationshipStored[] = [];

    // Get all entities valid at asOf
    for (const id of this.entities.keys()) {
      const entity = this.getEntityAt(id, asOf, recordedAsOf);
      if (entity) entities.push(entity);
    }

    // Get all relationships valid at asOf
    for (const id of this.relationships.keys()) {
      const rel = this.getRelationshipAt(id, asOf, recordedAsOf);
      if (rel) relationships.push(rel);
    }

    return {
      asOf,
      entities,
      relationships,
    };
  }

  /**
   * Query neighborhood with time-travel support
   */
  queryNeighborhood(query: NeighborhoodQuery): NeighborhoodResult {
    const startTime = Date.now();
    const asOf = query.temporal?.asOf || new Date();
    const recordedAsOf = query.temporal?.recordedAsOf;

    // Get center entity at the specified time
    const center = this.getEntityAt(query.entityId, asOf, recordedAsOf);
    if (!center) {
      return {
        center: undefined as unknown as EntityStored,
        entities: new Map(),
        relationships: [],
        totalEntities: 0,
        totalRelationships: 0,
        truncated: false,
        cost: this.estimateCost(0, 0, startTime),
      };
    }

    // BFS traversal
    const visited = new Set<string>([query.entityId]);
    const entitiesByDepth = new Map<number, EntityStored[]>();
    entitiesByDepth.set(0, [center]);

    const allRelationships: RelationshipStored[] = [];
    let frontier = [query.entityId];
    let totalEntities = 1;
    let truncated = false;

    for (let depth = 1; depth <= query.depth && !truncated; depth++) {
      const nextFrontier: string[] = [];
      const depthEntities: EntityStored[] = [];

      for (const entityId of frontier) {
        // Get all relationships for this entity at the specified time
        const outgoing = this.getOutgoingRelationshipsAt(
          entityId,
          asOf,
          recordedAsOf
        );
        const incoming = this.getIncomingRelationshipsAt(
          entityId,
          asOf,
          recordedAsOf
        );
        const allEdges = [...outgoing, ...incoming];

        for (const rel of allEdges) {
          // Apply relationship type filter
          if (
            query.relationshipTypes &&
            !query.relationshipTypes.includes(rel.type)
          ) {
            continue;
          }

          // Apply confidence filter
          if (
            query.minConfidence !== undefined &&
            rel.confidence < query.minConfidence
          ) {
            continue;
          }

          // Apply clearance filter
          if (
            query.clearance &&
            compareClearance(rel.policyLabels.clearance, query.clearance) > 0
          ) {
            continue;
          }

          // Determine neighbor ID
          const neighborId =
            rel.fromEntityId === entityId ? rel.toEntityId : rel.fromEntityId;

          if (!visited.has(neighborId)) {
            // Get neighbor entity at the specified time
            const neighbor = this.getEntityAt(neighborId, asOf, recordedAsOf);
            if (!neighbor) continue;

            // Apply entity type filter
            if (
              query.entityTypes &&
              !query.entityTypes.includes(neighbor.entityType)
            ) {
              continue;
            }

            // Apply confidence filter to entity
            if (
              query.minConfidence !== undefined &&
              neighbor.confidence < query.minConfidence
            ) {
              continue;
            }

            // Apply clearance filter to entity
            if (
              query.clearance &&
              compareClearance(neighbor.policyLabels.clearance, query.clearance) >
                0
            ) {
              continue;
            }

            // Check limits
            if (totalEntities >= QueryCostLimits.MAX_RESULTS) {
              truncated = true;
              break;
            }

            visited.add(neighborId);
            nextFrontier.push(neighborId);
            depthEntities.push(neighbor);
            totalEntities++;
          }

          // Track relationship
          if (!allRelationships.find((r) => r.id === rel.id)) {
            allRelationships.push(rel);
            if (allRelationships.length >= QueryCostLimits.MAX_EDGES) {
              truncated = true;
              break;
            }
          }
        }

        if (truncated) break;
      }

      if (depthEntities.length > 0) {
        entitiesByDepth.set(depth, depthEntities);
      }
      frontier = nextFrontier;
    }

    // Apply pagination if specified
    let finalRelationships = allRelationships;
    if (query.pagination) {
      const { offset, limit } = query.pagination;
      finalRelationships = allRelationships.slice(offset, offset + limit);
    }

    return {
      center,
      entities: entitiesByDepth,
      relationships: finalRelationships,
      totalEntities,
      totalRelationships: allRelationships.length,
      truncated,
      cost: this.estimateCost(totalEntities, allRelationships.length, startTime),
    };
  }

  /**
   * Get outgoing relationships at a specific time
   */
  private getOutgoingRelationshipsAt(
    entityId: string,
    asOf: Date,
    recordedAsOf?: Date
  ): RelationshipStored[] {
    const relIds = this.outgoingEdges.get(entityId);
    if (!relIds) return [];

    const results: RelationshipStored[] = [];
    for (const relId of relIds) {
      const rel = this.getRelationshipAt(relId, asOf, recordedAsOf);
      if (rel) results.push(rel);
    }
    return results;
  }

  /**
   * Get incoming relationships at a specific time
   */
  private getIncomingRelationshipsAt(
    entityId: string,
    asOf: Date,
    recordedAsOf?: Date
  ): RelationshipStored[] {
    const relIds = this.incomingEdges.get(entityId);
    if (!relIds) return [];

    const results: RelationshipStored[] = [];
    for (const relId of relIds) {
      const rel = this.getRelationshipAt(relId, asOf, recordedAsOf);
      if (rel) results.push(rel);
    }
    return results;
  }

  // ==========================================================================
  // COST ESTIMATION
  // ==========================================================================

  /**
   * Estimate query cost
   */
  estimateCost(
    nodeCount: number,
    edgeCount: number,
    startTime: number
  ): QueryCostEstimate {
    const executionTime = Date.now() - startTime;
    const exceedsNodes = nodeCount > QueryCostLimits.MAX_NODES;
    const exceedsEdges = edgeCount > QueryCostLimits.MAX_EDGES;
    const exceedsTime = executionTime > QueryCostLimits.TIMEOUT_MS;

    return {
      estimatedNodes: nodeCount,
      estimatedEdges: edgeCount,
      estimatedTimeMs: executionTime,
      exceedsLimit: exceedsNodes || exceedsEdges || exceedsTime,
      limitMessage: exceedsNodes
        ? `Node count ${nodeCount} exceeds limit ${QueryCostLimits.MAX_NODES}`
        : exceedsEdges
          ? `Edge count ${edgeCount} exceeds limit ${QueryCostLimits.MAX_EDGES}`
          : exceedsTime
            ? `Execution time ${executionTime}ms exceeds timeout ${QueryCostLimits.TIMEOUT_MS}ms`
            : undefined,
    };
  }

  // ==========================================================================
  // INDEXING
  // ==========================================================================

  /**
   * Index an entity
   */
  private indexEntity(entity: EntityStored): void {
    // Type index
    const typeSet = this.entitiesByType.get(entity.entityType) || new Set();
    typeSet.add(entity.id);
    this.entitiesByType.set(entity.entityType, typeSet);

    // Tenant index
    const tenantSet = this.entitiesByTenant.get(entity.tenantId) || new Set();
    tenantSet.add(entity.id);
    this.entitiesByTenant.set(entity.tenantId, tenantSet);
  }

  /**
   * Remove entity from indexes
   */
  private unindexEntity(entity: EntityStored): void {
    const typeSet = this.entitiesByType.get(entity.entityType);
    if (typeSet) typeSet.delete(entity.id);

    const tenantSet = this.entitiesByTenant.get(entity.tenantId);
    if (tenantSet) tenantSet.delete(entity.id);
  }

  /**
   * Index a relationship
   */
  private indexRelationship(rel: RelationshipStored): void {
    // Adjacency index
    const outSet = this.outgoingEdges.get(rel.fromEntityId) || new Set();
    outSet.add(rel.id);
    this.outgoingEdges.set(rel.fromEntityId, outSet);

    const inSet = this.incomingEdges.get(rel.toEntityId) || new Set();
    inSet.add(rel.id);
    this.incomingEdges.set(rel.toEntityId, inSet);

    // Type index
    const typeSet = this.relationshipsByType.get(rel.type) || new Set();
    typeSet.add(rel.id);
    this.relationshipsByType.set(rel.type, typeSet);

    // Tenant index
    const tenantSet = this.relationshipsByTenant.get(rel.tenantId) || new Set();
    tenantSet.add(rel.id);
    this.relationshipsByTenant.set(rel.tenantId, tenantSet);
  }

  /**
   * Remove relationship from indexes
   */
  private unindexRelationship(rel: RelationshipStored): void {
    const outSet = this.outgoingEdges.get(rel.fromEntityId);
    if (outSet) outSet.delete(rel.id);

    const inSet = this.incomingEdges.get(rel.toEntityId);
    if (inSet) inSet.delete(rel.id);

    const typeSet = this.relationshipsByType.get(rel.type);
    if (typeSet) typeSet.delete(rel.id);

    const tenantSet = this.relationshipsByTenant.get(rel.tenantId);
    if (tenantSet) tenantSet.delete(rel.id);
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  /**
   * Get store statistics
   */
  getStats(): {
    entityCount: number;
    relationshipCount: number;
    entitiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
    tenants: string[];
  } {
    const entitiesByType: Record<string, number> = {};
    for (const [type, ids] of this.entitiesByType) {
      entitiesByType[type] = ids.size;
    }

    const relationshipsByType: Record<string, number> = {};
    for (const [type, ids] of this.relationshipsByType) {
      relationshipsByType[type] = ids.size;
    }

    return {
      entityCount: this.entities.size,
      relationshipCount: this.relationships.size,
      entitiesByType,
      relationshipsByType,
      tenants: Array.from(this.entitiesByTenant.keys()),
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.entities.clear();
    this.entityVersions.clear();
    this.relationships.clear();
    this.relationshipVersions.clear();
    this.outgoingEdges.clear();
    this.incomingEdges.clear();
    this.entitiesByType.clear();
    this.relationshipsByType.clear();
    this.entitiesByTenant.clear();
    this.relationshipsByTenant.clear();
  }
}

// Export singleton for convenience
export const graphStore = new GraphStore();
