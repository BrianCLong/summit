/**
 * Entity DataLoader - Batch loading for entities from Neo4j
 * Prevents N+1 query issues when fetching multiple entities
 */

import DataLoader from 'dataloader';
import pino from 'pino';
import type { DataLoaderContext } from './index.js';

const logger = pino();

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
  const session = context.neo4jDriver.session();

  try {
    const startTime = Date.now();

    // Single query to fetch all requested entities
    const result = await session.run(
      `
      MATCH (n:Entity {tenantId: $tenantId})
      WHERE n.id IN $ids
      RETURN n
      `,
      { ids: ids as string[], tenantId: context.tenantId }
    );

    // Create a map of id -> entity
    const entityMap = new Map<string, Entity>();
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
      entityMap.set(entity.id, entity);
    });

    const duration = Date.now() - startTime;
    logger.debug(
      {
        batchSize: ids.length,
        found: entityMap.size,
        duration,
      },
      'Entity batch load completed'
    );

    // Return entities in the same order as requested IDs
    // If an entity is not found, return an Error
    return ids.map((id) => {
      const entity = entityMap.get(id);
      if (!entity) {
        return new Error(`Entity not found: ${id}`);
      }
      return entity;
    });
  } catch (error) {
    logger.error({ error, ids }, 'Error in entity batch loader');
    // Return errors for all requested IDs
    return ids.map(() => error as Error);
  } finally {
    await session.close();
  }
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
