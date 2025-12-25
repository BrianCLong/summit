
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GraphEmbeddingService } from '../GraphEmbeddingService.js';
// import EmbeddingService from '../EmbeddingService.js'; // This is causing issues with Jest mocking ESM default export
import { getNeo4jDriver } from '../../db/neo4j.js';
import logger from '../../utils/logger.js';
import { applicationErrors } from '../../monitoring/metrics.js';

// Mock dependencies
jest.mock('../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn()
}));

// Mock EmbeddingService
const mockGenerateEmbeddings = jest.fn<any>();
const mockConfig = { model: 'test-model' };

jest.mock('../EmbeddingService.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
        return {
            config: mockConfig,
            generateEmbeddings: mockGenerateEmbeddings
        };
    })
  };
});

// Mock metrics to avoid import issues with prom-client
// We can't mock specific named exports easily if they are re-exported or used in complex ways.
// However, since we mock the module, we need to ensure the mocked object structure matches usage.
const mockInc = jest.fn();
const mockLabels = jest.fn().mockReturnValue({ inc: mockInc });

jest.mock('../../monitoring/metrics.js', () => {
    return {
        __esModule: true,
        applicationErrors: {
            labels: jest.fn().mockReturnValue({ inc: jest.fn() }),
            inc: jest.fn()
        }
    };
});

// Mock logger
jest.mock('../../utils/logger.js', () => {
    return {
        __esModule: true,
        default: {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        }
    };
});

describe('GraphEmbeddingService', () => {
  let service: any;
  let mockSession: any;
  let mockEmbeddingService: any;
  let mockDriver: any;
  // Get reference to mocked functions
  let mockApplicationErrorsLabels: any;

  beforeEach(() => {
    // Setup Neo4j mock
    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession)
    };
    (getNeo4jDriver as any).mockReturnValue(mockDriver);

    mockGenerateEmbeddings.mockReset();

    // Manually create a mock object
    mockEmbeddingService = {
        config: { model: 'test-model' },
        generateEmbeddings: mockGenerateEmbeddings
    };

    // Setup Metrics Mock
    mockApplicationErrorsLabels = (applicationErrors.labels as jest.Mock);
    mockApplicationErrorsLabels.mockClear();
    const incMock = jest.fn();
    mockApplicationErrorsLabels.mockReturnValue({ inc: incMock });

    // Create service instance with mocked embedding service
    service = new GraphEmbeddingService({
      embeddingService: mockEmbeddingService as any,
      batchSize: 2
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process embeddings for a tenant using cursor pagination', async () => {
    // Mock fetching nodes (first batch returns 2 nodes, second batch returns empty to stop loop)
    // 1. Fetch Batch 1 (returns 2 records)
    // 2. Write Batch 1
    // 3. Fetch Batch 2 (returns 0 records -> break)

    mockSession.run
      .mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? '1' : key === 'name' ? 'Node 1' : 'Desc 1') },
          { get: (key: string) => (key === 'id' ? '2' : key === 'name' ? 'Node 2' : 'Desc 2') }
        ]
      })
      .mockResolvedValueOnce({}) // Write result (don't care)
      .mockResolvedValueOnce({
        records: []
      }); // Second fetch returns empty

    // Mock embedding generation
    mockGenerateEmbeddings.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4]
    ]);

    const result = await service.computeAndStoreNodeEmbeddings('tenant-1');

    // Verify fetching nodes
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY n.id ASC'),
      expect.objectContaining({
        tenantId: 'tenant-1',
        batchSize: 2,
        lastId: null // First call has no cursor
      })
    );

    // Verify query includes incremental update logic
    expect(mockSession.run.mock.calls[0][0]).toContain('n.updatedAt > n.embedding_updatedAt');

    // Verify generating embeddings
    expect(mockEmbeddingService.generateEmbeddings).toHaveBeenCalledWith([
      'Node 1: Desc 1',
      'Node 2: Desc 2'
    ]);

    // Verify storing embeddings
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('UNWIND $updates as update'),
      expect.objectContaining({
        tenantId: 'tenant-1',
        model: 'test-model',
        updates: [
          { id: '1', embedding: [0.1, 0.2] },
          { id: '2', embedding: [0.3, 0.4] }
        ]
      })
    );

    // Verify query marks status as COMPLETED
    expect(mockSession.run.mock.calls[1][0]).toContain("n.embedding_status = 'COMPLETED'");

    // Verify second fetch called with cursor '2'
    expect(mockSession.run).toHaveBeenNthCalledWith(3,
      expect.stringContaining('AND n.id > $lastId'),
      expect.objectContaining({
        tenantId: 'tenant-1',
        batchSize: 2,
        lastId: '2' // Cursor from last record of previous batch
      })
    );

    expect(result).toEqual({
      processed: 2,
      errors: 0,
      skipped: 0
    });
  });

  it('should skip nodes with empty text and mark them as SKIPPED', async () => {
    mockSession.run
      .mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? '1' : null) } // Empty name/desc
        ]
      })
      .mockResolvedValueOnce({}) // Skip status write result
      .mockResolvedValueOnce({ records: [] }); // Second fetch

    const result = await service.computeAndStoreNodeEmbeddings('tenant-1');

    expect(mockEmbeddingService.generateEmbeddings).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);

    // Verify storing skipped status
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining("SET n.embedding_status = 'SKIPPED'"),
      expect.objectContaining({
        tenantId: 'tenant-1',
        updates: [{ id: '1' }]
      })
    );
  });

  it('should correctly construct query to re-process SKIPPED nodes if updated', async () => {
    // This test verifies the WHERE clause structure by inspecting the call arguments
    mockSession.run.mockResolvedValueOnce({ records: [] });

    await service.computeAndStoreNodeEmbeddings('tenant-1');

    const query = mockSession.run.mock.calls[0][0];

    // Check for the "updated skipped node" logic
    // OR (n.updatedAt > n.embedding_updatedAt)
    // AND exclusion of non-updated skipped nodes

    expect(query).toContain("OR n.embedding_status <> 'SKIPPED'");
    expect(query).toContain("n.updatedAt > n.embedding_updatedAt");
  });

  it('should handle errors gracefully', async () => {
    mockSession.run
      .mockResolvedValueOnce({
        records: [
          { get: (key: string) => (key === 'id' ? '1' : 'Text') }
        ]
      })
      .mockResolvedValueOnce({ records: [] }); // Second fetch returns empty

    mockGenerateEmbeddings.mockRejectedValue(new Error('API Error'));

    const result = await service.computeAndStoreNodeEmbeddings('tenant-1');

    expect(result.errors).toBe(1);
    expect(result.processed).toBe(0);

    // In the service, the error is logged and metric is incremented.
    expect(logger.error).toHaveBeenCalled();
    expect(applicationErrors.labels).toHaveBeenCalledWith('graph_embedding_service', 'BatchProcessingError', 'error');
  });
});
