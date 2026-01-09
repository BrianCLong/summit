// @ts-nocheck
/**
 * Entity DataLoader - Batch loading for entities from Neo4j
 * Prevents N+1 query issues when fetching multiple entities
 */

import DataLoader from 'dataloader';
import pino from 'pino';
import type { DataLoaderContext } from './index.js';

const logger = (pino as any)();

export interface Entity {
  id: string;
  type: string;
  props: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

/**
 * Batch function for loading entities by ID
 * Fetches multiple entities in a single Neo4j query
 */
async function batchLoadEntities(
  ids: readonly string[],
  context: DataLoaderContext
): Promise<(Entity | Error)[]> {
  const { redis, tenantId, neo4jDriver } = context;
  const entityMap = new Map<string, Entity>();
  const missingIds: string[] = [];
  let loadError: Error | null = null;

  // 1. Try to load from Redis cache first
  if (redis) {
    try {
      const keys = ids.map((id) => `entity:${tenantId}:${id}`);
      const cachedValues = await redis.mget(keys);

      cachedValues.forEach((val, index) => {
        if (val) {
          try {
            const entity = JSON.parse(val);
            entityMap.set(ids[index], entity);
          } catch (e: any) {
            // Invalid JSON in cache, treat as missing
            missingIds.push(ids[index]);
          }
        } else {
          missingIds.push(ids[index]);
        }
      });
    } catch (error: any) {
      logger.warn({ error }, 'Redis cache error in entityLoader, falling back to db');
      // If redis fails, load everything from DB
      missingIds.length = 0;
      ids.forEach(id => {
          if (!entityMap.has(id)) missingIds.push(id);
      });
    }
  } else {
    // No Redis, load all from DB
    missingIds.push(...ids);
  }

  // 2. Load missing entities from Neo4j
  if (missingIds.length > 0) {
    const session = neo4jDriver.session();

    try {
      const startTime = Date.now();

      // Single query to fetch all requested entities
      const result = await session.run(
        `
        MATCH (n:Entity {tenantId: $tenantId})
        WHERE n.id IN $ids
        RETURN n
        `,
        { ids: missingIds, tenantId }
      );

      const dbEntities = new Map<string, Entity>();

      result.records.forEach((record) => {
        const node = record.get('n');
        const entity: Entity = {
          id: node.properties.id,
          type: node.labels.find((l: string) => l !== 'Entity') || 'Entity',
          props: node.properties,
          createdAt: node.properties.createdAt,
          updatedAt: node.properties.updatedAt,
          tenantId: node.properties.tenantId,
        };
        dbEntities.set(entity.id, entity);
        entityMap.set(entity.id, entity);
      });

      // Cache the newly fetched entities
      if (redis && dbEntities.size > 0) {
        const pipeline = redis.pipeline();
        for (const [id, entity] of dbEntities.entries()) {
          pipeline.setex(
            `entity:${tenantId}:${id}`,
            60, // 60 seconds TTL
            JSON.stringify(entity)
          );
        }
        await pipeline.exec();
      }

      const duration = Date.now() - startTime;
      logger.debug(
        {
          batchSize: missingIds.length,
          found: dbEntities.size,
          duration,
        },
        'Entity batch load completed'
      );
    } catch (error: any) {
      logger.error({ error, ids: missingIds }, 'Error in entity batch loader');
      loadError =
        error instanceof Error
          ? error
          : new Error('Entity batch load failed');
      // If DB fails, we can only return errors for missingIds
      // Existing ones from cache are fine
      missingIds.forEach(id => {
          // We don't have a way to signal error for specific IDs easily here without complicating map
          // But map.get(id) will return undefined, which maps to Error below.
      });
      // Better: we should probably throw or return errors?
      // The contract says Promise<(Entity | Error)[]>
      // If we failed to load missingIds, we mark them as Errors in the final map loop.
    } finally {
      await session.close();
    }
  }

  // Return entities in the same order as requested IDs
  return ids.map((id) => {
    const entity = entityMap.get(id);
    if (!entity) {
      if (loadError) {
        return new Error(loadError.message);
      }
      return new Error(`Entity not found: ${id}`);
    }
    return entity;
  });
}

/**
 * Creates a new Entity DataLoader
 * Should be instantiated once per GraphQL request
 */
export function createEntityLoader(
  context: DataLoaderContext
): DataLoader<string, Entity, string> {
  return new DataLoader(
    (ids) => batchLoadEntities(ids, context),
    {
      // Cache results for the duration of the request
      cache: true,
      // Maximum batch size (prevents overwhelming Neo4j)
      maxBatchSize: 100,
      // Batch window in milliseconds
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

/**
 * Batch load entities with relationships
 * Useful for loading entities and their connections in a single query
 */
export async function batchLoadEntitiesWithRelationships(
  ids: readonly string[],
  context: DataLoaderContext,
  relationshipType?: string
): Promise<Map<string, { entity: Entity; relationships: any[] }>> {
  const session = context.neo4jDriver.session();

  try {
    const query = relationshipType
      ? `
        MATCH (n:Entity {tenantId: $tenantId})
        WHERE n.id IN $ids
        OPTIONAL MATCH (n)-[r:${relationshipType}]-(connected)
        RETURN n, collect({
          relationship: r,
          connected: connected
        }) as relationships
      `
      : `
        MATCH (n:Entity {tenantId: $tenantId})
        WHERE n.id IN $ids
        OPTIONAL MATCH (n)-[r]-(connected)
        RETURN n, collect({
          relationship: r,
          connected: connected
        }) as relationships
      `;

    const result = await session.run(query, {
      ids: ids as string[],
      tenantId: context.tenantId,
    });

    const dataMap = new Map();
    result.records.forEach((record) => {
      const node = record.get('n');
      const relationships = record.get('relationships');

      const entity: Entity = {
        id: node.properties.id,
        type: node.labels.find((l: string) => l !== 'Entity') || 'Entity',
        props: node.properties,
        createdAt: node.properties.createdAt,
        updatedAt: node.properties.updatedAt,
        tenantId: node.properties.tenantId,
      };

      dataMap.set(entity.id, {
        entity,
        relationships: relationships.filter((r: any) => r.relationship !== null),
      });
    });

    return dataMap;
  } finally {
    await session.close();
  }
}
