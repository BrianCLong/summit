/**
 * GraphQL Resolvers for Graph Core
 *
 * Implements all queries and mutations for the canonical graph model.
 *
 * @module graph-core/graphql/resolvers
 */

import { GraphQLScalarType, Kind } from 'graphql';
import {
  graphStore,
  CanonicalEntityType,
  CanonicalRelationshipType,
  SensitivityLevel,
  ClearanceLevel,
  RetentionClass,
  validateEntityInput,
  validateRelationshipInput,
  validatePolicyLabels,
  requiresLegalBasis,
} from '../canonical/index.js';
import type {
  EntityInput,
  RelationshipInput,
  NeighborhoodQuery,
  EntityStored,
  RelationshipStored,
} from '../canonical/index.js';

// =============================================================================
// CUSTOM SCALARS
// =============================================================================

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new Error('DateTime cannot represent an invalid value');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid DateTime string');
      }
      return date;
    }
    throw new Error('DateTime must be a string');
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid DateTime string');
      }
      return date;
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {};
        ast.fields.forEach((field) => {
          obj[field.name.value] = JSONScalar.parseLiteral(field.value);
        });
        return obj;
      }
      case Kind.LIST:
        return ast.values.map((v) => JSONScalar.parseLiteral(v));
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  },
});

const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID string',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('UUID must be a string');
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      // Basic UUID validation
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid UUID format');
      }
      return value;
    }
    throw new Error('UUID must be a string');
  },
  parseLiteral(ast): string | null {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    return null;
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert GraphQL input to canonical EntityInput
 */
function toEntityInput(input: Record<string, unknown>): EntityInput {
  return {
    id: input.id as string | undefined,
    canonicalId: input.canonicalId as string | null | undefined,
    tenantId: (input.tenantId as string) || 'default',
    entityType: input.entityType as CanonicalEntityType,
    label: input.label as string,
    description: input.description as string | undefined,
    properties: (input.properties as Record<string, unknown>) || {},
    customMetadata: input.customMetadata as Record<string, unknown> | undefined,
    confidence: (input.confidence as number) ?? 0.5,
    source: (input.source as string) || 'graphql',
    provenance: input.provenance as EntityInput['provenance'],
    policyLabels: input.policyLabels as EntityInput['policyLabels'],
    validFrom: input.validFrom
      ? new Date(input.validFrom as string)
      : null,
    validTo: input.validTo ? new Date(input.validTo as string) : null,
    observedAt: input.observedAt
      ? new Date(input.observedAt as string)
      : null,
    createdBy: (input.createdBy as string) || 'system',
    tags: (input.tags as string[]) || [],
    investigationId: input.investigationId as string | undefined,
    caseId: input.caseId as string | undefined,
  };
}

/**
 * Convert GraphQL input to canonical RelationshipInput
 */
function toRelationshipInput(input: Record<string, unknown>): RelationshipInput {
  return {
    id: input.id as string | undefined,
    tenantId: (input.tenantId as string) || 'default',
    type: input.type as CanonicalRelationshipType,
    label: input.label as string | undefined,
    description: input.description as string | undefined,
    fromEntityId: input.fromEntityId as string,
    toEntityId: input.toEntityId as string,
    directed: input.directed !== false,
    weight: input.weight as number | undefined,
    properties: (input.properties as Record<string, unknown>) || {},
    customMetadata: input.customMetadata as Record<string, unknown> | undefined,
    confidence: (input.confidence as number) ?? 0.5,
    source: (input.source as string) || 'graphql',
    provenance: input.provenance as RelationshipInput['provenance'],
    policyLabels: input.policyLabels as RelationshipInput['policyLabels'],
    validFrom: input.validFrom
      ? new Date(input.validFrom as string)
      : null,
    validTo: input.validTo ? new Date(input.validTo as string) : null,
    observedAt: input.observedAt
      ? new Date(input.observedAt as string)
      : null,
    since: input.since ? new Date(input.since as string) : undefined,
    until: input.until ? new Date(input.until as string) : undefined,
    createdBy: (input.createdBy as string) || 'system',
    investigationId: input.investigationId as string | undefined,
    caseId: input.caseId as string | undefined,
  };
}

// =============================================================================
// RESOLVERS
// =============================================================================

export const resolvers = {
  // Scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  UUID: UUIDScalar,

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  Query: {
    /**
     * Get entity by ID
     */
    entity: (_: unknown, args: { id: string }) => {
      return graphStore.getEntity(args.id) || null;
    },

    /**
     * Get entity at a specific point in time (bitemporal query)
     */
    entityAt: (
      _: unknown,
      args: { id: string; asOf: Date; recordedAsOf?: Date }
    ) => {
      return graphStore.getEntityAt(args.id, args.asOf, args.recordedAsOf) || null;
    },

    /**
     * Get all versions of an entity
     */
    entityVersions: (_: unknown, args: { id: string }) => {
      return graphStore.getEntityVersions(args.id);
    },

    /**
     * List entities with filtering and pagination
     */
    entities: (
      _: unknown,
      args: {
        filter?: {
          entityTypes?: CanonicalEntityType[];
          tenantId?: string;
          minConfidence?: number;
          clearance?: ClearanceLevel;
          tags?: string[];
          investigationId?: string;
          caseId?: string;
          temporal?: {
            asOf?: Date;
            recordedAsOf?: Date;
          };
        };
        pagination?: {
          limit?: number;
          offset?: number;
        };
      }
    ) => {
      const { filter, pagination } = args;
      const limit = Math.min(pagination?.limit || 20, 100);
      const offset = pagination?.offset || 0;

      // Get all entities (in production, this would be a database query)
      let entities: EntityStored[] = [];

      if (filter?.entityTypes && filter.entityTypes.length > 0) {
        for (const type of filter.entityTypes) {
          entities.push(...graphStore.getEntitiesByType(type));
        }
      } else if (filter?.tenantId) {
        entities = graphStore.getEntitiesByTenant(filter.tenantId);
      } else {
        // Get stats to know all entity types
        const stats = graphStore.getStats();
        for (const type of Object.keys(stats.entitiesByType)) {
          entities.push(
            ...graphStore.getEntitiesByType(type as CanonicalEntityType)
          );
        }
      }

      // Apply filters
      if (filter) {
        if (filter.minConfidence !== undefined) {
          entities = entities.filter(
            (e) => e.confidence >= filter.minConfidence!
          );
        }
        if (filter.tags && filter.tags.length > 0) {
          entities = entities.filter((e) =>
            filter.tags!.some((tag) => e.tags.includes(tag))
          );
        }
        if (filter.investigationId) {
          entities = entities.filter(
            (e) => e.investigationId === filter.investigationId
          );
        }
        if (filter.caseId) {
          entities = entities.filter((e) => e.caseId === filter.caseId);
        }
        if (filter.temporal?.asOf) {
          entities = entities.filter((e) => {
            if (e.validFrom && e.validFrom > filter.temporal!.asOf!) return false;
            if (e.validTo && e.validTo <= filter.temporal!.asOf!) return false;
            return true;
          });
        }
      }

      const totalCount = entities.length;
      const paginatedEntities = entities.slice(offset, offset + limit);

      return {
        nodes: paginatedEntities,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    },

    /**
     * Get relationship by ID
     */
    relationship: (_: unknown, args: { id: string }) => {
      return graphStore.getRelationship(args.id) || null;
    },

    /**
     * Get relationship at a specific point in time
     */
    relationshipAt: (
      _: unknown,
      args: { id: string; asOf: Date; recordedAsOf?: Date }
    ) => {
      return (
        graphStore.getRelationshipAt(args.id, args.asOf, args.recordedAsOf) ||
        null
      );
    },

    /**
     * List relationships with filtering and pagination
     */
    relationships: (
      _: unknown,
      args: {
        filter?: {
          types?: CanonicalRelationshipType[];
          tenantId?: string;
          minConfidence?: number;
          clearance?: ClearanceLevel;
          temporal?: {
            asOf?: Date;
            recordedAsOf?: Date;
          };
        };
        pagination?: {
          limit?: number;
          offset?: number;
        };
      }
    ) => {
      const { filter, pagination } = args;
      const limit = Math.min(pagination?.limit || 20, 100);
      const offset = pagination?.offset || 0;

      // This is simplified - in production would be a database query
      const stats = graphStore.getStats();
      let relationships: RelationshipStored[] = [];

      for (const entityType of Object.keys(stats.entitiesByType)) {
        const entities = graphStore.getEntitiesByType(
          entityType as CanonicalEntityType
        );
        for (const entity of entities) {
          relationships.push(...graphStore.getOutgoingRelationships(entity.id));
        }
      }

      // Dedupe
      relationships = Array.from(
        new Map(relationships.map((r) => [r.id, r])).values()
      );

      // Apply filters
      if (filter) {
        if (filter.types && filter.types.length > 0) {
          relationships = relationships.filter((r) =>
            filter.types!.includes(r.type)
          );
        }
        if (filter.tenantId) {
          relationships = relationships.filter(
            (r) => r.tenantId === filter.tenantId
          );
        }
        if (filter.minConfidence !== undefined) {
          relationships = relationships.filter(
            (r) => r.confidence >= filter.minConfidence!
          );
        }
        if (filter.temporal?.asOf) {
          relationships = relationships.filter((r) => {
            if (r.validFrom && r.validFrom > filter.temporal!.asOf!) return false;
            if (r.validTo && r.validTo <= filter.temporal!.asOf!) return false;
            return true;
          });
        }
      }

      const totalCount = relationships.length;
      const paginatedRelationships = relationships.slice(offset, offset + limit);

      return {
        nodes: paginatedRelationships,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    },

    /**
     * Get a snapshot of the graph at a specific point in time
     */
    snapshot: (
      _: unknown,
      args: { asOf: Date; recordedAsOf?: Date }
    ) => {
      return graphStore.getSnapshot(args.asOf, args.recordedAsOf);
    },

    /**
     * Query neighborhood with time-travel support
     */
    neighborhood: (
      _: unknown,
      args: {
        query: {
          entityId: string;
          depth?: number;
          entityTypes?: CanonicalEntityType[];
          relationshipTypes?: CanonicalRelationshipType[];
          minConfidence?: number;
          clearance?: ClearanceLevel;
          temporal?: {
            asOf?: Date;
            recordedAsOf?: Date;
          };
          pagination?: {
            limit?: number;
            offset?: number;
          };
        };
      }
    ) => {
      const query: NeighborhoodQuery = {
        entityId: args.query.entityId,
        depth: Math.min(args.query.depth || 2, 5),
        entityTypes: args.query.entityTypes,
        relationshipTypes: args.query.relationshipTypes,
        minConfidence: args.query.minConfidence,
        clearance: args.query.clearance,
        temporal: args.query.temporal
          ? {
              asOf: args.query.temporal.asOf,
              recordedAsOf: args.query.temporal.recordedAsOf,
            }
          : undefined,
        pagination: args.query.pagination
          ? {
              limit: Math.min(args.query.pagination.limit || 20, 100),
              offset: args.query.pagination.offset || 0,
            }
          : undefined,
      };

      const result = graphStore.queryNeighborhood(query);

      // Convert Map to array of arrays for GraphQL
      const entitiesByDepth: EntityStored[][] = [];
      for (let i = 0; i <= query.depth; i++) {
        entitiesByDepth.push(result.entities.get(i) || []);
      }

      return {
        center: result.center,
        entitiesByDepth,
        relationships: result.relationships,
        totalEntities: result.totalEntities,
        totalRelationships: result.totalRelationships,
        truncated: result.truncated,
        cost: result.cost,
      };
    },

    /**
     * Get store statistics
     */
    stats: () => {
      return graphStore.getStats();
    },

    /**
     * Validate policy labels
     */
    validatePolicyLabels: (
      _: unknown,
      args: { input: Record<string, unknown> }
    ) => {
      const result = validatePolicyLabels(args.input);
      if (result.success) {
        return {
          valid: true,
          errors: [],
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        warnings: [],
      };
    },
  },

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  Mutation: {
    /**
     * Create or update an entity
     */
    upsertEntity: (
      _: unknown,
      args: { input: Record<string, unknown> }
    ) => {
      const entityInput = toEntityInput(args.input);
      const validation = validateEntityInput(entityInput);

      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Validation failed: ${errors}`);
      }

      return graphStore.upsertEntity(validation.data);
    },

    /**
     * Create or update a relationship
     */
    upsertRelationship: (
      _: unknown,
      args: { input: Record<string, unknown> }
    ) => {
      const relInput = toRelationshipInput(args.input);
      const validation = validateRelationshipInput(relInput);

      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Validation failed: ${errors}`);
      }

      return graphStore.upsertRelationship(validation.data);
    },

    /**
     * Delete an entity (soft delete by setting validTo)
     */
    deleteEntity: (
      _: unknown,
      args: { id: string; validTo?: Date }
    ) => {
      const entity = graphStore.getEntity(args.id);
      if (!entity) {
        return null;
      }

      // Soft delete by setting validTo
      return graphStore.upsertEntity({
        ...entity,
        validTo: args.validTo || new Date(),
      });
    },

    /**
     * Delete a relationship (soft delete by setting validTo)
     */
    deleteRelationship: (
      _: unknown,
      args: { id: string; validTo?: Date }
    ) => {
      const rel = graphStore.getRelationship(args.id);
      if (!rel) {
        return null;
      }

      return graphStore.upsertRelationship({
        ...rel,
        validTo: args.validTo || new Date(),
      });
    },

    /**
     * Update policy labels for an entity
     */
    updateEntityPolicyLabels: (
      _: unknown,
      args: { id: string; policyLabels: Record<string, unknown> }
    ) => {
      const entity = graphStore.getEntity(args.id);
      if (!entity) {
        throw new Error(`Entity ${args.id} not found`);
      }

      const validation = validatePolicyLabels(args.policyLabels);
      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Policy labels validation failed: ${errors}`);
      }

      return graphStore.upsertEntity({
        ...entity,
        policyLabels: validation.data,
      });
    },

    /**
     * Update policy labels for a relationship
     */
    updateRelationshipPolicyLabels: (
      _: unknown,
      args: { id: string; policyLabels: Record<string, unknown> }
    ) => {
      const rel = graphStore.getRelationship(args.id);
      if (!rel) {
        throw new Error(`Relationship ${args.id} not found`);
      }

      const validation = validatePolicyLabels(args.policyLabels);
      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new Error(`Policy labels validation failed: ${errors}`);
      }

      return graphStore.upsertRelationship({
        ...rel,
        policyLabels: validation.data,
      });
    },
  },

  // ==========================================================================
  // TYPE RESOLVERS
  // ==========================================================================

  Entity: {
    /**
     * Resolve outgoing relationships for an entity
     */
    outgoingRelationships: (
      entity: EntityStored,
      args: { types?: CanonicalRelationshipType[]; limit?: number; offset?: number }
    ) => {
      let rels = graphStore.getOutgoingRelationships(entity.id);

      if (args.types && args.types.length > 0) {
        rels = rels.filter((r) => args.types!.includes(r.type));
      }

      const limit = Math.min(args.limit || 20, 100);
      const offset = args.offset || 0;

      return rels.slice(offset, offset + limit);
    },

    /**
     * Resolve incoming relationships for an entity
     */
    incomingRelationships: (
      entity: EntityStored,
      args: { types?: CanonicalRelationshipType[]; limit?: number; offset?: number }
    ) => {
      let rels = graphStore.getIncomingRelationships(entity.id);

      if (args.types && args.types.length > 0) {
        rels = rels.filter((r) => args.types!.includes(r.type));
      }

      const limit = Math.min(args.limit || 20, 100);
      const offset = args.offset || 0;

      return rels.slice(offset, offset + limit);
    },

    /**
     * Resolve all versions of an entity
     */
    versions: (entity: EntityStored) => {
      return graphStore.getEntityVersions(entity.id);
    },
  },

  Relationship: {
    /**
     * Resolve source entity
     */
    fromEntity: (rel: RelationshipStored) => {
      return graphStore.getEntity(rel.fromEntityId) || null;
    },

    /**
     * Resolve target entity
     */
    toEntity: (rel: RelationshipStored) => {
      return graphStore.getEntity(rel.toEntityId) || null;
    },

    /**
     * Resolve all versions of a relationship
     */
    versions: (rel: RelationshipStored) => {
      // Would need to implement getRelationshipVersions in store
      return [rel];
    },
  },
};
