"use strict";
/**
 * DataLoader Middleware for Batching Database Queries
 *
 * Implements:
 * - Batch database queries to reduce N+1 query problems
 * - Entity, Relationship, and Investigation loaders
 * - Caching layer integration
 * - Performance monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleResolverWithDataLoader = exports.DEFAULT_DATALOADER_OPTIONS = void 0;
exports.createEntityLoaderPostgres = createEntityLoaderPostgres;
exports.createEntityLoaderNeo4j = createEntityLoaderNeo4j;
exports.createRelationshipLoaderPostgres = createRelationshipLoaderPostgres;
exports.createRelationshipLoaderNeo4j = createRelationshipLoaderNeo4j;
exports.createInvestigationLoaderPostgres = createInvestigationLoaderPostgres;
exports.createEntityRelationshipsLoader = createEntityRelationshipsLoader;
exports.createDataLoaders = createDataLoaders;
exports.clearDataLoaderCaches = clearDataLoaderCaches;
exports.createDataLoaderMiddleware = createDataLoaderMiddleware;
const dataloader_1 = __importDefault(require("dataloader"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
/**
 * DataLoader options with caching
 */
exports.DEFAULT_DATALOADER_OPTIONS = {
    cache: true,
    maxBatchSize: 100,
    batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batching window
};
/**
 * Create entity loader for PostgreSQL
 */
