/**
 * Example: GraphQL Integration with Policy-Aware Cache
 *
 * This demonstrates how to integrate the cache service with GraphQL resolvers
 */

import { PolicyAwareCacheService } from '../src/index.js';
import type { CacheKeyComponents } from '../src/index.js';
import { createHash } from 'crypto';

// Initialize cache service
const cache = new PolicyAwareCacheService({
  namespace: 'graphql-cache',
  defaultTTL: 3600,
});

// Helper: Hash query for consistent keys
function hashQuery(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}

// Helper: Get current policy version (mock - replace with actual implementation)
async function getCurrentPolicyVersion() {
  return {
    version: 'v1.2.0',
    digest: 'policy-digest-abc123...',
    effectiveDate: new Date().toISOString(),
  };
}

// Helper: Get current data snapshot (mock - replace with actual implementation)
async function getCurrentDataSnapshot(source: string) {
  return {
    snapshotId: `snapshot-${source}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    dataHash: `hash-${source}-${Date.now()}`,
    sources: {
      [source]: 'latest',
    },
  };
}

// Example GraphQL resolver with caching
const resolvers = {
  Query: {
    /**
     * Entity search resolver with policy-aware caching
     */
    entitySearch: async (_parent: any, args: any, context: any) => {
      const { query, filters } = args;

      // Build cache key components
      const components: CacheKeyComponents = {
        queryHash: hashQuery(query),
        paramsHash: hashQuery(JSON.stringify({ query, filters })),
        policyVersion: await getCurrentPolicyVersion(),
        userAttributes: {
          userId: context.user.id,
          roles: context.user.roles || [],
          clearanceLevel: context.user.clearanceLevel,
          organizationId: context.user.organizationId,
        },
        dataSnapshot: await getCurrentDataSnapshot('neo4j'),
      };

      // Try to get from cache
      let result = await cache.get(components);

      if (result) {
        console.log('Cache HIT for entity search');

        // Return cached data with proof metadata
        return {
          entities: result.data.entities,
          _metadata: {
            cached: true,
            cachedAt: result.proof.cachedAt,
            policyVersion: result.proof.policyVersion,
            proofSignature: result.proof.signature.substring(0, 16) + '...',
          },
        };
      }

      console.log('Cache MISS for entity search - executing query');

      // Execute actual query (mock - replace with real implementation)
      const entities = await mockEntitySearch(query, filters);

      // Store in cache with proof
      result = await cache.set(
        components,
        { entities },
        {
          ttl: 1800, // 30 minutes
          computedBy: 'graphql-entity-search-resolver',
          inputSources: ['neo4j://entities', 'postgres://metadata'],
          metadata: {
            queryType: 'entity-search',
            resultCount: entities.length,
          },
        }
      );

      // Return fresh data
      return {
        entities: result.data.entities,
        _metadata: {
          cached: false,
          computedAt: result.proof.cachedAt,
          policyVersion: result.proof.policyVersion,
        },
      };
    },

    /**
     * Relationship traversal with caching
     */
    relationshipTraversal: async (_parent: any, args: any, context: any) => {
      const { startNodeId, depth, relationshipTypes } = args;

      const components: CacheKeyComponents = {
        queryHash: hashQuery(`traversal:${startNodeId}`),
        paramsHash: hashQuery(JSON.stringify({ startNodeId, depth, relationshipTypes })),
        policyVersion: await getCurrentPolicyVersion(),
        userAttributes: {
          userId: context.user.id,
          roles: context.user.roles || [],
          clearanceLevel: context.user.clearanceLevel,
          organizationId: context.user.organizationId,
        },
        dataSnapshot: await getCurrentDataSnapshot('neo4j'),
      };

      let result = await cache.get(components);

      if (!result) {
        // Execute traversal
        const graph = await mockGraphTraversal(startNodeId, depth, relationshipTypes);

        result = await cache.set(components, { graph }, {
          ttl: 3600,
          computedBy: 'graphql-traversal-resolver',
          inputSources: ['neo4j://graph'],
        });
      }

      return result.data.graph;
    },
  },

  Mutation: {
    /**
     * Invalidate cache when data changes
     */
    createEntity: async (_parent: any, args: any, context: any) => {
      // Create entity (mock)
      const entity = await mockCreateEntity(args.input);

      // Invalidate relevant cache entries
      const oldSnapshot = await getCurrentDataSnapshot('neo4j');
      const newSnapshot = {
        ...oldSnapshot,
        snapshotId: `snapshot-neo4j-${Date.now()}`,
        timestamp: new Date().toISOString(),
        dataHash: `hash-${Date.now()}`,
      };

      const invalidatedCount = await cache.invalidateByDataSnapshot(
        oldSnapshot,
        newSnapshot,
        context.user.id
      );

      console.log(`Invalidated ${invalidatedCount} cache entries after entity creation`);

      return entity;
    },
  },
};

// Mock implementations (replace with actual database calls)
async function mockEntitySearch(query: string, filters: any) {
  return [
    { id: '1', name: 'Entity 1', type: 'Person' },
    { id: '2', name: 'Entity 2', type: 'Organization' },
  ];
}

async function mockGraphTraversal(startNodeId: string, depth: number, types: string[]) {
  return {
    nodes: [{ id: startNodeId }],
    edges: [],
  };
}

async function mockCreateEntity(input: any) {
  return { id: 'new-entity-id', ...input };
}

// Export resolvers
export default resolvers;

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await cache.close();
});
