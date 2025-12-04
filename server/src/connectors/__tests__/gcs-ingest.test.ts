import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GCSBatchConnector } from '../gcs-ingest.js';
import { Readable } from 'stream';

// Mock GCSConnector
const mockGCSConnectorInstance = {
  healthCheck: jest.fn(),
  listObjects: jest.fn(),
  downloadStream: jest.fn(),
};

jest.mock('../gcs.js', () => {
  return {
    GCSConnector: jest.fn(() => mockGCSConnectorInstance),
  };
});

describe('GCSBatchConnector', () => {
  let connector: GCSBatchConnector;
  let mockContext: any;

  beforeEach(() => {
    connector = new GCSBatchConnector();
    mockContext = {
      signal: { aborted: false },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      stateStore: {
        getCursor: jest.fn().mockResolvedValue(null),
        setCursor: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
      },
      emitter: {
        emitEntity: jest.fn(),
      },
    };
    mockGCSConnectorInstance.healthCheck.mockReset();
    mockGCSConnectorInstance.listObjects.mockReset();
    mockGCSConnectorInstance.downloadStream.mockReset();
  });

  it('should initialize correctly', async () => {
    await connector.initialize({
      config: {
        batchSize: 50,
        schema: { entityType: 'TestEntity' },
      },
      secrets: {
        projectId: 'test-project',
        bucketName: 'test-bucket',
      },
      tenantId: 'tenant-1',
    });

    // Access private property for testing via casting or assumption
    expect((connector as any).batchSize).toBe(50);
  });

  it('should ingest JSON files', async () => {
    await connector.initialize({
      config: {},
      secrets: { projectId: 'p', bucketName: 'b' },
      tenantId: 't',
    });

    mockGCSConnectorInstance.listObjects.mockResolvedValue({
      objects: [
        { name: 'data.json', bucket: 'b', etag: '123', contentType: 'application/json' },
      ],
      nextPageToken: undefined,
    });

    const jsonContent = JSON.stringify([{ id: 1, name: 'Alice' }]);
    const stream = Readable.from([Buffer.from(jsonContent)]);
    mockGCSConnectorInstance.downloadStream.mockResolvedValue(stream);

    await connector.pull(mockContext);

    expect(mockGCSConnectorInstance.listObjects).toHaveBeenCalled();
    expect(mockGCSConnectorInstance.downloadStream).toHaveBeenCalledWith('data.json');
    expect(mockContext.emitter.emitEntity).toHaveBeenCalledWith(expect.objectContaining({
      props: { id: 1, name: 'Alice' },
      type: 'Document', // Default
    }));
  });

  it('should handle deduplication', async () => {
    await connector.initialize({
        config: {},
        secrets: { projectId: 'p', bucketName: 'b' },
        tenantId: 't',
    });

    mockGCSConnectorInstance.listObjects.mockResolvedValue({
        objects: [
            { name: 'data.json', bucket: 'b', etag: '123' },
        ],
        nextPageToken: undefined,
    });

    // Mock state store to return existing etag
    mockContext.stateStore.get.mockResolvedValue('123');

    await connector.pull(mockContext);

    expect(mockGCSConnectorInstance.downloadStream).not.toHaveBeenCalled();
    expect(mockContext.emitter.emitEntity).not.toHaveBeenCalled();
  });
});
