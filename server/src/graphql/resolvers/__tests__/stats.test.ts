import { jest } from '@jest/globals';
import { flushLocalCache } from '../../../cache/responseCache.js';

const mockQuery = jest.fn();

jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  getPostgresPool: () => ({ query: mockQuery }),
}));

describe('stats resolvers caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    flushLocalCache();
    mockQuery.mockReset();
  });

  it('loadSummaryStats aggregates with single query', async () => {
    const { loadSummaryStats } = await import('../stats.js');
    mockQuery.mockResolvedValue({
      rows: [
        { metric: 'entities', value: 10 },
        { metric: 'relationships', value: 5 },
        { metric: 'investigations', value: 2 },
      ],
    });

    const result = await loadSummaryStats({ query: mockQuery } as any, 'tenant-1');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ entities: 10, relationships: 5, investigations: 2 });
  });

  it('summaryStats resolver caches the result per tenant', async () => {
    const { statsResolvers } = await import('../stats.js');
    mockQuery.mockResolvedValue({
      rows: [
        { metric: 'entities', value: 3 },
        { metric: 'relationships', value: 7 },
        { metric: 'investigations', value: 1 },
      ],
    });

    const ctx = { tenantId: 'tenant-42' };

    const first = await statsResolvers.Query.summaryStats({}, {}, ctx);
    expect(first).toEqual({ entities: 3, relationships: 7, investigations: 1 });
    expect(mockQuery).toHaveBeenCalledTimes(1);

    mockQuery.mockClear();

    const second = await statsResolvers.Query.summaryStats({}, {}, ctx);
    expect(second).toEqual(first);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
