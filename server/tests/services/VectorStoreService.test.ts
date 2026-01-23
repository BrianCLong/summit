import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { VectorStoreService } from '../../src/services/VectorStoreService.js';
import { getPostgresPool } from '../../src/db/postgres.js';
import EmbeddingService from '../../src/services/EmbeddingService.js';

// Mock EmbeddingService
jest.mock('../../src/services/EmbeddingService.js');

// Mock Postgres Pool
// Mock Postgres Pool
const mockPoolFactory = () => ({
  write: jest.fn(),
  read: jest.fn(),
  withTransaction: jest.fn((callback: any) => callback({
    query: jest.fn(),
    release: jest.fn(),
  })),
});

jest.mock('../../src/db/postgres', () => ({
  __esModule: true,
  getPostgresPool: jest.fn().mockReturnValue({
    write: jest.fn(),
    read: jest.fn(),
    withTransaction: jest.fn((callback: any) => callback({
      query: jest.fn(),
      release: jest.fn(),
    })),
  }),
}));
jest.mock('../../src/db/postgres.js', () => ({
  __esModule: true,
  getPostgresPool: jest.fn().mockReturnValue({
    write: jest.fn(),
    read: jest.fn(),
    withTransaction: jest.fn((callback: any) => callback({
      query: jest.fn(),
      release: jest.fn(),
    })),
  }),
}));

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let mockGenerateEmbedding: any;
  let pool: any; // Changed from mockPool

  beforeEach(async () => { // Changed from beforeAll
    // Reset mocks
    jest.clearAllMocks();
    console.log('VectorStoreService Test: getPostgresPool type:', typeof getPostgresPool);
    if (typeof getPostgresPool === 'function') {
      console.log('VectorStoreService Test: getPostgresPool return:', getPostgresPool());
    } else {
      console.log('VectorStoreService Test: getPostgresPool is not a function');
    }

    pool = getPostgresPool(); // Assign to 'pool'

    // Mock EmbeddingService
    (EmbeddingService as jest.Mock).mockImplementation(() => ({
      generateEmbeddings: jest.fn().mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]),
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }));

    // Singleton reset
    (VectorStoreService as any).instance = null;
    service = VectorStoreService.getInstance();
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
