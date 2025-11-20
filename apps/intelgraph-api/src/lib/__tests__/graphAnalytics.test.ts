import { describe, expect, it } from 'vitest';
import type neo4j from 'neo4j-driver';
import {
  analyzeTemporalPatterns,
  detectGraphAnomalies,
  runCentrality,
  runCommunityDetection,
  runShortestPath,
} from '../graphAnalytics.js';

class MockRecord {
  constructor(private readonly data: Record<string, any>) {}

  get(key: string) {
    return this.data[key];
  }
}

class MockSession {
  constructor(
    private readonly handler: (query: string, params: Record<string, unknown>) => Promise<MockRecord[]> | MockRecord[],
  ) {}

  async run(query: string, params: Record<string, unknown>) {
    const records = await this.handler(query, params);
    return { records };
  }

  async close() {}
}

function createMockDriver(
  handler: (query: string, params: Record<string, unknown>) => Promise<MockRecord[]> | MockRecord[],
): neo4j.Driver {
  return {
    session: () => new MockSession(handler),
  } as unknown as neo4j.Driver;
}

const edgeRecords = [
  new MockRecord({
    sourceId: 'svc-api',
    sourceLabels: ['Service'],
    targetId: 'svc-db',
    targetLabels: ['Service'],
    relationshipId: '1',
    relationshipType: 'DEPENDS_ON',
    weight: 1,
  }),
  new MockRecord({
    sourceId: 'svc-api',
    sourceLabels: ['Service'],
    targetId: 'svc-cache',
    targetLabels: ['Service'],
    relationshipId: '2',
    relationshipType: 'DEPENDS_ON',
    weight: 1,
  }),
  new MockRecord({
    sourceId: 'svc-cache',
    sourceLabels: ['Service'],
    targetId: 'svc-queue',
    targetLabels: ['Service'],
    relationshipId: '3',
    relationshipType: 'EMITS',
    weight: 1,
  }),
  new MockRecord({
    sourceId: 'svc-queue',
    sourceLabels: ['Service'],
    targetId: 'svc-db',
    targetLabels: ['Service'],
    relationshipId: '4',
    relationshipType: 'CONSUMES',
    weight: 1,
  }),
];

describe('graphAnalytics', () => {
  it('runs label propagation community detection using Neo4j data snapshot', async () => {
    const driver = createMockDriver((query) => {
      if (query.includes('MATCH (source)-[rel]->(target)')) {
        return edgeRecords;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const result = await runCommunityDetection(driver, { algorithm: 'LABEL_PROPAGATION' });
    expect(result.communities.length).toBeGreaterThanOrEqual(1);
    const totalNodes = result.communities.reduce((sum, community) => sum + community.size, 0);
    expect(totalNodes).toBe(4);
  });

  it('computes PageRank centrality for the service dependency graph', async () => {
    const driver = createMockDriver((query) => {
      if (query.includes('MATCH (source)-[rel]->(target)')) {
        return edgeRecords;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const scores = await runCentrality(driver, { algorithm: 'PAGERANK', maxResults: 2 });
    expect(scores[0]?.nodeId).toBe('svc-api');
    expect(scores[0]?.score).toBeGreaterThan(scores[1]?.score ?? 0);
  });

  it('finds shortest path between two services', async () => {
    const driver = createMockDriver((query, params) => {
      if (query.includes('shortestPath')) {
        return [
          new MockRecord({
            nodes: [
              { id: params.sourceId, labels: ['Service'] },
              { id: 'svc-cache', labels: ['Service'] },
              { id: params.targetId, labels: ['Service'] },
            ],
            edges: [
              { id: '2', type: 'DEPENDS_ON', weight: 1 },
              { id: '4', type: 'CONSUMES', weight: 1 },
            ],
            hops: 2,
            totalCost: 2,
          }),
        ];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const path = await runShortestPath(driver, {
      sourceId: 'svc-api',
      targetId: 'svc-db',
      maxDepth: 4,
    });

    expect(path).not.toBeNull();
    expect(path?.nodes.map((node) => node.id)).toEqual(['svc-api', 'svc-cache', 'svc-db']);
    expect(path?.hops).toBe(2);
  });

  it('detects high-degree anomalies', async () => {
    const driver = createMockDriver((query) => {
      if (query.includes('MATCH (source)-[rel]->(target)')) {
        return edgeRecords;
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const anomalies = await detectGraphAnomalies(driver, { sensitivity: 1.5 });
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0]?.reason).toMatch(/HIGH/);
  });

  it('aggregates temporal metrics from Neo4j entities', async () => {
    const timestamps = [
      '2024-03-20T10:00:00Z',
      '2024-03-20T10:15:00Z',
      '2024-03-20T11:00:00Z',
    ];

    const driver = createMockDriver((query) => {
      if (query.startsWith('MATCH (entity)')) {
        return timestamps.map(
          (timestamp) =>
            new MockRecord({
              timestamp,
              degree: 3,
            }),
        );
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const metrics = await analyzeTemporalPatterns(driver, {
      entity: 'NODE',
      timestampProperty: 'occurredAt',
      interval: 'HOUR',
    });

    expect(metrics).toHaveLength(2);
    expect(metrics[0]?.count).toBe(2);
    expect(metrics[1]?.count).toBe(1);
  });
});

