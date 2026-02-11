import { jest } from '@jest/globals';

// Define mocks
const mockExec = jest.fn();
const mockPoolWrite = jest.fn();
const mockPoolRead = jest.fn();
const mockScanStream = jest.fn();
const mockPipeline = jest.fn();
const mockPipelineExec = jest.fn();
const mockWrite = jest.fn();
const mockEnd = jest.fn();
const mockPipe = jest.fn();
const mockLpush = jest.fn();
const mockLtrim = jest.fn();
const mockStat = jest.fn();
const mockMkdir = jest.fn();
const mockS3Send = jest.fn();

// Mock Child Process
jest.unstable_mockModule('child_process', () => ({
  exec: (cmd: string, cb: any) => cb(null, { stdout: 'ok' }),
  default: {
      exec: (cmd: string, cb: any) => cb(null, { stdout: 'ok' }),
  }
}));

jest.unstable_mockModule('util', () => ({
  promisify: (fn: any) => mockExec,
  default: {
      promisify: (fn: any) => mockExec,
  }
}));

// Mock FS
const mockCreateWriteStream = jest.fn(() => ({
  write: mockWrite,
  end: mockEnd,
  on: (event: string, cb: any) => {
    if (event === 'finish') cb();
    return;
  },
  pipe: mockPipe,
}));

jest.unstable_mockModule('fs', () => ({
  createWriteStream: mockCreateWriteStream,
  createReadStream: jest.fn(),
  promises: {
    mkdir: mockMkdir,
    stat: mockStat,
    writeFile: jest.fn(),
  },
  default: {
    createWriteStream: mockCreateWriteStream,
    createReadStream: jest.fn(),
    promises: {
        mkdir: mockMkdir,
        stat: mockStat,
        writeFile: jest.fn(),
    }
  }
}));

jest.unstable_mockModule('fs/promises', () => ({
  mkdir: mockMkdir,
  stat: mockStat,
  writeFile: jest.fn(),
  default: {
      mkdir: mockMkdir,
      stat: mockStat,
      writeFile: jest.fn(),
  }
}));

jest.unstable_mockModule('zlib', () => ({
  createGzip: jest.fn(() => ({
    pipe: mockPipe,
    write: mockWrite,
    end: mockEnd,
  })),
  default: {
      createGzip: jest.fn(() => ({
        pipe: mockPipe,
        write: mockWrite,
        end: mockEnd,
      })),
  }
}));

// Mock Redis Service
const mockRedisClient = {
  scanStream: mockScanStream,
  pipeline: mockPipeline,
  isCluster: false,
  constructor: { name: 'Redis' },
  lpush: mockLpush,
  ltrim: mockLtrim,
};

jest.unstable_mockModule('../cache/redis.js', () => ({
  RedisService: {
    getInstance: () => ({
      getClient: () => mockRedisClient,
    }),
  },
}));

// Mock Postgres
jest.unstable_mockModule('../db/postgres.js', () => ({
  getPostgresPool: () => ({
    write: mockPoolWrite,
    read: mockPoolRead,
  }),
}));

// Mock Neo4j
jest.unstable_mockModule('../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: () => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn(),
    }),
  })),
}));

// Mock AWS S3
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({
        send: mockS3Send
    })),
    PutObjectCommand: jest.fn()
}));


// Mock Metrics
jest.unstable_mockModule('../utils/metrics.js', () => ({
    PrometheusMetrics: class {
        createCounter() {}
        createHistogram() {}
        createGauge() {}
        setGauge() {}
        observeHistogram() {}
        incrementCounter() {}
    }
}));

// Mock Logger
jest.unstable_mockModule('../config/logger.js', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        child: () => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        })
    },
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        child: () => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        })
    }
}));

// Import implementations under test
const { BackupService } = await import('../backup/BackupService.js');
const { PartitionMaintenanceService } = await import('../services/PartitionMaintenanceService.js');

describe('BackupService', () => {
  let backupService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStat.mockResolvedValue({ size: 1024 });

    mockScanStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
            yield ['key1', 'key2'];
        }
    });

    mockPipeline.mockReturnValue({
        dump: jest.fn(),
        pttl: jest.fn(),
        exec: mockPipelineExec,
    });

    mockPipelineExec.mockResolvedValue([
        [null, Buffer.from('dump1')],
        [null, 1000],
        [null, Buffer.from('dump2')],
        [null, -1],
    ]);

    mockCreateWriteStream.mockReturnValue({
        write: mockWrite,
        end: mockEnd,
        on: (event: string, cb: any) => { if (event === 'finish') cb(); },
        pipe: mockPipe,
    } as any);

    backupService = new BackupService('/tmp/backups');
  });

  test('backupRedis performs logical backup using SCAN and DUMP', async () => {
    jest.spyOn(backupService, 'ensureBackupDir').mockResolvedValue('/tmp/backups/redis/today');
    jest.spyOn(backupService, 'recordBackupMeta').mockResolvedValue();

    const result = await backupService.backupRedis({ compress: false, uploadToS3: false });

    expect(result).toContain('redis-export-');
    expect(mockRedisClient.scanStream).toHaveBeenCalled();
    expect(mockPipelineExec).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();

    const calls = mockWrite.mock.calls;
    const writtenData = calls.map((c: any) => c[0]).join('');
    expect(writtenData).toContain('"k":"key1"');
    expect(writtenData).toContain('"v":"ZHVtcDE="');
    expect(writtenData).toContain('"k":"key2"');
  });

  test('uploadToS3 uses S3Client', async () => {
      // Need to simulate S3 configured
      process.env.S3_BACKUP_BUCKET = 'test-bucket';
      const s3Service = new BackupService('/tmp/backups');
      // @ts-ignore
      s3Service.s3Client = { send: mockS3Send };
      // @ts-ignore
      s3Service.s3Config = { bucket: 'test-bucket' };

      await s3Service.uploadToS3('/path/to/file', 'key');

      expect(mockS3Send).toHaveBeenCalled();
      delete process.env.S3_BACKUP_BUCKET;
  });
});

describe('PartitionMaintenanceService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolRead.mockResolvedValue({ rows: [{ exists: true }] });
    service = new PartitionMaintenanceService();
  });

  test('maintainPartitions calls ensuring functions', async () => {
    await service.maintainPartitions();

    expect(mockPoolWrite).toHaveBeenCalledWith(
      expect.stringContaining('ensure_event_store_partitions_for_all'),
      expect.arrayContaining([2, 12])
    );

    expect(mockPoolWrite).toHaveBeenCalledWith(
      expect.stringContaining('ensure_hipaa_log_partitions_for_all')
    );
  });
});
