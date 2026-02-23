
import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Mocks must be hoisted
jest.unstable_mockModule('../../cache/redis.js', () => ({
  RedisService: {
    getInstance: jest.fn(),
  },
}));

jest.unstable_mockModule('fs/promises', () => {
    const mock = {
      mkdir: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockResolvedValue({ size: 100 }),
      writeFile: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    };
    return {
        ...mock,
        default: mock
    };
});

jest.unstable_mockModule('fs', () => ({
  createWriteStream: jest.fn(),
  createReadStream: jest.fn(),
}));

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

jest.unstable_mockModule('../../db/neo4j.js', () => ({
  getNeo4jDriver: () => ({
    session: () => ({
      run: jest.fn().mockReturnValue({
        records: [],
        [Symbol.asyncIterator]: async function* () { yield* []; }
      }),
      close: jest.fn(),
    }),
  }),
}));

describe('BackupService', () => {
  let BackupServiceClass;
  let mockRedisClient;
  let backupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisClient = {
      // Mock scanStream returning an async iterator of arrays of keys
      scanStream: jest.fn().mockReturnValue(Readable.from([['key1']])),
      type: jest.fn().mockResolvedValue('string'),
      ttl: jest.fn().mockResolvedValue(100),
      dump: jest.fn().mockResolvedValue(Buffer.from('test')),
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      constructor: { name: 'Redis' }
    };

    const { RedisService } = await import('../../cache/redis.js');
    (RedisService.getInstance as jest.Mock).mockReturnValue({
      getClient: () => mockRedisClient,
    });

    const fs = await import('fs');
    (fs.createWriteStream as jest.Mock).mockReturnValue({
        write: jest.fn(),
        end: jest.fn(),
        on: function(event, cb) { // Use function to bind this
            if (event === 'finish') cb();
            return this;
        },
        once: function(event, cb) {
             if (event === 'drain') cb();
             return this;
        },
        pipe: jest.fn()
    });

    const mod = await import('../BackupService.js');
    BackupServiceClass = mod.BackupService;
    backupService = new BackupServiceClass('/tmp/backups');
  });

  describe('backupRedis', () => {
      it('should perform logical backup', async () => {
          await backupService.backupRedis();

          expect(mockRedisClient.scanStream).toHaveBeenCalled();
          expect(mockRedisClient.dump).toHaveBeenCalledWith('key1');
          expect(mockRedisClient.lpush).toHaveBeenCalled();

          const fs = await import('fs');
          expect(fs.createWriteStream).toHaveBeenCalled();
      });
  });
});
