"use strict";
// @ts-nocheck
/**
 * IntelGraph Safe Mutations
 * Type-safe, validated mutations for graph operations with audit trails and rollback
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
exports.IntelGraphSafeMutations = void 0;
const z = __importStar(require("zod"));
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
const CustomSchemaService_js_1 = require("../../services/CustomSchemaService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// Validation schemas for IntelGraph operations
const EntityMutationSchema = z.object({
    tenantId: z.string().min(1, 'Tenant ID required'),
    kind: z.string().min(1, 'Entity kind required'),
    labels: z.array(z.string()).default([]),
    props: z.record(z.any()).default({}),
    investigationId: z.string().optional(),
    confidence: z.number().min(0).max(1, 'Confidence must be 0-1').default(1.0),
    source: z.string().default('user_input'),
    customMetadata: z.record(z.any()).optional(),
});
const RelationshipMutationSchema = z.object({
    tenantId: z.string().min(1, 'Tenant ID required'),
    srcId: z.string().min(1, 'Source entity ID required'),
    dstId: z.string().min(1, 'Destination entity ID required'),
    type: z.string().min(1, 'Relationship type required'),
    props: z.record(z.any()).default({}),
    investigationId: z.string().optional(),
    confidence: z.number().min(0).max(1, 'Confidence must be 0-1').default(1.0),
    source: z.string().default('user_input'),
    customMetadata: z.record(z.any()).optional(),
});
const InvestigationMutationSchema = z.object({
    tenantId: z.string().min(1, 'Tenant ID required'),
    name: z.string().min(1, 'Investigation name required'),
    description: z.string().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).default('ACTIVE'),
    props: z.record(z.any()).default({}),
    customSchema: z.array(z.any()).optional(),
});
const BulkEntityMutationSchema = z.object({
    entities: z
        .array(EntityMutationSchema)
        .min(1, 'At least one entity required')
        .max(1000, 'Maximum 1000 entities per batch'),
    validateSchema: z.boolean().default(true),
    skipDuplicates: z.boolean().default(false),
});
const GraphTraversalSchema = z.object({
    startEntityId: z.string().min(1, 'Start entity ID required'),
    tenantId: z.string().min(1, 'Tenant ID required'),
    maxDepth: z.number().min(1).max(5, 'Max depth must be 1-5').default(2),
    relationshipTypes: z.array(z.string()).optional(),
    entityKinds: z.array(z.string()).optional(),
    limit: z.number().min(1).max(1000, 'Limit must be 1-1000').default(100),
});
/**
 * Creates an audit log entry for the mutation
 */
