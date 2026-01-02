// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GraphAnalytics } from '../analytics/algorithms';

const runCypherMock = jest.fn() as jest.Mock;

jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: { int: (value: number) => ({ value, toNumber: () => value }) },
  int: (value: number) => ({ value, toNumber: () => value }),
}));

describe('GraphAnalytics', () => {
  let analytics: GraphAnalytics;

  beforeEach(() => {
    analytics = new GraphAnalytics();
    // @ts-ignore override store with mock
    analytics['store'] = { runCypher: runCypherMock };
    runCypherMock.mockReset();
    runCypherMock.mockResolvedValue([] as unknown[]);
  });

  it('enforces bounded limits for degree centrality queries', async () => {
    await analytics.getDegreeCentrality('tenant-1', 25);

    expect(runCypherMock).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $limit'),
      expect.objectContaining({
        tenantId: 'tenant-1',
        limit: expect.objectContaining({ toNumber: expect.any(Function) }),
      }),
      expect.objectContaining({ tenantId: 'tenant-1' }),
    );
  });

  it('rejects invalid or excessive degree limits', async () => {
    await expect(analytics.getDegreeCentrality('tenant-1', 0)).rejects.toThrow('limit must be greater than 0');
    await expect(analytics.getDegreeCentrality('tenant-1', 101)).rejects.toThrow('limit must not exceed 100');
    await expect(analytics.getDegreeCentrality('tenant-1', 2.5)).rejects.toThrow('limit must be an integer');
  });

  it('bounds shortest path traversal depth and limits to a single path', async () => {
    await analytics.getShortestPath('tenant-1', 'A', 'B');

    const [cypher, params, options] = runCypherMock.mock.calls[0] as [string, any, any];
    expect(cypher).toContain('[*..6]');
    expect(cypher).toContain('LIMIT 1');
    expect(params).toMatchObject({ tenantId: 'tenant-1', startId: 'A', endId: 'B' });
    expect(options).toMatchObject({ tenantId: 'tenant-1' });
  });

  it('rejects unsafe shortest path depths', async () => {
    await expect(analytics.getShortestPath('tenant-1', 'A', 'B', 0)).rejects.toThrow('maxDepth must be greater than 0');
    await expect(analytics.getShortestPath('tenant-1', 'A', 'B', 50)).rejects.toThrow('maxDepth must not exceed 12');
  });
});
