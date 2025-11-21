/**
 * DataLoader Infrastructure for GraphQL Resolvers
 * Implements batch loading to prevent N+1 queries
 */

import DataLoader from 'dataloader';
import { createEntityLoader } from './entityLoader.js';
import { createRelationshipLoader } from './relationshipLoader.js';
import { createInvestigationLoader } from './investigationLoader.js';
import { createUserLoader } from './userLoader.js';
import type { Driver as Neo4jDriver } from 'neo4j-driver';
import type { Pool as PgPool } from 'pg';

export interface DataLoaders {
  entityLoader: DataLoader<string, any, string>;
  relationshipLoader: DataLoader<string, any, string>;
  investigationLoader: DataLoader<string, any, string>;
  userLoader: DataLoader<string, any, string>;
  entitiesByTypeLoader: DataLoader<string, any[], string>;
}

export interface DataLoaderContext {
  neo4jDriver: Neo4jDriver;
  pgPool: PgPool;
  tenantId: string;
}

/**
 * Creates all DataLoaders for a single request context
 * DataLoaders are request-scoped to ensure proper batching
 */
export function createDataLoaders(context: DataLoaderContext): DataLoaders {
  return {
    entityLoader: createEntityLoader(context),
    relationshipLoader: createRelationshipLoader(context),
    investigationLoader: createInvestigationLoader(context),
    userLoader: createUserLoader(context),
    entitiesByTypeLoader: new DataLoader(async (types: readonly string[]) => {
      // Batch load entities by type
      const session = context.neo4jDriver.session();
      try {
        const result = await session.run(
          `
          UNWIND $types AS type
          MATCH (n:Entity {tenantId: $tenantId})
          WHERE type IN labels(n)
          RETURN type, collect(n) as entities
          `,
          { types: types as string[], tenantId: context.tenantId }
        );

        const entitiesByType = new Map<string, any[]>();
        result.records.forEach((record) => {
          const type = record.get('type');
          const entities = record.get('entities').map((entity: any) => ({
            id: entity.properties.id,
            type: entity.labels[0],
            props: entity.properties,
            createdAt: entity.properties.createdAt,
            updatedAt: entity.properties.updatedAt,
          }));
          entitiesByType.set(type, entities);
        });

        return types.map((type) => entitiesByType.get(type) || []);
      } finally {
        await session.close();
      }
    }),
  };
}

/**
 * DataLoader statistics for monitoring
 */
export function getDataLoaderStats(loaders: DataLoaders) {
  return {
    entity: {
      cacheSize: loaders.entityLoader['_cacheMap']?.size || 0,
    },
    relationship: {
      cacheSize: loaders.relationshipLoader['_cacheMap']?.size || 0,
    },
    investigation: {
      cacheSize: loaders.investigationLoader['_cacheMap']?.size || 0,
    },
    user: {
      cacheSize: loaders.userLoader['_cacheMap']?.size || 0,
    },
  };
}
