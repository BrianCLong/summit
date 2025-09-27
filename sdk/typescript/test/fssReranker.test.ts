import { createFreshnessReranker } from '../src/middleware/fssReranker';

describe('fss reranker', () => {
  const now = new Date('2025-02-01T00:00:00Z');

  it('boosts fresher documents when relevance is comparable', () => {
    const reranker = createFreshnessReranker({
      now,
      defaultHalfLifeHours: 72,
      sourceHalfLives: {
        official: 36,
        newswire: 18,
      },
      kernel: 'exponential',
      freshnessWeight: 1,
    });

    const results = reranker.rerank([
      {
        id: 'stale',
        relevance: 0.94,
        metadata: {
          source: 'newswire',
          publishedAt: '2024-06-01T00:00:00Z',
          lastVerifiedAt: '2024-06-02T00:00:00Z',
        },
      },
      {
        id: 'fresh',
        relevance: 0.91,
        metadata: {
          source: 'official',
          publishedAt: '2025-01-20T00:00:00Z',
          lastVerifiedAt: '2025-01-21T00:00:00Z',
        },
      },
    ]);

    const [top, runnerUp] = results;
    expect(top.id).toBe('fresh');
    expect(top.freshness).toBeGreaterThan(runnerUp.freshness);
  });

  it('supports hyperbolic kernel', () => {
    const reranker = createFreshnessReranker({
      now,
      defaultHalfLifeHours: 48,
      kernel: 'hyperbolic',
    });

    const [top] = reranker.rerank([
      {
        id: 'hyper',
        relevance: 0.5,
        metadata: {
          source: 'unknown',
          publishedAt: '2025-01-31T18:00:00Z',
        },
      },
      {
        id: 'older',
        relevance: 0.7,
        metadata: {
          source: 'unknown',
          publishedAt: '2024-12-01T00:00:00Z',
        },
      },
    ]);

    expect(top.id).toBe('hyper');
    expect(top.freshness).toBeLessThanOrEqual(1);
  });
});
