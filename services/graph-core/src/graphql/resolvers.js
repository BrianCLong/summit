"use strict";
/**
 * GraphQL Resolvers for Graph Core
 *
 * Implements all queries and mutations for the canonical graph model.
 *
 * @module graph-core/graphql/resolvers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_1 = require("graphql");
const index_js_1 = require("../canonical/index.js");
// =============================================================================
// CUSTOM SCALARS
// =============================================================================
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO 8601 date-time string',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            return new Date(value).toISOString();
        }
        throw new Error('DateTime cannot represent an invalid value');
    },
    parseValue(value) {
        if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid DateTime string');
            }
            return date;
        }
        throw new Error('DateTime must be a string');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid DateTime string');
            }
            return date;
        }
        return null;
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        switch (ast.kind) {
            case graphql_1.Kind.STRING:
                return ast.value;
            case graphql_1.Kind.BOOLEAN:
                return ast.value;
            case graphql_1.Kind.INT:
                return parseInt(ast.value, 10);
            case graphql_1.Kind.FLOAT:
                return parseFloat(ast.value);
            case graphql_1.Kind.OBJECT: {
                const obj = {};
                ast.fields.forEach((field) => {
                    obj[field.name.value] = JSONScalar.parseLiteral(field.value);
                });
                return obj;
            }
            case graphql_1.Kind.LIST:
                return ast.values.map((v) => JSONScalar.parseLiteral(v));
            case graphql_1.Kind.NULL:
                return null;
            default:
                return null;
        }
    },
});
const UUIDScalar = new graphql_1.GraphQLScalarType({
    name: 'UUID',
    description: 'UUID string',
    serialize(value) {
        if (typeof value === 'string') {
            return value;
        }
        throw new Error('UUID must be a string');
    },
    parseValue(value) {
        if (typeof value === 'string') {
            // Basic UUID validation
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
                throw new Error('Invalid UUID format');
            }
            return value;
        }
        throw new Error('UUID must be a string');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
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
function toEntityInput(input) {
    return {
        id: input.id,
        canonicalId: input.canonicalId,
        tenantId: input.tenantId || 'default',
        entityType: input.entityType,
        label: input.label,
        description: input.description,
        properties: input.properties || {},
        customMetadata: input.customMetadata,
        confidence: input.confidence ?? 0.5,
        source: input.source || 'graphql',
        provenance: input.provenance,
        policyLabels: input.policyLabels,
        validFrom: input.validFrom
            ? new Date(input.validFrom)
            : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
        observedAt: input.observedAt
            ? new Date(input.observedAt)
            : null,
        createdBy: input.createdBy || 'system',
        tags: input.tags || [],
        investigationId: input.investigationId,
        caseId: input.caseId,
    };
}
/**
 * Convert GraphQL input to canonical RelationshipInput
 */
