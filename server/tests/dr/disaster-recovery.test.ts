import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

let DisasterRecoveryService: typeof import('../../src/dr/DisasterRecoveryService.js').DisasterRecoveryService;

const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
const resolved = <T>(value: T) => jest.fn().mockImplementation(async () => value);

beforeAll(async () => {
  jest.resetModules();
  await jest.unstable_mockModule('../../src/cache/redis.js', () => ({
    RedisService: {
      getInstance: jest.fn(() => ({
        set: mockRedisSet,
        get: mockRedisGet,
      })),
    },
  }));
  await jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }),
    },
    logger: {
      child: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }),
    },
    correlationStorage: {
      getStore: jest.fn(),
      run: jest.fn(),
      enterWith: jest.fn(),
    },
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }));

  ({ DisasterRecoveryService } = await import('../../src/dr/DisasterRecoveryService.js'));
});

describe('Disaster recovery restore validation', () => {
  beforeEach(() => {
    mockRedisSet.mockClear();
    mockRedisSet.mockImplementation(async () => undefined);
    mockRedisGet.mockImplementation(async () => null);
    delete process.env.BACKUP_ROOT_DIR;
  });
  afterEach(async () => {
    if (process.env.BACKUP_ROOT_DIR) {
      await fs.rm(process.env.BACKUP_ROOT_DIR, { recursive: true, force: true });
      delete process.env.BACKUP_ROOT_DIR;
    }
  });

  it('records a failed drill when backups are missing', async () => {
    const service = new DisasterRecoveryService();
    const recordSpy = resolved<void>(undefined);
    (service as any).recordDrillResult = recordSpy;
    (service as any).listBackups = resolved<string[]>([]);
    const result = await service.runDrill('postgres');

    expect(result).toBe(false);
    expect(recordSpy).toHaveBeenCalledWith(false, expect.any(Number), expect.any(String));
  });

  it('records a successful drill when backups are available', async () => {
    const service = new DisasterRecoveryService();
    const recordSpy = resolved<void>(undefined);
    (service as any).recordDrillResult = recordSpy;
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dr-backups-'));
    process.env.BACKUP_ROOT_DIR = rootDir;
    const backupDir = path.join(rootDir, 'postgres', '2026-01-01');
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'backup.sql'), 'stub');
    (service as any).listBackups = resolved<string[]>(['2026-01-01']);
    (service as any).verifyPostgresRestore = resolved<void>(undefined);

    const result = await service.runDrill('postgres');

    const errorMessage = recordSpy.mock.calls[0]?.[2];
    expect(errorMessage).toBeUndefined();
    expect(result).toBe(true);
    expect(recordSpy).toHaveBeenCalledWith(true, expect.any(Number));
  });
});
