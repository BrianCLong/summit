const { GraphRAGService } = require('../src/services/GraphRAGService');
const { graphragSchemaFailuresTotal } = require('../src/monitoring/metrics.js');

describe('GraphRAGService schema validation', () => {
  const neo4jDriverMock = {};
  const embeddingService = {};
  const llmService = { complete: jest.fn() };
  let service;

  beforeEach(() => {
    service = new GraphRAGService(
      neo4jDriverMock,
      llmService,
      embeddingService,
    );
    jest.spyOn(service, 'retrieveSubgraphWithCache').mockResolvedValue({
      entities: [
        { id: '1', type: 'Entity', label: 'E1', properties: {}, confidence: 1 },
      ],
      relationships: [
        {
          id: 'r1',
          type: 'REL',
          fromEntityId: '1',
          toEntityId: '2',
          properties: {},
          confidence: 1,
        },
      ],
      subgraphHash: 'hash',
      ttl: 300,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('accepts valid payload', async () => {
    const validJSON = JSON.stringify({
      answer: 'A',
      confidence: 0.5,
      citations: { entityIds: ['1'] },
      why_paths: [{ from: '1', to: '2', relId: 'r1', type: 'REL' }],
    });
    llmService.complete.mockResolvedValue(validJSON);
    const res = await service.answer({
      investigationId: 'inv',
      question: 'Q?',
    });
    expect(res.answer).toBe('A');
  });

  test('rejects invalid payload and increments metric', async () => {
    const start = graphragSchemaFailuresTotal.get().values[0]?.value || 0;
    llmService.complete
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('not json');
    await expect(
      service.answer({ investigationId: 'inv', question: 'Q?' }),
    ).rejects.toThrow('LLM schema invalid after retry');
    const end = graphragSchemaFailuresTotal.get().values[0].value;
    expect(end).toBe(start + 2);
  });
});
