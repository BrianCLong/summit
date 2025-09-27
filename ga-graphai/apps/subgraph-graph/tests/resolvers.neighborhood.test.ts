import { describe, expect, it, vi } from 'vitest';
import { resolvers } from '../src/resolvers/index.js';
import { CostCollector } from '../src/cost/costCollector.js';
import type { GraphContext, GraphDataSource, NeighborhoodOptions, PathOptions } from '../src/types.js';
import type { NeighborhoodResult, PathConnection } from '../src/utils/mappers.js';

const summary = {
  resultAvailableAfter: 10,
  resultConsumedAfter: 20,
  counters: { containsUpdates: () => false }
} as any;

class StubDataSource implements GraphDataSource {
  constructor(private readonly neighborhood: NeighborhoodResult, private readonly paths: PathConnection) {}

  async getNode(): Promise<any> {
    return { result: null, summary, meta: { retryCount: 0 } };
  }

  async getNeighborhood(options: NeighborhoodOptions): Promise<any> {
    return { result: this.neighborhood, summary, meta: { retryCount: 1 } };
  }

  async findPaths(options: PathOptions): Promise<any> {
    return { result: this.paths, summary, meta: { retryCount: 0 } };
  }
}

describe('nodeNeighborhood resolver', () => {
  const neighborhood: NeighborhoodResult = {
    node: { id: 'incident-100', labels: ['Incident'], properties: {} },
    neighbors: [{ id: 'ioc-1', labels: ['Observable'], properties: {} }],
    edges: [{ id: 'e1', type: 'INDICATES', startId: 'incident-100', endId: 'ioc-1', properties: {} }],
    pageInfo: { endCursor: 'MQ', hasNextPage: false }
  };

  const paths: PathConnection = {
    paths: [
      {
        nodes: [
          { id: 'incident-100', labels: ['Incident'], properties: {} },
          { id: 'incident-101', labels: ['Incident'], properties: {} }
        ],
        edges: [
          { id: 'p1', type: 'LINKED', startId: 'incident-100', endId: 'incident-101', properties: {} }
        ]
      }
    ],
    pageInfo: { endCursor: 'MQ', hasNextPage: false }
  };

  function buildContext(cacheHit: boolean): GraphContext {
    const collector = new CostCollector();
    const cache = cacheHit
      ? {
          buildKey: () => 'key',
          async get() {
            return { result: neighborhood };
          },
          async set() {
            throw new Error('should not set when cache hit');
          },
          toPayload: (value: NeighborhoodResult) => ({ result: value })
        }
      : {
          buildKey: () => 'key',
          async get() {
            return null;
          },
          async set() {
            /* no-op */
          },
          toPayload: (value: NeighborhoodResult) => ({ result: value })
        };

    return {
      dataSources: { graph: new StubDataSource(neighborhood, paths) },
      cache: cache as any,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), level: 'silent' } as any,
      costCollector: collector
    };
  }

  it('serves cached neighborhoods and records cache cost', async () => {
    const context = buildContext(true);
    const result = await resolvers.Query.nodeNeighborhood(
      {},
      { nodeId: 'incident-100', limit: 10 },
      context
    );
    expect(result.neighbors).toHaveLength(1);
    const exported = context.costCollector.export();
    expect(exported?.operations[0].source).toBe('cache');
  });

  it('queries Neo4j when cache miss and records retry metadata', async () => {
    const context = buildContext(false);
    const result = await resolvers.Query.nodeNeighborhood(
      {},
      { nodeId: 'incident-100', limit: 10 },
      context
    );
    expect(result.edges[0].type).toBe('INDICATES');
    const exported = context.costCollector.export();
    expect(exported?.operations.find((op) => op.operation === 'nodeNeighborhood')?.meta?.retryCount).toBe(1);
  });

  it('resolves filtered paths without caching', async () => {
    const context = buildContext(false);
    const result = await resolvers.Query.filteredPaths(
      {},
      { input: { startId: 'incident-100', limit: 5 } },
      context
    );
    expect(result.paths).toHaveLength(1);
    const exported = context.costCollector.export();
    expect(exported?.operations.some((op) => op.operation === 'filteredPaths')).toBe(true);
  });
});
