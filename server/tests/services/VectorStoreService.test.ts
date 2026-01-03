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
  let pool: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Postgres mock
    const mockPoolObj = {
      write: jest.fn(),
      read: jest.fn(),
      withTransaction: jest.fn((callback: any) => callback({
        query: jest.fn(),
        release: jest.fn(),
      })),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPoolObj);
    pool = mockPoolObj;

    // Setup EmbeddingService mock
    mockGenerateEmbedding = (jest.fn() as any).mockResolvedValue([0.1, 0.2, 0.3]);
    const mockGenerateEmbeddings = (jest.fn() as any).mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);

    (EmbeddingService as jest.Mock).mockImplementation(() => ({
      generateEmbeddings: mockGenerateEmbeddings,
      generateEmbedding: mockGenerateEmbedding,
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

    pool.write.mockResolvedValueOnce({ rowCount: 1 }); // Insert doc

    const result = await service.ingestDocument(tenantId, docData);

    expect(result.chunkCount).toBeGreaterThan(0);
    expect(pool.write).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO documents'),
      expect.arrayContaining([tenantId, docData.title])
    );

    // Check if transaction was called for chunks
    expect(pool.withTransaction).toHaveBeenCalled();
  });

  it('should search for documents', async () => {
    const tenantId = 'tenant-123';
    const query = 'Hello';

    // Mock search result
    pool.read.mockResolvedValueOnce({
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
    expect(pool.read).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      expect.arrayContaining([tenantId])
    );
  });
});
