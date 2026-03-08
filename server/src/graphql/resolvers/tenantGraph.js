"use strict";
// @ts-nocheck
/**
 * Tenant Graph Slice v0 - Resolvers
 * Multi-tenant graph query API with provenance tracking
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantGraphResolvers = void 0;
const EntityRepo_js_1 = require("../../repos/EntityRepo.js");
const ProvenanceRepo_js_1 = require("../../repos/ProvenanceRepo.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const opa_client_js_1 = require("../../services/opa-client.js");
const graphLogger = logger_js_1.default.child({ name: 'TenantGraphResolvers' });
exports.tenantGraphResolvers = {
    Query: {
        /**
         * Get entity by ID with tenant scope and ABAC
         */
        async entityById(_parent, args, context) {
            const startTime = Date.now();
            try {
                // Verify tenant access via OPA
                await (0, opa_client_js_1.verifyTenantAccess)(context.user, args.tenantId, 'entity:read');
                const repo = new EntityRepo_js_1.EntityRepo(context.pg, context.neo4j);
                const entity = await repo.findById(args.id, args.tenantId);
                if (!entity) {
                    return null;
                }
                // Check purpose-based access for PII fields
                const canAccessPII = await (0, opa_client_js_1.checkPurpose)(context.user, ['investigation', 'threat-intel']);
                // Redact PII if no proper purpose
                if (!canAccessPII) {
                    entity.props = redactPII(entity.props, entity.kind);
                }
                graphLogger.info({
                    operation: 'entityById',
                    entityId: args.id,
                    tenantId: args.tenantId,
                    took: Date.now() - startTime,
                });
                return mapEntityToGraphQL(entity);
            }
            catch (error) {
                graphLogger.error({
                    operation: 'entityById',
                    error,
                    args,
                });
                throw error;
            }
        },
        /**
         * Search entities by query with tenant scope
         * Target: p95 ≤ 350ms
         */
        async searchEntities(_parent, args, context) {
            const startTime = Date.now();
            try {
                await (0, opa_client_js_1.verifyTenantAccess)(context.user, args.tenantId, 'entity:read');
                const limit = Math.min(args.limit || 25, 100);
                const offset = args.offset || 0;
                const session = context.neo4j.session();
                try {
                    // Use full-text search index (created in migrations)
                    let cypher = `
            CALL db.index.fulltext.queryNodes('entitySearch', $query)
            YIELD node, score
            WHERE node.tenantId = $tenantId
          `;
                    if (args.labelFilter && args.labelFilter.length > 0) {
                        cypher += ` AND any(label IN labels(node) WHERE label IN $labelFilter)`;
                    }
                    cypher += `
            RETURN node, score
            ORDER BY score DESC
            SKIP $offset
            LIMIT $limit
          `;
                    const result = await session.run(cypher, {
                        query: args.q,
                        tenantId: args.tenantId,
                        labelFilter: args.labelFilter || [],
                        offset,
                        limit: limit + 1, // Fetch one extra to check hasMore
                    });
                    const entities = result.records.slice(0, limit).map((record) => {
                        const node = record.get('node');
                        const score = record.get('score');
                        return {
                            ...node.properties,
                            labels: node.labels,
                            score,
                        };
                    });
                    const took = Date.now() - startTime;
                    graphLogger.info({
                        operation: 'searchEntities',
                        query: args.q,
                        tenantId: args.tenantId,
                        results: entities.length,
                        took,
                    });
                    // SLO check: warn if > 350ms p95 target
                    if (took > 350) {
                        graphLogger.warn({
                            sloViolation: 'searchEntities',
                            target: 350,
                            actual: took,
                        });
                    }
                    return {
                        entities,
                        total: entities.length,
                        hasMore: result.records.length > limit,
                        took,
                    };
                }
                finally {
                    await session.close();
                }
            }
            catch (error) {
                graphLogger.error({
                    operation: 'searchEntities',
                    error,
                    args,
                });
                throw error;
            }
        },
        /**
         * Get neighbors with configurable hop depth
         * Target: 1-hop p95 ≤ 300ms, 2-hop p95 ≤ 1200ms
         */
        async neighbors(_parent, args, context) {
            const startTime = Date.now();
            try {
                await (0, opa_client_js_1.verifyTenantAccess)(context.user, args.tenantId, 'entity:read');
                const hops = Math.min(args.hops || 2, 3); // Max 3 hops
                const limit = Math.min(args.limit || 50, 200);
                const session = context.neo4j.session();
                try {
                    // Variable-length path query with filters
                    let cypher = `
            MATCH (start {id: $id, tenantId: $tenantId})
            MATCH path = (start)-[r*1..${hops}]-(neighbor)
            WHERE neighbor.tenantId = $tenantId
          `;
                    // Apply filters
                    if (args.filter?.labelIn && args.filter.labelIn.length > 0) {
                        cypher += ` AND any(label IN labels(neighbor) WHERE label IN $labelFilter)`;
                    }
                    if (args.filter?.edgeIn && args.filter.edgeIn.length > 0) {
                        cypher += ` AND all(rel IN r WHERE type(rel) IN $edgeFilter)`;
                    }
                    if (args.filter?.minConfidence !== undefined) {
                        cypher += ` AND all(rel IN r WHERE rel.confidence >= $minConfidence)`;
                    }
                    cypher += `
            WITH DISTINCT neighbor, relationships(path) AS rels, length(path) AS distance
            ORDER BY distance, neighbor.id
            LIMIT $limit
            RETURN neighbor, rels
          `;
                    const result = await session.run(cypher, {
                        id: args.id,
                        tenantId: args.tenantId,
                        labelFilter: args.filter?.labelIn || [],
                        edgeFilter: args.filter?.edgeIn || [],
                        minConfidence: args.filter?.minConfidence || 0,
                        limit,
                    });
                    const entities = [];
                    const relationships = [];
                    const seenEntities = new Set();
                    const seenRels = new Set();
                    for (const record of result.records) {
                        const node = record.get('neighbor');
                        if (!seenEntities.has(node.properties.id)) {
                            entities.push({
                                ...node.properties,
                                labels: node.labels,
                            });
                            seenEntities.add(node.properties.id);
                        }
                        const rels = record.get('rels');
                        for (const rel of rels) {
                            const relId = `${rel.start}-${rel.type}-${rel.end}`;
                            if (!seenRels.has(relId)) {
                                relationships.push({
                                    id: rel.properties.id || relId,
                                    fromEntityId: rel.start.toString(),
                                    toEntityId: rel.end.toString(),
                                    relationshipType: rel.type,
                                    ...rel.properties,
                                });
                                seenRels.add(relId);
                            }
                        }
                    }
                    const took = Date.now() - startTime;
                    graphLogger.info({
                        operation: 'neighbors',
                        entityId: args.id,
                        tenantId: args.tenantId,
                        hops,
                        results: entities.length,
                        took,
                    });
                    // SLO checks
                    const sloTarget = hops === 1 ? 300 : 1200;
                    if (took > sloTarget) {
                        graphLogger.warn({
                            sloViolation: 'neighbors',
                            hops,
                            target: sloTarget,
                            actual: took,
                        });
                    }
                    return {
                        entities,
                        relationships,
                        total: entities.length,
                        took,
                    };
                }
                finally {
                    await session.close();
                }
            }
            catch (error) {
                graphLogger.error({
                    operation: 'neighbors',
                    error,
                    args,
                });
                throw error;
            }
        },
        /**
         * Get provenance chain for entity
         */
        async provenance(_parent, args, context) {
            try {
                await (0, opa_client_js_1.verifyTenantAccess)(context.user, args.tenantId, 'entity:read');
                const provenanceRepo = new ProvenanceRepo_js_1.ProvenanceRepo(context.pg);
                const chain = await provenanceRepo.getChainForEntity(args.entityId, args.tenantId);
                return chain;
            }
            catch (error) {
                graphLogger.error({
                    operation: 'provenance',
                    error,
                    args,
                });
                throw error;
            }
        },
    },
    Mutation: {
        /**
         * Ingest entities and relationships with provenance tracking
         * Target: ≥1e5 rows/s/worker
         */
        async ingestData(_parent, args, context) {
            const startTime = Date.now();
            try {
                // Require ingest permission
                await (0, opa_client_js_1.verifyTenantAccess)(context.user, args.tenantId, 'ingest:write');
                const { IngestService } = await Promise.resolve().then(() => __importStar(require('../../services/IngestService.js')));
                const ingestService = new IngestService(context.pg, context.neo4j);
                const result = await ingestService.ingest({
                    tenantId: args.tenantId,
                    sourceType: args.sourceType,
                    sourceId: args.sourceId,
                    entities: args.entities,
                    relationships: args.relationships,
                    userId: context.user.id,
                });
                const took = Date.now() - startTime;
                graphLogger.info({
                    operation: 'ingestData',
                    tenantId: args.tenantId,
                    entitiesCreated: result.entitiesCreated,
                    relationshipsCreated: result.relationshipsCreated,
                    took,
                });
                return {
                    ...result,
                    took,
                };
            }
            catch (error) {
                graphLogger.error({
                    operation: 'ingestData',
                    error,
                    args,
                });
                throw error;
            }
        },
    },
    // Union type resolver for Entity interface
    Entity: {
        __resolveType(obj) {
            if (obj.kind) {
                // Map kind to GraphQL type
                const typeMap = {
                    person: 'Person',
                    organization: 'Organization',
                    asset: 'Asset',
                    event: 'Event',
                    indicator: 'Indicator',
                };
                return typeMap[obj.kind.toLowerCase()] || 'Person';
            }
            return 'Person'; // Default
        },
    },
};
/**
 * Map database entity to GraphQL type
 */
function mapEntityToGraphQL(entity) {
    return {
        id: entity.id,
        tenantId: entity.tenantId,
        labels: entity.labels || [],
        metadata: entity.props || {},
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        kind: entity.kind,
        ...entity.props,
    };
}
/**
 * Redact PII fields based on entity type
 */
function redactPII(props, kind) {
    const piiFields = {
        person: ['email', 'phone', 'dateOfBirth', 'ssn', 'passport'],
        organization: ['taxId', 'ein'],
    };
    const fieldsToRedact = piiFields[kind.toLowerCase()] || [];
    const redacted = { ...props };
    for (const field of fieldsToRedact) {
        if (redacted[field]) {
            redacted[field] = '[REDACTED]';
        }
    }
    return redacted;
}