function createEntityLoaderPostgres(pool, tenantId) {
    return new dataloader_1.default(async (entityIds) => {
        const start = Date.now();
        try {
            const uniqueIds = Array.from(new Set(entityIds));
            // Build batch query
            const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
            let query = `
          SELECT id, type, name, properties, tenant_id, created_at, updated_at
          FROM entities
          WHERE id IN (${placeholders})
        `;
            const params = [...uniqueIds];
            // Add tenant isolation if provided
            if (tenantId) {
                query += ` AND tenant_id = $${params.length + 1}`;
                params.push(tenantId);
            }
            const result = await pool.query(query, params);
            // Create map for O(1) lookup
            const entityMap = new Map();
            result.rows.forEach((row) => {
                entityMap.set(row.id, {
                    id: row.id,
                    type: row.type,
                    name: row.name,
                    properties: row.properties,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                });
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched entity load',
                count: uniqueIds.length,
                found: entityMap.size,
                duration,
            });
            // Return in same order as input, null for missing
            return entityIds.map((id) => entityMap.get(id) || null);
        }
        catch (error) {
            logger.error('Failed to batch load entities:', error);
            // Return nulls on error to prevent complete failure
            return entityIds.map(() => null);
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create entity loader for Neo4j
 */
function createEntityLoaderNeo4j(driver, tenantId) {
    return new dataloader_1.default(async (entityIds) => {
        const start = Date.now();
        const session = driver.session();
        try {
            const uniqueIds = Array.from(new Set(entityIds));
            // Build Cypher query with UNWIND for batch loading
            let cypher = `
          UNWIND $entityIds AS entityId
          MATCH (e:Entity {id: entityId})
        `;
            const params = { entityIds: uniqueIds };
            // Add tenant isolation
            if (tenantId) {
                cypher += ` WHERE e.tenantId = $tenantId`;
                params.tenantId = tenantId;
            }
            cypher += `
          RETURN e.id AS id, e.type AS type, e.name AS name,
                 properties(e) AS properties, e.tenantId AS tenantId,
                 e.createdAt AS createdAt, e.updatedAt AS updatedAt
        `;
            const result = await session.run(cypher, params);
            // Create map for O(1) lookup
            const entityMap = new Map();
            result.records.forEach((record) => {
                const entity = {
                    id: record.get('id'),
                    type: record.get('type'),
                    name: record.get('name'),
                    properties: record.get('properties'),
                    tenantId: record.get('tenantId'),
                    createdAt: record.get('createdAt'),
                    updatedAt: record.get('updatedAt'),
                };
                entityMap.set(entity.id, entity);
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched entity load from Neo4j',
                count: uniqueIds.length,
                found: entityMap.size,
                duration,
            });
            // Return in same order as input
            return entityIds.map((id) => entityMap.get(id) || null);
        }
        catch (error) {
            logger.error('Failed to batch load entities from Neo4j:', error);
            return entityIds.map(() => null);
        }
        finally {
            await session.close();
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create relationship loader for PostgreSQL
 */
function createRelationshipLoaderPostgres(pool, tenantId) {
    return new dataloader_1.default(async (relationshipIds) => {
        const start = Date.now();
        try {
            const uniqueIds = Array.from(new Set(relationshipIds));
            const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
            let query = `
          SELECT id, source_id, target_id, type, properties, tenant_id, created_at
          FROM relationships
          WHERE id IN (${placeholders})
        `;
            const params = [...uniqueIds];
            if (tenantId) {
                query += ` AND tenant_id = $${params.length + 1}`;
                params.push(tenantId);
            }
            const result = await pool.query(query, params);
            const relationshipMap = new Map();
            result.rows.forEach((row) => {
                relationshipMap.set(row.id, {
                    id: row.id,
                    sourceId: row.source_id,
                    targetId: row.target_id,
                    type: row.type,
                    properties: row.properties,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                });
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched relationship load',
                count: uniqueIds.length,
                found: relationshipMap.size,
                duration,
            });
            return relationshipIds.map((id) => relationshipMap.get(id) || null);
        }
        catch (error) {
            logger.error('Failed to batch load relationships:', error);
            return relationshipIds.map(() => null);
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create relationship loader for Neo4j
 */
function createRelationshipLoaderNeo4j(driver, tenantId) {
    return new dataloader_1.default(async (relationshipIds) => {
        const start = Date.now();
        const session = driver.session();
        try {
            const uniqueIds = Array.from(new Set(relationshipIds));
            let cypher = `
          UNWIND $relationshipIds AS relId
          MATCH ()-[r:RELATED_TO {id: relId}]-()
        `;
            const params = { relationshipIds: uniqueIds };
            if (tenantId) {
                cypher += ` WHERE r.tenantId = $tenantId`;
                params.tenantId = tenantId;
            }
            cypher += `
          RETURN r.id AS id, r.sourceId AS sourceId, r.targetId AS targetId,
                 r.type AS type, properties(r) AS properties,
                 r.tenantId AS tenantId, r.createdAt AS createdAt
        `;
            const result = await session.run(cypher, params);
            const relationshipMap = new Map();
            result.records.forEach((record) => {
                const rel = {
                    id: record.get('id'),
                    sourceId: record.get('sourceId'),
                    targetId: record.get('targetId'),
                    type: record.get('type'),
                    properties: record.get('properties'),
                    tenantId: record.get('tenantId'),
                    createdAt: record.get('createdAt'),
                };
                relationshipMap.set(rel.id, rel);
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched relationship load from Neo4j',
                count: uniqueIds.length,
                found: relationshipMap.size,
                duration,
            });
            return relationshipIds.map((id) => relationshipMap.get(id) || null);
        }
        catch (error) {
            logger.error('Failed to batch load relationships from Neo4j:', error);
            return relationshipIds.map(() => null);
        }
        finally {
            await session.close();
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create investigation loader for PostgreSQL
 */
function createInvestigationLoaderPostgres(pool, tenantId) {
    return new dataloader_1.default(async (investigationIds) => {
        const start = Date.now();
        try {
            const uniqueIds = Array.from(new Set(investigationIds));
            const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
            let query = `
          SELECT id, name, status, priority, tenant_id, created_at, updated_at
          FROM investigations
          WHERE id IN (${placeholders})
        `;
            const params = [...uniqueIds];
            if (tenantId) {
                query += ` AND tenant_id = $${params.length + 1}`;
                params.push(tenantId);
            }
            const result = await pool.query(query, params);
            const investigationMap = new Map();
            result.rows.forEach((row) => {
                investigationMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    status: row.status,
                    priority: row.priority,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                });
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched investigation load',
                count: uniqueIds.length,
                found: investigationMap.size,
                duration,
            });
            return investigationIds.map((id) => investigationMap.get(id) || null);
        }
        catch (error) {
            logger.error('Failed to batch load investigations:', error);
            return investigationIds.map(() => null);
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create loader for entity's relationships (by source entity)
 */
function createEntityRelationshipsLoader(pool, tenantId) {
    return new dataloader_1.default(async (entityIds) => {
        const start = Date.now();
        try {
            const uniqueIds = Array.from(new Set(entityIds));
            const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
            let query = `
          SELECT id, source_id, target_id, type, properties, tenant_id, created_at
          FROM relationships
          WHERE source_id IN (${placeholders})
        `;
            const params = [...uniqueIds];
            if (tenantId) {
                query += ` AND tenant_id = $${params.length + 1}`;
                params.push(tenantId);
            }
            query += ` ORDER BY created_at DESC`;
            const result = await pool.query(query, params);
            // Group relationships by source entity
            const relationshipsByEntity = new Map();
            result.rows.forEach((row) => {
                const rel = {
                    id: row.id,
                    sourceId: row.source_id,
                    targetId: row.target_id,
                    type: row.type,
                    properties: row.properties,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                };
                if (!relationshipsByEntity.has(row.source_id)) {
                    relationshipsByEntity.set(row.source_id, []);
                }
                const relList = relationshipsByEntity.get(row.source_id);
                if (relList) {
                    relList.push(rel);
                }
            });
            const duration = Date.now() - start;
            logger.debug({
                msg: 'Batched entity relationships load',
                entityCount: uniqueIds.length,
                relationshipCount: result.rows.length,
                duration,
            });
            // Return array of relationships for each entity
            return entityIds.map((id) => relationshipsByEntity.get(id) || []);
        }
        catch (error) {
            logger.error('Failed to batch load entity relationships:', error);
            return entityIds.map(() => []);
        }
    }, exports.DEFAULT_DATALOADER_OPTIONS);
}
/**
 * Create all DataLoaders for a request context
 */
function createDataLoaders(postgresPool, neo4jDriver, tenantId) {
    return {
        entityLoader: neo4jDriver
            ? createEntityLoaderNeo4j(neo4jDriver, tenantId)
            : createEntityLoaderPostgres(postgresPool, tenantId),
        relationshipLoader: neo4jDriver
            ? createRelationshipLoaderNeo4j(neo4jDriver, tenantId)
            : createRelationshipLoaderPostgres(postgresPool, tenantId),
        investigationLoader: createInvestigationLoaderPostgres(postgresPool, tenantId),
        entityRelationshipsLoader: createEntityRelationshipsLoader(postgresPool, tenantId),
    };
}
/**
 * Clear all DataLoader caches
 */
function clearDataLoaderCaches(loaders) {
    loaders.entityLoader.clearAll();
    loaders.relationshipLoader.clearAll();
    loaders.investigationLoader.clearAll();
    loaders.entityRelationshipsLoader.clearAll();
}
/**
 * Middleware to create DataLoaders per request
 */
function createDataLoaderMiddleware(postgresPool, neo4jDriver) {
    return (req, res, next) => {
        // Extract tenant from request (adjust based on your auth implementation)
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        // Create fresh DataLoaders for this request
        req.loaders = createDataLoaders(postgresPool, neo4jDriver, tenantId);
        next();
    };
}
/**
 * Example usage in GraphQL resolver
 */
exports.exampleResolverWithDataLoader = {
    Entity: {
        // Resolve relationships using DataLoader (prevents N+1)
        relationships: (parent, args, context) => {
            return context.loaders.entityRelationshipsLoader.load(parent.id);
        },
    },
    Query: {
        // Resolve multiple entities efficiently
        entities: (parent, args, context) => {
            return Promise.all(args.ids.map((id) => context.loaders.entityLoader.load(id)));
        },
    },
};
exports.default = {
    createEntityLoaderPostgres,
    createEntityLoaderNeo4j,
    createRelationshipLoaderPostgres,
    createRelationshipLoaderNeo4j,
    createInvestigationLoaderPostgres,
    createEntityRelationshipsLoader,
    createDataLoaders,
    clearDataLoaderCaches,
    createDataLoaderMiddleware,
    DEFAULT_DATALOADER_OPTIONS: exports.DEFAULT_DATALOADER_OPTIONS,
};
