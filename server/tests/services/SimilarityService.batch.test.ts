// @ts-nocheck - Mock typing issues with @jest/globals
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SimilarityService } from '../../src/services/SimilarityService.js';
import { getPostgresPool } from '../../src/config/database.js';
import { otelService } from '../../src/monitoring/opentelemetry.js';
import EmbeddingService from '../../src/services/EmbeddingService.js';

// Mock dependencies
jest.mock('../../src/config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../../src/services/EmbeddingService.js', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

jest.mock('../../src/monitoring/opentelemetry.js', () => ({
  __esModule: true,
  otelService: {
    wrapNeo4jOperation: jest.fn(),
    addSpanAttributes: jest.fn(),
  },
  default: {
    wrapNeo4jOperation: jest.fn(),
    addSpanAttributes: jest.fn(),
  },
}));

jest.mock('../../src/monitoring/metrics.js', () => ({
  vectorQueriesTotal: { labels: () => ({ inc: jest.fn() }) },
  vectorQueryDurationSeconds: { startTimer: () => jest.fn() },
}));

describe('SimilarityService Batch Optimization', () => {
  let service: SimilarityService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    (otelService.wrapNeo4jOperation as jest.Mock).mockImplementation(((name: string, fn: any) => fn()) as any);

    (EmbeddingService as unknown as jest.Mock).mockImplementation(() => ({
      generateEmbedding: jest.fn<any>().mockResolvedValue([0.1, 0.2]),
    }));

    mockClient = {
      query: jest.fn<any>().mockImplementation(() => Promise.resolve({ rows: [] })),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn<any>().mockResolvedValue(mockClient),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

    service = new SimilarityService();
  });

  it('should use optimized batched query for embeddings', async () => {
    // Setup mocks
    // 1. getEntitiesEmbeddings (Batch fetch)
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { entity_id: 'id1', embedding: '[0.1,0.2]' },
        { entity_id: 'id2', embedding: '[0.3,0.4]' }
      ]
    });
    // 2. performVectorSearch for id1
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 3. performVectorSearch for id2
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    await service.findSimilarBulk({
      investigationId: 'inv1',
      entityIds: ['id1', 'id2'],
      topK: 5,
      threshold: 0.7,
    });

    // Check expectation: 3 queries (1 batch fetch + 2 searches)
    expect(mockClient.query).toHaveBeenCalledTimes(3);

    const calls = mockClient.query.mock.calls as unknown as any[];
    // Verify first call is batch fetch
    expect(calls[0][0]).toContain('WHERE entity_id = ANY($1)');
    // Verify params passed to query
    expect(calls[0][1][0]).toEqual(['id1', 'id2']);
  });
});
