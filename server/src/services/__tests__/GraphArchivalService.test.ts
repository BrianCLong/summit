import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GraphArchivalService } from '../GraphArchivalService.js';
import { Driver, Session } from 'neo4j-driver';
import { Upload } from '@aws-sdk/lib-storage';
import { writeAudit } from '../../utils/audit.js';

// Mocks
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@aws-sdk/lib-storage');
jest.mock('../../utils/audit.js');

describe('GraphArchivalService', () => {
  let driver: any;
  let session: any;
  let service: GraphArchivalService;
  let mockTx: any;

  beforeEach(() => {
    // Setup Neo4j mocks
    mockTx = {
      run: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    session = {
      run: jest.fn(),
      close: jest.fn(),
      beginTransaction: jest.fn().mockReturnValue(mockTx),
      lastBookmark: jest.fn(),
    };

    driver = {
      session: jest.fn().mockReturnValue(session),
      close: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

    service = new GraphArchivalService(driver as Driver, {
      enabled: true,
      checkIntervalHours: 1,
      s3Bucket: 'test-bucket',
      policies: [
        {
          label: 'TestLabel',
          ageThresholdDays: 30,
          batchSize: 10,
          targetTier: 'S3_STANDARD',
          dateProperty: 'createdAt'
        }
      ]
    });
  });

  afterEach(() => {
    service.stop();
  });

  it('should identify and archive cold nodes', async () => {
    // Mock S3 Upload
    const mockUploadDone = jest.fn().mockResolvedValue({});
    (Upload as unknown as jest.Mock).mockImplementation(() => ({
      done: mockUploadDone
    }) as any);

    // Mock count query (return 1 node to archive)
    (session.run as jest.Mock)
      .mockResolvedValueOnce({ // First query: count
        records: [{ get: () => ({ toNumber: () => 1 }) }]
      })
      .mockResolvedValueOnce({ // Second query: fetch batch
        records: [{
          get: (key: string) => {
            if (key === 'n') return { labels: ['TestLabel'] };
            if (key === 'props') return { id: 'node-1', createdAt: '2020-01-01', data: 'heavy' };
            if (key === 'eid') return 'element-id-123';
            return null;
          }
        }]
      })
      .mockResolvedValueOnce({ // Third query: stub nodes
        records: []
      });

    await service.runArchivalCycle();

    // Verify S3 upload
    expect(Upload).toHaveBeenCalledTimes(1);
    expect(mockUploadDone).toHaveBeenCalled();
    const uploadCallArgs = (Upload as unknown as jest.Mock).mock.calls[0][0] as any;
    expect(uploadCallArgs.params.Bucket).toBe('test-bucket');
    expect(uploadCallArgs.params.Key).toMatch(/graph\/TestLabel\/\d{4}\/.*\.json\.gz/);

    // Verify Neo4j Stubbing
    const stubCall = (session.run as jest.Mock).mock.calls[2];
    expect(stubCall[0]).toContain('WHERE elementId(n) = eid');
    expect(stubCall[0]).toContain('SET n._archived = true');
    expect((stubCall[1] as any).elementIds).toEqual(['element-id-123']);

    // Verify Audit
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GRAPH_ARCHIVED',
      resourceType: 'TestLabel'
    }));
  });

  it('should do nothing if no nodes found', async () => {
    (session.run as jest.Mock).mockResolvedValueOnce({
      records: [{ get: () => ({ toNumber: () => 0 }) }]
    });

    await service.runArchivalCycle();

    expect(Upload).not.toHaveBeenCalled();
    expect(session.run).toHaveBeenCalledTimes(1);
  });
});