function toRelationshipInput(input) {
    return {
        id: input.id,
        tenantId: input.tenantId || 'default',
        type: input.type,
        label: input.label,
        description: input.description,
        fromEntityId: input.fromEntityId,
        toEntityId: input.toEntityId,
        directed: input.directed !== false,
        weight: input.weight,
        properties: input.properties || {},
        customMetadata: input.customMetadata,
        confidence: input.confidence ?? 0.5,
        source: input.source || 'graphql',
        provenance: input.provenance,
        policyLabels: input.policyLabels,
        validFrom: input.validFrom
            ? new Date(input.validFrom)
            : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
        observedAt: input.observedAt
            ? new Date(input.observedAt)
            : null,
        since: input.since ? new Date(input.since) : undefined,
        until: input.until ? new Date(input.until) : undefined,
        createdBy: input.createdBy || 'system',
        investigationId: input.investigationId,
        caseId: input.caseId,
    };
}
// =============================================================================
// RESOLVERS
// =============================================================================
exports.resolvers = {
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
        entity: (_, args) => {
            return index_js_1.graphStore.getEntity(args.id) || null;
        },
        /**
         * Get entity at a specific point in time (bitemporal query)
         */
        entityAt: (_, args) => {
            return index_js_1.graphStore.getEntityAt(args.id, args.asOf, args.recordedAsOf) || null;
        },
        /**
         * Get all versions of an entity
         */
        entityVersions: (_, args) => {
            return index_js_1.graphStore.getEntityVersions(args.id);
        },
        /**
         * List entities with filtering and pagination
         */
        entities: (_, args) => {
            const { filter, pagination } = args;
            const limit = Math.min(pagination?.limit || 20, 100);
            const offset = pagination?.offset || 0;
            // Get all entities (in production, this would be a database query)
            let entities = [];
            if (filter?.entityTypes && filter.entityTypes.length > 0) {
                for (const type of filter.entityTypes) {
                    entities.push(...index_js_1.graphStore.getEntitiesByType(type));
                }
            }
            else if (filter?.tenantId) {
                entities = index_js_1.graphStore.getEntitiesByTenant(filter.tenantId);
            }
            else {
                // Get stats to know all entity types
                const stats = index_js_1.graphStore.getStats();
                for (const type of Object.keys(stats.entitiesByType)) {
                    entities.push(...index_js_1.graphStore.getEntitiesByType(type));
                }
            }
            // Apply filters
            if (filter) {
                if (filter.minConfidence !== undefined) {
                    entities = entities.filter((e) => e.confidence >= filter.minConfidence);
                }
                if (filter.tags && filter.tags.length > 0) {
                    entities = entities.filter((e) => filter.tags.some((tag) => e.tags.includes(tag)));
                }
                if (filter.investigationId) {
                    entities = entities.filter((e) => e.investigationId === filter.investigationId);
                }
                if (filter.caseId) {
                    entities = entities.filter((e) => e.caseId === filter.caseId);
                }
                if (filter.temporal?.asOf) {
                    entities = entities.filter((e) => {
                        if (e.validFrom && e.validFrom > filter.temporal.asOf)
                            return false;
                        if (e.validTo && e.validTo <= filter.temporal.asOf)
                            return false;
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
        relationship: (_, args) => {
            return index_js_1.graphStore.getRelationship(args.id) || null;
        },
        /**
         * Get relationship at a specific point in time
         */
        relationshipAt: (_, args) => {
            return (index_js_1.graphStore.getRelationshipAt(args.id, args.asOf, args.recordedAsOf) ||
                null);
        },
        /**
         * List relationships with filtering and pagination
         */
        relationships: (_, args) => {
            const { filter, pagination } = args;
            const limit = Math.min(pagination?.limit || 20, 100);
            const offset = pagination?.offset || 0;
            // This is simplified - in production would be a database query
            const stats = index_js_1.graphStore.getStats();
            let relationships = [];
            for (const entityType of Object.keys(stats.entitiesByType)) {
                const entities = index_js_1.graphStore.getEntitiesByType(entityType);
                for (const entity of entities) {
                    relationships.push(...index_js_1.graphStore.getOutgoingRelationships(entity.id));
                }
            }
            // Dedupe
            relationships = Array.from(new Map(relationships.map((r) => [r.id, r])).values());
            // Apply filters
            if (filter) {
                if (filter.types && filter.types.length > 0) {
                    relationships = relationships.filter((r) => filter.types.includes(r.type));
                }
                if (filter.tenantId) {
                    relationships = relationships.filter((r) => r.tenantId === filter.tenantId);
                }
                if (filter.minConfidence !== undefined) {
                    relationships = relationships.filter((r) => r.confidence >= filter.minConfidence);
                }
                if (filter.temporal?.asOf) {
                    relationships = relationships.filter((r) => {
                        if (r.validFrom && r.validFrom > filter.temporal.asOf)
                            return false;
                        if (r.validTo && r.validTo <= filter.temporal.asOf)
                            return false;
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
        snapshot: (_, args) => {
            return index_js_1.graphStore.getSnapshot(args.asOf, args.recordedAsOf);
        },
        /**
         * Query neighborhood with time-travel support
         */
        neighborhood: (_, args) => {
            const query = {
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
            const result = index_js_1.graphStore.queryNeighborhood(query);
            // Convert Map to array of arrays for GraphQL
            const entitiesByDepth = [];
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
            return index_js_1.graphStore.getStats();
        },
        /**
         * Validate policy labels
         */
        validatePolicyLabels: (_, args) => {
            const result = (0, index_js_1.validatePolicyLabels)(args.input);
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
        upsertEntity: (_, args) => {
            const entityInput = toEntityInput(args.input);
            const validation = (0, index_js_1.validateEntityInput)(entityInput);
            if (!validation.success) {
                const errors = validation.error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new Error(`Validation failed: ${errors}`);
            }
            return index_js_1.graphStore.upsertEntity(validation.data);
        },
        /**
         * Create or update a relationship
         */
        upsertRelationship: (_, args) => {
            const relInput = toRelationshipInput(args.input);
            const validation = (0, index_js_1.validateRelationshipInput)(relInput);
            if (!validation.success) {
                const errors = validation.error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new Error(`Validation failed: ${errors}`);
            }
            return index_js_1.graphStore.upsertRelationship(validation.data);
        },
        /**
         * Delete an entity (soft delete by setting validTo)
         */
        deleteEntity: (_, args) => {
            const entity = index_js_1.graphStore.getEntity(args.id);
            if (!entity) {
                return null;
            }
            // Soft delete by setting validTo
            return index_js_1.graphStore.upsertEntity({
                ...entity,
                validTo: args.validTo || new Date(),
            });
        },
        /**
         * Delete a relationship (soft delete by setting validTo)
         */
        deleteRelationship: (_, args) => {
            const rel = index_js_1.graphStore.getRelationship(args.id);
            if (!rel) {
                return null;
            }
            return index_js_1.graphStore.upsertRelationship({
                ...rel,
                validTo: args.validTo || new Date(),
            });
        },
        /**
         * Update policy labels for an entity
         */
        updateEntityPolicyLabels: (_, args) => {
            const entity = index_js_1.graphStore.getEntity(args.id);
            if (!entity) {
                throw new Error(`Entity ${args.id} not found`);
            }
            const validation = (0, index_js_1.validatePolicyLabels)(args.policyLabels);
            if (!validation.success) {
                const errors = validation.error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new Error(`Policy labels validation failed: ${errors}`);
            }
            return index_js_1.graphStore.upsertEntity({
                ...entity,
                policyLabels: validation.data,
            });
        },
        /**
         * Update policy labels for a relationship
         */
        updateRelationshipPolicyLabels: (_, args) => {
            const rel = index_js_1.graphStore.getRelationship(args.id);
            if (!rel) {
                throw new Error(`Relationship ${args.id} not found`);
            }
            const validation = (0, index_js_1.validatePolicyLabels)(args.policyLabels);
            if (!validation.success) {
                const errors = validation.error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new Error(`Policy labels validation failed: ${errors}`);
            }
            return index_js_1.graphStore.upsertRelationship({
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
        outgoingRelationships: (entity, args) => {
            let rels = index_js_1.graphStore.getOutgoingRelationships(entity.id);
            if (args.types && args.types.length > 0) {
                rels = rels.filter((r) => args.types.includes(r.type));
            }
            const limit = Math.min(args.limit || 20, 100);
            const offset = args.offset || 0;
            return rels.slice(offset, offset + limit);
        },
        /**
         * Resolve incoming relationships for an entity
         */
        incomingRelationships: (entity, args) => {
            let rels = index_js_1.graphStore.getIncomingRelationships(entity.id);
            if (args.types && args.types.length > 0) {
                rels = rels.filter((r) => args.types.includes(r.type));
            }
            const limit = Math.min(args.limit || 20, 100);
            const offset = args.offset || 0;
            return rels.slice(offset, offset + limit);
        },
        /**
         * Resolve all versions of an entity
         */
        versions: (entity) => {
            return index_js_1.graphStore.getEntityVersions(entity.id);
        },
    },
    Relationship: {
        /**
         * Resolve source entity
         */
        fromEntity: (rel) => {
            return index_js_1.graphStore.getEntity(rel.fromEntityId) || null;
        },
        /**
         * Resolve target entity
         */
        toEntity: (rel) => {
            return index_js_1.graphStore.getEntity(rel.toEntityId) || null;
        },
        /**
         * Resolve all versions of a relationship
         */
        versions: (rel) => {
            // Would need to implement getRelationshipVersions in store
            return [rel];
        },
    },
};
