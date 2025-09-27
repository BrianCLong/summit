import { describe, expect, it, jest } from '@jest/globals';
import { resolveAdvancedSearch, type AdvancedSearchInput, type SearchContext } from '../resolvers';

function createMockContext(overrides: Partial<SearchContext> = {}): SearchContext {
  const sessionClose = jest.fn();

  const postgres = {
    query: jest.fn(async () => ({ rows: [] })),
  } as unknown as SearchContext['postgres'];
  const neo4j = {
    session: jest.fn().mockReturnValue({
      run: jest.fn(),
      close: sessionClose,
    }),
  } as unknown as SearchContext['neo4j'];
  const elastic = {
    search: jest.fn(async () => ({})),
  } as unknown as SearchContext['elastic'];
  const opa = {
    allowFilters: jest.fn(async () => ({ allow: true })),
  } as unknown as SearchContext['opa'];
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as SearchContext['logger'];

  return {
    postgres,
    neo4j,
    elastic,
    opa,
    logger,
    auth: { tenantId: 'tenant-a', roles: ['analyst'], allowedNodeTypes: ['Indicator'] },
    ...overrides,
  } as SearchContext;
}

describe('resolveAdvancedSearch', () => {
  it('aggregates Elasticsearch, Postgres, and Neo4j results', async () => {
    const ctx = createMockContext();
    const ctxAny = ctx as any;
    const input: AdvancedSearchInput = {
      tenantId: 'tenant-a',
      query: 'malware',
      nodeTypes: ['Indicator'],
      limit: 10,
      offset: 0,
    };

    const esResult = {
      query: {},
      results: [
        {
          id: 'run-1',
          type: 'case',
          score: 0.92,
          source: { goal: 'Investigate malware', status: 'completed', started_at: '2024-01-01T00:00:00Z' },
          highlight: { goal: ['Investigate <mark>malware</mark> outbreak'] },
        },
      ],
      total: { value: 1, relation: 'eq' },
      took: 15,
      timedOut: false,
      suggestions: [{ text: 'malware analysis' }],
      facets: { status: { buckets: [] } },
    } as any;

    ctxAny.elastic.search.mockResolvedValue(esResult);

    ctxAny.postgres.query.mockResolvedValue({
      rows: [
        {
          id: 'run-1',
          status: 'completed',
          started_at: new Date('2024-01-01T00:00:00Z'),
          finished_at: new Date('2024-01-02T00:00:00Z'),
          goal: 'Investigate malware',
          tenant_id: 'tenant-a',
        },
      ],
    });

    const neoRecord = {
      get: jest.fn((key: string) => {
        if (key === 'runId') return 'run-1';
        if (key === 'nodes') {
          return [
            {
              id: 'ioc-1',
              type: 'Indicator',
              properties: { value: '1.2.3.4', kind: 'ip' },
            },
          ];
        }
        return undefined;
      }),
    };

    const sessionMock: any = {
      run: jest.fn(async () => ({ records: [neoRecord] })),
      close: jest.fn(),
    };
    ctxAny.neo4j.session.mockReturnValue(sessionMock);

    const result = await resolveAdvancedSearch({}, { input }, ctx);

    expect(ctx.elastic.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'malware' }));
    expect(ctx.postgres.query).toHaveBeenCalledWith(expect.stringContaining('FROM runs'), expect.any(Array));
    expect(result.total).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].relevanceScore).toBeCloseTo(0.92);
    expect(result.results[0].relatedNodes[0]).toEqual(
      expect.objectContaining({ id: 'ioc-1', type: 'Indicator' }),
    );
    expect(result.suggestions).toContain('malware analysis');
  });

  it('denies access when OPA rejects filters', async () => {
    const ctx = createMockContext({
      opa: {
        // @ts-expect-error intentional test double coercion
        allowFilters: jest.fn().mockResolvedValue({
          allow: false,
          reason: 'tenant mismatch',
        }),
      } as any,
    });

    await expect(
      resolveAdvancedSearch(
        {},
        { input: { tenantId: 'tenant-a', query: 'blocked' } },
        ctx,
      ),
    ).rejects.toThrow(/tenant mismatch/);
  });

  it('falls back to Postgres when Elasticsearch fails', async () => {
    const ctx = createMockContext();
    const ctxAny = ctx as any;
    ctxAny.elastic.search.mockRejectedValue(new Error('ES offline'));

    ctxAny.postgres.query.mockResolvedValue({
      rows: [
        {
          id: 'run-2',
          status: 'pending',
          started_at: null,
          finished_at: null,
          goal: 'Baseline run',
          tenant_id: 'tenant-a',
        },
      ],
    });

    const result = await resolveAdvancedSearch(
      {},
      { input: { tenantId: 'tenant-a', query: 'baseline', minRelevance: 0.8 } },
      ctx,
    );

    expect((ctx as any).logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Elasticsearch search failed, falling back to PostgreSQL results'),
      expect.objectContaining({ error: 'ES offline' }),
    );
    expect(result.results[0]).toEqual(
      expect.objectContaining({ runId: 'run-2', runbook: 'Baseline run', relevanceScore: null }),
    );
  });
});
