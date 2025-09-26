import { vectorSearchResolvers } from '../vectorSearch';

const mockVectorService = {
  isEnabled: jest.fn(),
  fetchEmbedding: jest.fn(),
  search: jest.fn(),
};

const mockNeoRun = jest.fn();

jest.mock('../../services/VectorStoreService', () => ({
  __esModule: true,
  default: mockVectorService,
}));

jest.mock('../../db/neo4j', () => ({
  __esModule: true,
  neo: {
    run: mockNeoRun,
  },
}));

describe('vectorSimilaritySearch resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs similarity search with provided embedding', async () => {
    mockVectorService.isEnabled.mockReturnValue(true);
    mockVectorService.search.mockResolvedValue([
      { nodeId: 'n1', score: 0.92, embedding: [0.1, 0.2], metadata: { foo: 'bar' } },
    ]);
    mockNeoRun.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'id') return 'n1';
            if (key === 'n' || key === 'node') {
              return {
                properties: {
                  kind: 'Entity',
                  labels: ['Label'],
                  props: { name: 'Test' },
                  tenantId: 't1',
                },
              };
            }
            return undefined;
          },
        },
      ],
    });

    const result = await vectorSearchResolvers.Query.vectorSimilaritySearch({}, {
      input: { tenantId: 't1', queryEmbedding: [0.5, 0.6], topK: 3 },
    });

    expect(mockVectorService.search).toHaveBeenCalledWith({
      tenantId: 't1',
      embedding: [0.5, 0.6],
      topK: 3,
      minScore: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      node: {
        id: 'n1',
        props: { name: 'Test' },
        labels: ['Label'],
        tenantId: 't1',
      },
      score: 0.92,
      metadata: { foo: 'bar' },
    });
  });

  it('fetches stored embedding when only nodeId provided', async () => {
    mockVectorService.isEnabled.mockReturnValue(true);
    mockVectorService.fetchEmbedding.mockResolvedValue({
      tenantId: 't1',
      nodeId: 'n2',
      embedding: [0.3, 0.4],
    });
    mockVectorService.search.mockResolvedValue([]);

    const result = await vectorSearchResolvers.Query.vectorSimilaritySearch({}, {
      input: { tenantId: 't1', nodeId: 'n2' },
    });

    expect(mockVectorService.fetchEmbedding).toHaveBeenCalledWith('t1', 'n2');
    expect(mockVectorService.search).toHaveBeenCalledWith({
      tenantId: 't1',
      embedding: [0.3, 0.4],
      topK: undefined,
      minScore: undefined,
    });
    expect(result).toEqual([]);
  });

  it('throws when service disabled', async () => {
    mockVectorService.isEnabled.mockReturnValue(false);

    await expect(
      vectorSearchResolvers.Query.vectorSimilaritySearch({}, {
        input: { tenantId: 't1', queryEmbedding: [0.1] },
      }),
    ).rejects.toThrow('Vector similarity search is not configured');
  });
});
