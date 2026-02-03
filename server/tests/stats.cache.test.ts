import { jest, describe, test, expect } from '@jest/globals';

jest.mock('../src/metrics/cacheMetrics.js', () => ({
  recHit: jest.fn(),
  recMiss: jest.fn(),
  recSet: jest.fn(),
  recInvalidation: jest.fn(),
  recEviction: jest.fn(),
  setHitRatio: jest.fn(),
  cacheLocalSize: {
    labels: jest.fn(() => ({ set: jest.fn() })),
  },
}));

jest.mock('../src/config/database.js', () => {
  const query = jest.fn(async (sql: string, _params: any[]) => {
    if (/GROUP BY status/.test(sql)) {
      return {
        rows: [
          { status: 'OPEN', c: 3 },
          { status: 'CLOSED', c: 1 },
        ],
      };
    }
    if (/SELECT COUNT\(\*\)::int AS entities/.test(sql))
      return { rows: [{ entities: 42 }] };
    if (/SELECT COUNT\(\*\)::int AS relationships/.test(sql))
      return { rows: [{ relationships: 99 }] };
    if (/SELECT COUNT\(\*\)::int AS investigations/.test(sql))
      return { rows: [{ investigations: 7 }] };
    return { rows: [] };
  });
  return {
    getPostgresPool: () => ({ query }),
  };
});

describe('stats caching', () => {
  test('caseCounts and summaryStats are cached via local/redis cache', async () => {
    jest.resetModules();
    const { statsResolvers } = await import('../src/graphql/resolvers/stats.js');
    const ctx: any = { user: { tenant: 't-test' } };
    // First pass -> populates cache
    await statsResolvers.Query.caseCounts(null as any, {}, ctx);
    await statsResolvers.Query.summaryStats(null as any, {}, ctx);

    // Reset db mock counters by re-mocking getPostgresPool
    const mod = require('../src/config/database.js');
    (mod.getPostgresPool().query as any).mockClear();

    await statsResolvers.Query.caseCounts(null as any, {}, ctx);
    await statsResolvers.Query.summaryStats(null as any, {}, ctx);

    expect(mod.getPostgresPool().query).not.toHaveBeenCalled();
  });
});
