// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PoolClient, QueryResult } from 'pg';

const queryMock = jest.fn() as jest.Mock;
const transactionMock = jest.fn() as jest.Mock;

jest.mock('../../src/db/connection.js', () => ({
  __esModule: true,
  getDatabase: () => ({
    transaction: transactionMock,
  }),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Import after mocks so the repository picks up the mocked database
// eslint-disable-next-line import/first
import { IdentityClusterRepository } from '../../src/db/IdentityClusterRepository.js';

interface ClusterRow {
  cluster_id: string;
  tenant_id: string;
  entity_type: string;
  node_ids: string[];
  primary_node_id: string;
  canonical_attributes: unknown[];
  edges: Array<{ nodeAId: string; nodeBId: string; overallScore: number }>;
  cohesion_score: number;
  confidence: number;
  merge_history: unknown[];
  created_at: string;
  updated_at: string;
  version: number;
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  locked_reason: string | null;
}

describe('IdentityClusterRepository.merge lock ordering', () => {
  const repo = new IdentityClusterRepository();
  const now = new Date().toISOString();

  const makeRow = (overrides: Partial<ClusterRow>): ClusterRow => ({
    cluster_id: 'cluster-default',
    tenant_id: 'tenant-1',
    entity_type: 'Person',
    node_ids: ['a'],
    primary_node_id: 'a',
    canonical_attributes: [],
    edges: [],
    cohesion_score: 0.5,
    confidence: 0.6,
    merge_history: [],
    created_at: now,
    updated_at: now,
    version: 1,
    locked: false,
    locked_by: null,
    locked_at: null,
    locked_reason: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(
      async (fn: (client: Pick<PoolClient, 'query'>) => Promise<unknown>) =>
        fn({ query: queryMock } as unknown as PoolClient),
    );
  });

  it('locks clusters in a deterministic order to prevent deadlocks', async () => {
    const targetId = 'cluster-b';
    const sourceId = 'cluster-a';

    const lockQueryResult: QueryResult<ClusterRow> = {
      rowCount: 2,
      command: 'SELECT',
      oid: 0,
      fields: [],
      rows: [makeRow({ cluster_id: sourceId }), makeRow({ cluster_id: targetId, node_ids: ['b'] })],
    };

    queryMock.mockResolvedValueOnce(lockQueryResult); // Lock acquisition
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as QueryResult); // Update merged cluster
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as QueryResult); // Delete source cluster
    queryMock.mockResolvedValue({ rowCount: 1 } as QueryResult); // Update nodes

    const merged = await repo.merge(targetId, sourceId, 'tester', 'harness');

    expect(queryMock).toHaveBeenCalled();
    const [lockSql, lockParams] = queryMock.mock.calls[0] ?? [];
    expect(String(lockSql)).toContain('ORDER BY cluster_id');
    expect(lockParams?.[0]).toEqual([sourceId, targetId]); // Sorted array despite reversed input

    expect(merged.clusterId).toBe(targetId);
    expect(merged.nodeIds).toEqual(['b', 'a']);
  });
});