async function createAuditLog(context, operation, entityType, entityId, beforeState, afterState, success = true, error) {
    const pgPool = (0, database_js_1.getPostgresPool)();
    const auditId = (0, crypto_1.randomUUID)();
    try {
        await pgPool.query(`
      INSERT INTO audit_log (
        id, user_id, tenant_id, operation, entity_type, entity_id,
        before_state, after_state, metadata, timestamp, success, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
            auditId,
            context.user.id,
            context.user.tenantId,
            operation,
            entityType,
            entityId,
            JSON.stringify(beforeState),
            JSON.stringify(afterState),
            JSON.stringify({
                requestId: context.requestId,
                source: context.source,
                clientInfo: context.clientInfo,
            }),
            context.timestamp,
            success,
            error,
        ]);
        return auditId;
    }
    catch (auditError) {
        logger_js_1.default.error('Failed to create audit log:', auditError instanceof Error ? auditError.message : String(auditError));
        return auditId; // Return ID even if logging failed
    }
}
/**
 * Safe mutation wrapper with comprehensive error handling and auditing
 */
async function safeMutation(schema, input, context, mutationFn, operation, entityType) {
    const startTime = Date.now();
    let auditLogId;
    try {
        // Validate input
        const validInput = schema.parse(input);
        // Pre-mutation audit log
        auditLogId = await createAuditLog(context, operation, entityType, undefined, undefined, validInput, true);
        // Execute mutation
        const result = await mutationFn(validInput, context);
        // Post-mutation audit log
        await createAuditLog(context, `${operation}_COMPLETED`, entityType, result?.id, validInput, result, true);
        logger_js_1.default.info(`Safe mutation completed: ${operation}`, {
            operation,
            entityType,
            userId: context.user.id,
            tenantId: context.user.tenantId,
            duration: Date.now() - startTime,
            auditLogId,
        });
        return {
            success: true,
            data: result,
            auditLogId,
        };
    }
    catch (error) {
        // Error audit log
        if (auditLogId) {
            await createAuditLog(context, `${operation}_FAILED`, entityType, undefined, input, undefined, false, error instanceof Error ? error.message : 'Unknown error');
        }
        logger_js_1.default.error(`Safe mutation failed: ${operation}`, {
            operation,
            entityType,
            userId: context.user.id,
            tenantId: context.user.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
            auditLogId,
        });
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: error,
                auditLogId,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            auditLogId,
        };
    }
}
/**
 * IntelGraph Safe Mutations API
 */
exports.IntelGraphSafeMutations = {
    /**
     * Safely create an entity with validation and audit trail
     */
    async createEntity(input, context) {
        return safeMutation(EntityMutationSchema, input, context, async (entity, ctx) => {
            const driver = (0, database_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                // Validate custom metadata if provided
                if (entity.customMetadata && entity.investigationId) {
                    await (0, CustomSchemaService_js_1.validateCustomMetadata)(entity.investigationId, entity.customMetadata);
                }
                // Check for permissions
                if (!ctx.user.permissions.includes('entity:create') &&
                    !ctx.user.permissions.includes('*')) {
                    throw new Error('Insufficient permissions to create entity');
                }
                const id = (0, crypto_1.randomUUID)();
                const now = new Date().toISOString();
                const result = await session.run(`
            CREATE (e:Entity {
              id: $id,
              tenantId: $tenantId,
              kind: $kind,
              labels: $labels,
              props: $props,
              investigationId: $investigationId,
              confidence: $confidence,
              source: $source,
              customMetadata: $customMetadata,
              createdBy: $createdBy,
              createdAt: datetime($now),
              updatedAt: datetime($now)
            })
            RETURN e
          `, {
                    id,
                    tenantId: entity.tenantId,
                    kind: entity.kind,
                    labels: entity.labels,
                    props: JSON.stringify(entity.props),
                    investigationId: entity.investigationId,
                    confidence: entity.confidence,
                    source: entity.source,
                    customMetadata: JSON.stringify(entity.customMetadata || {}),
                    createdBy: ctx.user.id,
                    now,
                });
                const createdEntity = result.records[0].get('e').properties;
                // Invalidate caches
                // TODO: Implement cache invalidation
                return createdEntity;
            }
            finally {
                await session.close();
            }
        }, 'CREATE_ENTITY', 'Entity');
    },
    /**
     * Safely create a relationship with validation
     */
    async createRelationship(input, context) {
        return safeMutation(RelationshipMutationSchema, input, context, async (relationship, ctx) => {
            const driver = (0, database_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                // Check for permissions
                if (!ctx.user.permissions.includes('relationship:create') &&
                    !ctx.user.permissions.includes('*')) {
                    throw new Error('Insufficient permissions to create relationship');
                }
                // Validate that source and destination entities exist
                const entitiesCheck = await session.run(`
            MATCH (src:Entity {id: $srcId, tenantId: $tenantId})
            MATCH (dst:Entity {id: $dstId, tenantId: $tenantId})
            RETURN src, dst
          `, {
                    srcId: relationship.srcId,
                    dstId: relationship.dstId,
                    tenantId: relationship.tenantId,
                });
                if (entitiesCheck.records.length === 0) {
                    throw new Error('Source or destination entity not found');
                }
                const id = (0, crypto_1.randomUUID)();
                const now = new Date().toISOString();
                const result = await session.run(`
            MATCH (src:Entity {id: $srcId, tenantId: $tenantId})
            MATCH (dst:Entity {id: $dstId, tenantId: $tenantId})
            CREATE (src)-[r:RELATIONSHIP {
              id: $id,
              tenantId: $tenantId,
              type: $type,
              props: $props,
              investigationId: $investigationId,
              confidence: $confidence,
              source: $source,
              customMetadata: $customMetadata,
              createdBy: $createdBy,
              createdAt: datetime($now),
              updatedAt: datetime($now)
            }]->(dst)
            RETURN r, src, dst
          `, {
                    id,
                    srcId: relationship.srcId,
                    dstId: relationship.dstId,
                    tenantId: relationship.tenantId,
                    type: relationship.type,
                    props: JSON.stringify(relationship.props),
                    investigationId: relationship.investigationId,
                    confidence: relationship.confidence,
                    source: relationship.source,
                    customMetadata: JSON.stringify(relationship.customMetadata || {}),
                    createdBy: ctx.user.id,
                    now,
                });
                const record = result.records[0];
                const createdRelationship = {
                    ...record.get('r').properties,
                    source: record.get('src').properties,
                    destination: record.get('dst').properties,
                };
                return createdRelationship;
            }
            finally {
                await session.close();
            }
        }, 'CREATE_RELATIONSHIP', 'Relationship');
    },
    /**
     * Safely create an investigation with schema validation
     */
    async createInvestigation(input, context) {
        return safeMutation(InvestigationMutationSchema, input, context, async (investigation, ctx) => {
            const driver = (0, database_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                // Check for permissions
                if (!ctx.user.permissions.includes('investigation:create') &&
                    !ctx.user.permissions.includes('*')) {
                    throw new Error('Insufficient permissions to create investigation');
                }
                const id = (0, crypto_1.randomUUID)();
                const now = new Date().toISOString();
                const result = await session.run(`
            CREATE (i:Investigation {
              id: $id,
              tenantId: $tenantId,
              name: $name,
              description: $description,
              status: $status,
              props: $props,
              createdBy: $createdBy,
              createdAt: datetime($now),
              updatedAt: datetime($now)
            })
            RETURN i
          `, {
                    id,
                    tenantId: investigation.tenantId,
                    name: investigation.name,
                    description: investigation.description,
                    status: investigation.status,
                    props: JSON.stringify(investigation.props),
                    createdBy: ctx.user.id,
                    now,
                });
                const createdInvestigation = result.records[0].get('i').properties;
                // Set custom schema if provided
                if (investigation.customSchema) {
                    // TODO: Implement custom schema setting
                    // await setCustomSchema(id, investigation.customSchema);
                }
                return createdInvestigation;
            }
            finally {
                await session.close();
            }
        }, 'CREATE_INVESTIGATION', 'Investigation');
    },
    /**
     * Safely perform bulk entity creation with rollback on failure
     */
    async createEntitiesBatch(input, context) {
        return safeMutation(BulkEntityMutationSchema, input, context, async (batch, ctx) => {
            const driver = (0, database_js_1.getNeo4jDriver)();
            const session = driver.session();
            const tx = session.beginTransaction();
            const created = [];
            try {
                // Check for permissions
                if (!ctx.user.permissions.includes('entity:create') &&
                    !ctx.user.permissions.includes('*')) {
                    throw new Error('Insufficient permissions to create entities');
                }
                for (const entity of batch.entities) {
                    // Validate individual entity
                    const validEntity = EntityMutationSchema.parse(entity);
                    // Skip duplicates if requested
                    if (batch.skipDuplicates) {
                        const existingCheck = await tx.run(`
                MATCH (e:Entity {tenantId: $tenantId, kind: $kind})
                WHERE e.props CONTAINS $checkProps
                RETURN e
                LIMIT 1
              `, {
                            tenantId: validEntity.tenantId,
                            kind: validEntity.kind,
                            checkProps: JSON.stringify(validEntity.props),
                        });
                        if (existingCheck.records.length > 0) {
                            continue; // Skip this entity
                        }
                    }
                    const id = (0, crypto_1.randomUUID)();
                    const now = new Date().toISOString();
                    const result = await tx.run(`
              CREATE (e:Entity {
                id: $id,
                tenantId: $tenantId,
                kind: $kind,
                labels: $labels,
                props: $props,
                investigationId: $investigationId,
                confidence: $confidence,
                source: $source,
                customMetadata: $customMetadata,
                createdBy: $createdBy,
                createdAt: datetime($now),
                updatedAt: datetime($now)
              })
              RETURN e
            `, {
                        id,
                        tenantId: validEntity.tenantId,
                        kind: validEntity.kind,
                        labels: validEntity.labels,
                        props: JSON.stringify(validEntity.props),
                        investigationId: validEntity.investigationId,
                        confidence: validEntity.confidence,
                        source: validEntity.source,
                        customMetadata: JSON.stringify(validEntity.customMetadata || {}),
                        createdBy: ctx.user.id,
                        now,
                    });
                    created.push(result.records[0].get('e').properties);
                }
                await tx.commit();
                return {
                    created,
                    totalProcessed: batch.entities.length,
                    successfullyCreated: created.length,
                    skipped: batch.entities.length - created.length,
                };
            }
            catch (error) {
                await tx.rollback();
                throw error;
            }
            finally {
                await session.close();
            }
        }, 'CREATE_ENTITIES_BATCH', 'Entity');
    },
    /**
     * Safely perform graph traversal with depth and result limits
     */
    async traverseGraph(input, context) {
        return safeMutation(GraphTraversalSchema, input, context, async (traversal, ctx) => {
            const driver = (0, database_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                // Check for permissions
                if (!ctx.user.permissions.includes('entity:read') &&
                    !ctx.user.permissions.includes('*')) {
                    throw new Error('Insufficient permissions to read entities');
                }
                // Build dynamic query based on traversal parameters
                let whereClause = 'WHERE true';
                const params = {
                    startId: traversal.startEntityId,
                    tenantId: traversal.tenantId,
                    maxDepth: traversal.maxDepth,
                    limit: traversal.limit,
                };
                if (traversal.relationshipTypes &&
                    traversal.relationshipTypes.length > 0) {
                    whereClause += ' AND type(r) IN $relationshipTypes';
                    params.relationshipTypes = traversal.relationshipTypes;
                }
                if (traversal.entityKinds && traversal.entityKinds.length > 0) {
                    whereClause += ' AND n.kind IN $entityKinds';
                    params.entityKinds = traversal.entityKinds;
                }
                const query = `
            MATCH path = (start:Entity {id: $startId, tenantId: $tenantId})-[r*1..$maxDepth]-(n:Entity {tenantId: $tenantId})
            ${whereClause}
            WITH DISTINCT n, r, path
            ORDER BY length(path), n.createdAt DESC
            LIMIT $limit
            RETURN n, r, path
          `;
                const result = await session.run(query, params);
                const entities = new Map();
                const relationships = new Map();
                const paths = [];
                result.records.forEach((record) => {
                    const entity = record.get('n').properties;
                    const rels = record.get('r');
                    const path = record.get('path');
                    entities.set(entity.id, entity);
                    if (Array.isArray(rels)) {
                        rels.forEach((rel) => {
                            relationships.set(rel.properties.id, rel.properties);
                        });
                    }
                    paths.push({
                        length: path.length,
                        segments: path.segments.length,
                    });
                });
                return {
                    startEntityId: traversal.startEntityId,
                    entities: Array.from(entities.values()),
                    relationships: Array.from(relationships.values()),
                    paths,
                    totalEntities: entities.size,
                    totalRelationships: relationships.size,
                    maxDepthReached: Math.max(...paths.map((p) => p.length)),
                };
            }
            finally {
                await session.close();
            }
        }, 'TRAVERSE_GRAPH', 'Graph');
    },
};
