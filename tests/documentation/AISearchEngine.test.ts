import { AISearchEngine, SearchConfig, SearchResult } from '../../src/documentation/search/AISearchEngine.js';

describe('AISearchEngine semantic innovations', () => {
  const baseConfig: SearchConfig = {
    indexPath: '/tmp',
    embeddingModel: 'custom',
    languages: ['en'],
    maxResults: 5,
    semanticThreshold: 0.1,
    enableAutoComplete: false,
    enableFacetedSearch: false,
    enablePersonalization: false,
    cacheSize: 10,
    rebuildInterval: 10_000,
  };

  let engine: AISearchEngine;

  beforeEach(() => {
    engine = new AISearchEngine(baseConfig);
  });

  it('generates deterministic, normalized embeddings', async () => {
    const first = await (engine as any).generateEmbedding('Hello world', 'en');
    const second = await (engine as any).generateEmbedding('Hello world', 'en');

    expect(first).toEqual(second);

    const magnitude = Math.sqrt(first.reduce((sum: number, value: number) => sum + value * value, 0));
    expect(Math.abs(magnitude - 1)).toBeLessThan(1e-6);
  });

  it('reranks results with MMR to improve diversity', async () => {
    const now = new Date();
    const stale = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const documents = [
      {
        id: 'a',
        title: 'Core Concepts',
        content: 'semantic search foundations',
        url: '/a',
        type: 'guide',
        category: 'docs',
        tags: [],
        language: 'en',
        lastModified: now,
        priority: 1,
        metadata: {},
      },
      {
        id: 'b',
        title: 'Advanced Concepts',
        content: 'semantic search deep dive',
        url: '/b',
        type: 'guide',
        category: 'docs',
        tags: [],
        language: 'en',
        lastModified: stale,
        priority: 1,
        metadata: {},
      },
      {
        id: 'c',
        title: 'Graph API Reference',
        content: 'graph endpoints',
        url: '/c',
        type: 'api',
        category: 'reference',
        tags: [],
        language: 'en',
        lastModified: now,
        priority: 1,
        metadata: {},
      },
    ];

    documents.forEach((doc) => {
      (engine as any).searchIndex.set(doc.id, doc);
    });

    (engine as any).vectorIndex.set('a', [1, 0]);
    (engine as any).vectorIndex.set('b', [0.98, 0.05]);
    (engine as any).vectorIndex.set('c', [0, 1]);

    const baseResults: SearchResult[] = [
      {
        id: 'a',
        title: 'Core Concepts',
        url: '/a',
        type: 'guide',
        category: 'docs',
        score: 0.9,
        snippet: '',
        highlights: [],
        metadata: {},
      },
      {
        id: 'b',
        title: 'Advanced Concepts',
        url: '/b',
        type: 'guide',
        category: 'docs',
        score: 0.88,
        snippet: '',
        highlights: [],
        metadata: {},
      },
      {
        id: 'c',
        title: 'Graph API Reference',
        url: '/c',
        type: 'api',
        category: 'reference',
        score: 0.6,
        snippet: '',
        highlights: [],
        metadata: {},
      },
    ];

    const reranked = (engine as any).rerankWithMMR(baseResults, [1, 0], 3);

    expect(reranked[0].id).toBe('a');
    expect(reranked[1].id).toBe('c');
    expect(reranked[2].id).toBe('b');
  });

  it('prioritizes fresher documents via recency boost', () => {
    const computeRecencyBoost = (engine as any).computeRecencyBoost.bind(engine);

    const recent = computeRecencyBoost(new Date());
    const old = computeRecencyBoost(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000));

    expect(recent).toBeGreaterThan(old);
    expect(recent).toBeGreaterThan(0.85);
  });
});
