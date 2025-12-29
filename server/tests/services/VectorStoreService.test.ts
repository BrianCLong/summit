import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { VectorStoreService } from '../../src/services/VectorStoreService.js';
import { getPostgresPool } from '../../src/db/postgres.js';
import EmbeddingService from '../../src/services/EmbeddingService.js';

// Mock EmbeddingService
jest.mock('../../src/services/EmbeddingService.js');

// Mock Postgres Pool
jest.mock('../../src/db/postgres.js', () => {
    const mockQuery = jest.fn();
    const mockClient = {
        query: mockQuery,
        release: jest.fn(),
    };
    const mockPool = {
        write: mockQuery,
        read: mockQuery, // Mock read to return something
        withTransaction: jest.fn((callback: any) => callback(mockClient)),
    };
    return {
        getPostgresPool: jest.fn(() => mockPool),
    };
});

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let mockGenerateEmbedding: any;
  let mockGenerateEmbeddings: any;
  let mockPool: any;

  beforeAll(() => {
    // Setup mocks
    mockGenerateEmbedding = jest.fn().mockResolvedValue(new Array(3072).fill(0.1));
    mockGenerateEmbeddings = jest.fn().mockResolvedValue([
        new Array(3072).fill(0.1),
        new Array(3072).fill(0.2)
    ]);

    (EmbeddingService as any).mockImplementation(() => ({
      generateEmbedding: mockGenerateEmbedding,
      generateEmbeddings: mockGenerateEmbeddings,
    }));

    service = VectorStoreService.getInstance();
    mockPool = getPostgresPool();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should ingest a document correctly', async () => {
    const tenantId = 'tenant-123';
    const docData = {
      title: 'Test Doc',
      content: 'Hello world. This is a test.',
      metadata: { author: 'Jules' },
    };

    mockPool.write.mockResolvedValueOnce({ rowCount: 1 }); // Insert doc

    const result = await service.ingestDocument(tenantId, docData);

    expect(result.chunkCount).toBeGreaterThan(0);
    expect(mockPool.write).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documents'),
        expect.arrayContaining([tenantId, docData.title])
    );

    // Check if transaction was called for chunks
    expect(mockPool.withTransaction).toHaveBeenCalled();
  });

  it('should search for documents', async () => {
      const tenantId = 'tenant-123';
      const query = 'Hello';

      // Mock search result
      mockPool.read.mockResolvedValueOnce({
          rows: [
              {
                  id: 'chunk-1',
                  document_id: 'doc-1',
                  chunk_index: 0,
                  content: 'Hello world',
                  metadata: {},
                  similarity: 0.9
              }
          ]
      });

      const results = await service.search(query, { tenantId });

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Hello world');
      expect(mockGenerateEmbedding).toHaveBeenCalledWith({ text: query });
      expect(mockPool.read).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          expect.arrayContaining([tenantId])
      );
  });
});
