import { describe, it, expect, jest } from '@jest/globals';

const loadSemanticSearchService = async () => {
  (jest as any).unstable_mockModule('../services/SynonymService.js', () => ({
    synonymService: { expandQuery: (query: string) => query },
  }));

  const module = await import('../services/SemanticSearchService.js');
  return module.default;
};

describe('SemanticSearchService', () => {
  it('maps deprecated search results into legacy shape', async () => {
    const SemanticSearchService = await loadSemanticSearchService();
    const service = new SemanticSearchService({
      poolFactory: () => ({ query: jest.fn(), connect: jest.fn() } as any),
      embeddingService: { generateEmbedding: jest.fn(async () => [0]) } as any,
    });

    const createdAt = new Date('2024-01-01T00:00:00Z');
    jest.spyOn(service, 'searchCases').mockResolvedValue([
      {
        id: '1',
        title: 'Case 1',
        score: 0.9,
        similarity: 0.9,
        status: 'open',
        created_at: createdAt,
      },
    ]);

    const results = await service.search('threat');

    expect(results).toEqual([
      {
        id: '1',
        text: 'Case 1',
        score: 0.9,
        metadata: { status: 'open', date: createdAt },
      },
    ]);
  });
});
