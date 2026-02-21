import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Mock dependencies
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(),
  readFileSync: jest.fn(),
  createReadStream: jest.fn(),
};

const mockSpawn = jest.fn();

const mockNeo4jDriver = {
  session: jest.fn(),
  close: jest.fn(),
};

const mockRedisClient = {
  pipeline: jest.fn(),
};

const mockS3Client = {
  send: jest.fn(),
};

const mockReadline = {
  createInterface: jest.fn(),
};

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('fs', () => ({ default: mockFs }));
jest.unstable_mockModule('child_process', () => ({ spawn: mockSpawn }));
jest.unstable_mockModule('readline', () => ({ default: mockReadline, createInterface: mockReadline.createInterface }));
jest.unstable_mockModule('../db/neo4j.js', () => ({ getNeo4jDriver: () => mockNeo4jDriver }));
jest.unstable_mockModule('../db/redis.js', () => ({ getRedisClient: () => mockRedisClient }));
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => mockS3Client),
  GetObjectCommand: jest.fn(),
}));
jest.unstable_mockModule('../config/logger.js', () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

const { RestoreService } = await import('../RestoreService.js');

describe('RestoreService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = RestoreService.getInstance();

    // Setup mocks
    mockFs.existsSync.mockReturnValue(true); // Assume artifacts are local
    mockFs.createReadStream.mockReturnValue(new Readable({ read() { this.push(null); } })); // Default empty stream

    // Neo4j session mock
    const sessionMock = {
        run: jest.fn(),
        close: jest.fn(),
    };
    mockNeo4jDriver.session.mockReturnValue(sessionMock);

    // Redis pipeline mock
    const pipelineMock = {
        set: jest.fn(),
        exec: jest.fn(),
    };
    mockRedisClient.pipeline.mockReturnValue(pipelineMock);

    // Spawn mock (postgres)
    const childProcessMock = {
        on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
        }),
    };
    mockSpawn.mockReturnValue(childProcessMock);

    // Default readline mock
    mockReadline.createInterface.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {}
    });
  });

  it('should restore postgres', async () => {
      await service.restorePostgres('path/to/backup.sql');
      expect(mockSpawn).toHaveBeenCalledWith('psql', expect.any(Array), expect.any(Object));
  });

  it('should restore neo4j', async () => {
      // Mock readline for Neo4j (2 passes)
      // Pass 1: Nodes
      const nodeLine = JSON.stringify({ type: 'node', id: '1', labels: ['Person'], properties: { name: 'Alice' } });
      // Pass 2: Relationships
      const relLine = JSON.stringify({ type: 'relationship', start: '1', end: '2', label: 'KNOWS', properties: {} });

      let pass = 0;
      mockReadline.createInterface.mockImplementation(() => {
          pass++;
          return {
              [Symbol.asyncIterator]: async function* () {
                  if (pass === 1) { // First pass (nodes)
                      yield nodeLine;
                  } else { // Second pass (rels)
                      yield relLine;
                  }
              }
          };
      });

      await service.restoreNeo4j('path/to/backup.json');

      expect(mockFs.createReadStream).toHaveBeenCalledWith('path/to/backup.json');
      expect(mockNeo4jDriver.session().run).toHaveBeenCalled();
      // Should create index (might be called without params)
      expect(mockNeo4jDriver.session().run).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX'));
      // Should cleanup
      expect(mockNeo4jDriver.session().run).toHaveBeenCalledWith(expect.stringContaining('DROP INDEX'));
  });

  it('should restore redis', async () => {
      const line1 = JSON.stringify({ key: 'key1', value: 'value1' });
      const line2 = JSON.stringify({ key: 'key2', value: 'value2' });

      mockReadline.createInterface.mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
              yield line1;
              yield line2;
          }
      });

      await service.restoreRedis('path/to/backup.json');

      expect(mockFs.createReadStream).toHaveBeenCalledWith('path/to/backup.json');
      expect(mockRedisClient.pipeline().set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockRedisClient.pipeline().set).toHaveBeenCalledWith('key2', 'value2');
      expect(mockRedisClient.pipeline().exec).toHaveBeenCalled();
  });
});
