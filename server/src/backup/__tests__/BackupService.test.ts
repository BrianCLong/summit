
import { jest } from '@jest/globals';

const mockRedisClient = {
  config: jest.fn(),
  bgsave: jest.fn(),
  lpush: jest.fn(),
  ltrim: jest.fn(),
};

const mockRedisService = {
  getClient: jest.fn().mockReturnValue(mockRedisClient),
};

const mockNeo4jSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockNeo4jDriver = {
  session: jest.fn().mockReturnValue(mockNeo4jSession),
};

const mockExecAsync = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  default: {
    mkdir: jest.fn(),
    stat: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
  },
}));

jest.unstable_mockModule('child_process', () => ({
  exec: (cmd: string, cb: any) => cb(null, { stdout: '', stderr: '' }),
}));

jest.unstable_mockModule('util', () => ({
  promisify: (fn: any) => mockExecAsync,
}));

jest.unstable_mockModule('../../cache/redis.js', () => ({
  RedisService: {
    getInstance: () => mockRedisService,
  },
}));

jest.unstable_mockModule('../../db/neo4j.js', () => ({
  getNeo4jDriver: () => mockNeo4jDriver,
}));

jest.unstable_mockModule('../../config/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter() {}
    createHistogram() {}
    createGauge() {}
    incrementCounter() {}
    observeHistogram() {}
    setGauge() {}
  }
}));

const { BackupService } = await import('../BackupService.js');
const fs = (await import('fs/promises')).default;

describe('BackupService', () => {
  let backupService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.getClient.mockReturnValue(mockRedisClient);
    backupService = new BackupService();
    // Default mocks
    (fs.stat as jest.Mock).mockResolvedValue({ size: 100, isFile: () => true } as any);
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
  });

  describe('backupRedis', () => {
    it('should try to copy RDB file if accessible', async () => {
      mockRedisClient.config.mockResolvedValueOnce(['dir', '/data']);
      mockRedisClient.config.mockResolvedValueOnce(['dbfilename', 'dump.rdb']);

      const path = await backupService.backupRedis();

      expect(mockRedisClient.bgsave).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalledWith('/data/dump.rdb', expect.stringContaining('dump-'));
      expect(path).toContain('.rdb');
    });

    it('should fallback to log file if RDB copy fails', async () => {
      mockRedisClient.config.mockResolvedValueOnce(['dir', '/data']);
      mockRedisClient.config.mockResolvedValueOnce(['dbfilename', 'dump.rdb']);
      (fs.copyFile as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const path = await backupService.backupRedis();

      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('redis-backup-log'), expect.stringContaining('Warning: Could not copy'));
      expect(path).toContain('.txt');
    });
  });

  describe('backupPostgres', () => {
    it('should run pg_dump and capture stderr', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'notice: something' });

      await backupService.backupPostgres();

      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining('pg_dump'));
    });

    it('should throw if pg_dump fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('pg_dump failed'));

      await expect(backupService.backupPostgres()).rejects.toThrow('pg_dump failed');
    });
  });
});
