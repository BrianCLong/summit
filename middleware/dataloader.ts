/**
 * DataLoader Middleware for Batching Database Queries
 *
 * Implements:
 * - Batch database queries to reduce N+1 query problems
 * - Entity, Relationship, and Investigation loaders
 * - Caching layer integration
 * - Performance monitoring
 */

import DataLoader from 'dataloader';
import pino from 'pino';
import { Pool as PostgresPool } from 'pg';
import { Driver as Neo4jDriver, Session as Neo4jSession } from 'neo4j-driver';

const logger = pino();

/**
 * DataLoader options with caching
 */
export const DEFAULT_DATALOADER_OPTIONS = {
  cache: true,
  maxBatchSize: 100,
  batchScheduleFn: (callback: () => void) => setTimeout(callback, 10), // 10ms batching window
};

/**
 * Entity data structure
 */
export interface Entity {
  id: string;
  type: string;
  name?: string;
  properties?: Record<string, any>;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Relationship data structure
 */
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties?: Record<string, any>;
  tenantId: string;
  createdAt?: Date;
}

/**
 * Investigation data structure
 */
export interface Investigation {
  id: string;
  name: string;
  status: string;
  priority?: string;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create entity loader for PostgreSQL
 */
export function createEntityLoaderPostgres(pool: PostgresPool, tenantId?: string): DataLoader<string, Entity | null> {
  return new DataLoader<string, Entity | null>(
    async (entityIds: readonly string[]) => {
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
        const entityMap = new Map<string, Entity>();
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
      } catch (error) {
        logger.error('Failed to batch load entities:', error);
        // Return nulls on error to prevent complete failure
        return entityIds.map(() => null);
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * Create entity loader for Neo4j
 */
export function createEntityLoaderNeo4j(driver: Neo4jDriver, tenantId?: string): DataLoader<string, Entity | null> {
  return new DataLoader<string, Entity | null>(
    async (entityIds: readonly string[]) => {
      const start = Date.now();
      const session: Neo4jSession = driver.session();

      try {
        const uniqueIds = Array.from(new Set(entityIds));

        // Build Cypher query with UNWIND for batch loading
        let cypher = `
          UNWIND $entityIds AS entityId
          MATCH (e:Entity {id: entityId})
        `;

        const params: any = { entityIds: uniqueIds };

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
        const entityMap = new Map<string, Entity>();
        result.records.forEach((record) => {
          const entity: Entity = {
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
      } catch (error) {
        logger.error('Failed to batch load entities from Neo4j:', error);
        return entityIds.map(() => null);
      } finally {
        await session.close();
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * Create relationship loader for PostgreSQL
 */
export function createRelationshipLoaderPostgres(
  pool: PostgresPool,
  tenantId?: string,
): DataLoader<string, Relationship | null> {
  return new DataLoader<string, Relationship | null>(
    async (relationshipIds: readonly string[]) => {
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

        const relationshipMap = new Map<string, Relationship>();
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
      } catch (error) {
        logger.error('Failed to batch load relationships:', error);
        return relationshipIds.map(() => null);
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * Create relationship loader for Neo4j
 */
export function createRelationshipLoaderNeo4j(
  driver: Neo4jDriver,
  tenantId?: string,
): DataLoader<string, Relationship | null> {
  return new DataLoader<string, Relationship | null>(
    async (relationshipIds: readonly string[]) => {
      const start = Date.now();
      const session: Neo4jSession = driver.session();

      try {
        const uniqueIds = Array.from(new Set(relationshipIds));

        let cypher = `
          UNWIND $relationshipIds AS relId
          MATCH ()-[r:RELATED_TO {id: relId}]-()
        `;

        const params: any = { relationshipIds: uniqueIds };

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

        const relationshipMap = new Map<string, Relationship>();
        result.records.forEach((record) => {
          const rel: Relationship = {
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
      } catch (error) {
        logger.error('Failed to batch load relationships from Neo4j:', error);
        return relationshipIds.map(() => null);
      } finally {
        await session.close();
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * Create investigation loader for PostgreSQL
 */
export function createInvestigationLoaderPostgres(
  pool: PostgresPool,
  tenantId?: string,
): DataLoader<string, Investigation | null> {
  return new DataLoader<string, Investigation | null>(
    async (investigationIds: readonly string[]) => {
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

        const investigationMap = new Map<string, Investigation>();
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
      } catch (error) {
        logger.error('Failed to batch load investigations:', error);
        return investigationIds.map(() => null);
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * Create loader for entity's relationships (by source entity)
 */
export function createEntityRelationshipsLoader(
  pool: PostgresPool,
  tenantId?: string,
): DataLoader<string, Relationship[]> {
  return new DataLoader<string, Relationship[]>(
    async (entityIds: readonly string[]) => {
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
        const relationshipsByEntity = new Map<string, Relationship[]>();
        result.rows.forEach((row) => {
          const rel: Relationship = {
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
          relationshipsByEntity.get(row.source_id)!.push(rel);
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
      } catch (error) {
        logger.error('Failed to batch load entity relationships:', error);
        return entityIds.map(() => []);
      }
    },
    DEFAULT_DATALOADER_OPTIONS,
  );
}

/**
 * DataLoader context to be attached to GraphQL context
 */
export interface DataLoaderContext {
  loaders: {
    entityLoader: DataLoader<string, Entity | null>;
    relationshipLoader: DataLoader<string, Relationship | null>;
    investigationLoader: DataLoader<string, Investigation | null>;
    entityRelationshipsLoader: DataLoader<string, Relationship[]>;
  };
}

/**
 * Create all DataLoaders for a request context
 */
export function createDataLoaders(
  postgresPool: PostgresPool,
  neo4jDriver?: Neo4jDriver,
  tenantId?: string,
): DataLoaderContext['loaders'] {
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
export function clearDataLoaderCaches(loaders: DataLoaderContext['loaders']): void {
  loaders.entityLoader.clearAll();
  loaders.relationshipLoader.clearAll();
  loaders.investigationLoader.clearAll();
  loaders.entityRelationshipsLoader.clearAll();
}

/**
 * Middleware to create DataLoaders per request
 */
export function createDataLoaderMiddleware(
  postgresPool: PostgresPool,
  neo4jDriver?: Neo4jDriver,
) {
  return (req: any, res: any, next: any) => {
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
export const exampleResolverWithDataLoader = {
  Entity: {
    // Resolve relationships using DataLoader (prevents N+1)
    relationships: async (parent: Entity, args: any, context: DataLoaderContext) => {
      return context.loaders.entityRelationshipsLoader.load(parent.id);
    },
  },

  Query: {
    // Resolve multiple entities efficiently
    entities: async (parent: any, args: { ids: string[] }, context: DataLoaderContext) => {
      return Promise.all(
        args.ids.map((id) => context.loaders.entityLoader.load(id)),
      );
    },
  },
};

export default {
  createEntityLoaderPostgres,
  createEntityLoaderNeo4j,
  createRelationshipLoaderPostgres,
  createRelationshipLoaderNeo4j,
  createInvestigationLoaderPostgres,
  createEntityRelationshipsLoader,
  createDataLoaders,
  clearDataLoaderCaches,
  createDataLoaderMiddleware,
  DEFAULT_DATALOADER_OPTIONS,
};
