/**
 * Relationship DataLoader - Batch loading for relationships from Neo4j
 * Prevents N+1 query issues when fetching multiple relationships
 */

import DataLoader from 'dataloader';
import pino from 'pino';
import type { DataLoaderContext } from './index.js';

const logger = pino();

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  props: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  tenantId: string;
}

/**
 * Batch function for loading relationships by ID
 */
async function batchLoadRelationships(
  ids: readonly string[],
  context: DataLoaderContext
): Promise<(Relationship | Error)[]> {
  const session = context.neo4jDriver.session();

  try {
    const startTime = Date.now();

    // Single query to fetch all requested relationships
    const result = await session.run(
      `
      MATCH (from)-[r]->(to)
      WHERE r.id IN $ids AND r.tenantId = $tenantId
      RETURN r, from, to
      `,
      { ids: ids as string[], tenantId: context.tenantId }
    );

    // Create a map of id -> relationship
    const relationshipMap = new Map<string, Relationship>();
    result.records.forEach((record) => {
      const rel = record.get('r');
      const from = record.get('from');
      const to = record.get('to');

      const relationship: Relationship = {
        id: rel.properties.id,
        from: from.properties.id,
        to: to.properties.id,
        type: rel.type,
        props: rel.properties,
        createdAt: rel.properties.createdAt,
        updatedAt: rel.properties.updatedAt,
        tenantId: rel.properties.tenantId,
      };
      relationshipMap.set(relationship.id, relationship);
    });

    const duration = Date.now() - startTime;
    logger.debug(
      {
        batchSize: ids.length,
        found: relationshipMap.size,
        duration,
      },
      'Relationship batch load completed'
    );

    // Return relationships in the same order as requested IDs
    return ids.map((id) => {
      const relationship = relationshipMap.get(id);
      if (!relationship) {
        return new Error(`Relationship not found: ${id}`);
      }
      return relationship;
    });
  } catch (error) {
    logger.error({ error, ids }, 'Error in relationship batch loader');
    return ids.map(() => error as Error);
  } finally {
    await session.close();
  }
}

/**
 * Creates a new Relationship DataLoader
 */
export function createRelationshipLoader(
  context: DataLoaderContext
): DataLoader<string, Relationship, string> {
  return new DataLoader(
    (ids) => batchLoadRelationships(ids, context),
    {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

/**
 * DataLoader for fetching relationships by source entity ID
 * Key is source entity ID, value is array of relationships
 */
export function createRelationshipsBySourceLoader(
  context: DataLoaderContext
): DataLoader<string, Relationship[], string> {
  return new DataLoader(
    async (sourceIds: readonly string[]) => {
      const session = context.neo4jDriver.session();

      try {
        const result = await session.run(
          `
          MATCH (from:Entity)-[r]->(to:Entity)
          WHERE from.id IN $sourceIds
            AND from.tenantId = $tenantId
            AND r.tenantId = $tenantId
          RETURN from.id as sourceId, collect({
            id: r.id,
            from: from.id,
            to: to.id,
            type: type(r),
            props: properties(r)
          }) as relationships
          `,
          { sourceIds: sourceIds as string[], tenantId: context.tenantId }
        );

        const relationshipsBySource = new Map<string, Relationship[]>();
        result.records.forEach((record) => {
          const sourceId = record.get('sourceId');
          const relationships = record.get('relationships').map((r: any) => ({
            id: r.id,
            from: r.from,
            to: r.to,
            type: r.type,
            props: r.props,
            createdAt: r.props.createdAt,
            updatedAt: r.props.updatedAt,
            tenantId: r.props.tenantId,
          }));
          relationshipsBySource.set(sourceId, relationships);
        });

        return sourceIds.map((id) => relationshipsBySource.get(id) || []);
      } finally {
        await session.close();
      }
    },
    {
      cache: true,
      maxBatchSize: 50,
    }
  );
}

/**
 * DataLoader for fetching relationships by target entity ID
 */
export function createRelationshipsByTargetLoader(
  context: DataLoaderContext
): DataLoader<string, Relationship[], string> {
  return new DataLoader(
    async (targetIds: readonly string[]) => {
      const session = context.neo4jDriver.session();

      try {
        const result = await session.run(
          `
          MATCH (from:Entity)-[r]->(to:Entity)
          WHERE to.id IN $targetIds
            AND to.tenantId = $tenantId
            AND r.tenantId = $tenantId
          RETURN to.id as targetId, collect({
            id: r.id,
            from: from.id,
            to: to.id,
            type: type(r),
            props: properties(r)
          }) as relationships
          `,
          { targetIds: targetIds as string[], tenantId: context.tenantId }
        );

        const relationshipsByTarget = new Map<string, Relationship[]>();
        result.records.forEach((record) => {
          const targetId = record.get('targetId');
          const relationships = record.get('relationships').map((r: any) => ({
            id: r.id,
            from: r.from,
            to: r.to,
            type: r.type,
            props: r.props,
            createdAt: r.props.createdAt,
            updatedAt: r.props.updatedAt,
            tenantId: r.props.tenantId,
          }));
          relationshipsByTarget.set(targetId, relationships);
        });

        return targetIds.map((id) => relationshipsByTarget.get(id) || []);
      } finally {
        await session.close();
      }
    },
    {
      cache: true,
      maxBatchSize: 50,
    }
  );
}
