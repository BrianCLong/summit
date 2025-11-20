import { ElasticsearchService } from '../../src/search/elasticsearch';
import { Client } from '@elastic/elasticsearch';

// Mock Client
jest.mock('@elastic/elasticsearch');
jest.mock('../../src/services/EmbeddingService.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      generateEmbedding: jest.fn().mockResolvedValue(new Array(3072).fill(0.1)),
    };
  });
});

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      search: jest.fn(),
      index: jest.fn(),
      indices: {
        create: jest.fn(),
        exists: jest.fn(),
        updateAliases: jest.fn(),
        delete: jest.fn(),
      },
      bulk: jest.fn(),
      cluster: { health: jest.fn() },
      info: jest.fn(),
    };
    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);
    service = new ElasticsearchService();
  });

  it('should search documents', async () => {
    mockClient.search.mockResolvedValue({
      body: {
        hits: {
          hits: [
            {
              _id: '1',
              _index: 'cases',
              _score: 1,
              _source: { title: 'Test' },
            },
          ],
          total: { value: 1 },
        },
        took: 10,
      },
    });

    const results = await service.search({ query: 'test' });
    expect(results.results).toHaveLength(1);
    expect(results.total.value).toBe(1);
    expect(mockClient.search).toHaveBeenCalled();
  });

  it('should create index', async () => {
    mockClient.indices.exists.mockResolvedValue(false);
    await service.createIndex({
      name: 'test',
      mappings: {},
      settings: {},
      aliases: [],
      documentCount: 0,
      sizeInBytes: 0,
      status: 'green',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(mockClient.indices.create).toHaveBeenCalled();
  });

  it('should handle bulk indexing', async () => {
    mockClient.bulk.mockResolvedValue({
      body: {
        took: 10,
        errors: false,
        items: [],
      },
    });

    await service.bulkIndex([{ index: { _index: 'test' } }, { title: 'Test' }]);
    expect(mockClient.bulk).toHaveBeenCalled();
  });

  it('should include suggestions in query', async () => {
    mockClient.search.mockResolvedValue({
      body: { hits: { total: { value: 0 }, hits: [] } },
    });
    await service.search({ query: 'test' });
    const callArgs = mockClient.search.mock.calls[0][0];
    expect(callArgs.body.suggest).toBeDefined();
    expect(callArgs.body.suggest['title-suggest']).toBeDefined();
  });

  it('should not append .keyword to custom filters', async () => {
    mockClient.search.mockResolvedValue({
      body: { hits: { total: { value: 0 }, hits: [] } },
    });
    await service.search({
      query: 'test',
      filters: { custom: { status: 'open' } },
    });
    const callArgs = mockClient.search.mock.calls[0][0];
    const filters = callArgs.body.query.bool.filter;
    const statusFilter = filters.find((f: any) => f.term && f.term.status);
    expect(statusFilter).toBeDefined();
    expect(statusFilter.term.status).toBe('open');
  });
});
