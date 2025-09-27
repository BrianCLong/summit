import GraphQLJSON from 'graphql-type-json';
import type { GraphContext, Direction, NeighborhoodOptions } from '../types.js';
import type { GraphNode } from '../utils/mappers.js';

interface NeighborhoodArgs {
  nodeId: string;
  direction?: Direction;
  limit?: number;
  cursor?: string | null;
  labelFilters?: string[];
  propertyFilters?: { key: string; value: string | number | boolean }[];
}

interface PathArgs {
  input: {
    startId: string;
    direction?: Direction;
    maxHops?: number;
    limit?: number;
    cursor?: string | null;
    labelFilters?: string[];
    relationshipTypes?: string[];
    propertyFilters?: { key: string; value: string | number | boolean }[];
  };
}

interface NodeArgs {
  id: string;
}

export const resolvers = {
  JSON: GraphQLJSON,
  Node: {
    __resolveReference(reference: { id: string }, context: GraphContext) {
      return resolveNodeById(reference.id, context);
    }
  },
  Query: {
    node(_: unknown, args: NodeArgs, context: GraphContext) {
      return resolveNodeById(args.id, context);
    },
    nodeNeighborhood: async (_: unknown, args: NeighborhoodArgs, context: GraphContext) => {
      const { nodeId } = args;
      if (!nodeId) {
        throw new Error('NODE_ID_REQUIRED');
      }
      const direction = args.direction ?? 'BOTH';
      const limit = args.limit ?? 25;
      const cursor = args.cursor ?? null;
      const cacheKey = context.cache?.buildKey(nodeId, direction, limit, cursor ?? null);
      if (cacheKey) {
        const cached = await context.cache?.get(cacheKey);
        if (cached) {
          context.costCollector.recordCache('nodeNeighborhood', {
            cache: { hit: true, key: cacheKey }
          });
          return cached.result;
        }
      }

      const options: NeighborhoodOptions = {
        nodeId,
        direction,
        limit,
        cursor,
        labelFilters: args.labelFilters ?? [],
        propertyFilters: args.propertyFilters ?? []
      };
      const { result, summary, meta } = await context.dataSources.graph.getNeighborhood(options);
      context.costCollector.recordDatabase('nodeNeighborhood', summary, {
        cache: { hit: false, key: cacheKey ?? undefined },
        retryCount: meta.retryCount,
        limit,
        direction
      });
      if (cacheKey) {
        await context.cache?.set(cacheKey, context.cache.toPayload(result));
      }
      return result;
    },
    filteredPaths: async (_: unknown, args: PathArgs, context: GraphContext) => {
      const input = args.input;
      if (!input?.startId) {
        throw new Error('START_ID_REQUIRED');
      }
      const direction = input.direction ?? 'OUT';
      const maxHops = input.maxHops ?? 3;
      const limit = input.limit ?? 10;
      const { result, summary, meta } = await context.dataSources.graph.findPaths({
        startId: input.startId,
        direction,
        maxHops,
        limit,
        cursor: input.cursor ?? null,
        labelFilters: input.labelFilters ?? [],
        relationshipTypes: input.relationshipTypes ?? [],
        propertyFilters: input.propertyFilters ?? []
      });
      context.costCollector.recordDatabase('filteredPaths', summary, {
        cache: { hit: false },
        retryCount: meta.retryCount,
        limit,
        direction,
        maxHops
      });
      return result;
    }
  }
};

async function resolveNodeById(id: string, context: GraphContext): Promise<GraphNode | null> {
  const { result, summary, meta } = await context.dataSources.graph.getNode(id);
  if (summary) {
    context.costCollector.recordDatabase('node', summary, { retryCount: meta.retryCount });
  }
  return result;
}
