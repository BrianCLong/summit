
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('child_process', () => ({
  exec: jest.fn(),
}));

jest.unstable_mockModule('fs', () => ({
  default: {
      existsSync: jest.fn(),
      mkdirSync: jest.fn(),
      renameSync: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
}));

// Dynamic imports are required after unstable_mockModule
const { BackupManager } = await import('../BackupManager.js');
const { exec } = await import('child_process');
const fs = await import('fs');

describe('BackupManager', () => {
  let backupManager: any;
  const mockExec = exec as unknown as jest.Mock;
  // fs default export mock
  const mockFsExistsSync = fs.default.existsSync as unknown as jest.Mock;

  beforeEach(() => {
    backupManager = new BackupManager();
    jest.clearAllMocks();

    mockExec.mockImplementation(((cmd: string, callback: any) => {
        callback(null, 'stdout', 'stderr');
    }) as any);

    mockFsExistsSync.mockReturnValue(true);
  });

  it('should backup postgres successfully', async () => {
    const options = { outputDir: '/tmp/backups' };
    await backupManager.backupPostgres(options);

    expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('pg_dump'),
        expect.any(Function)
    );
  });

  it('should backup redis successfully', async () => {
    const options = { outputDir: '/tmp/backups' };
    await backupManager.backupRedis(options);

    expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('redis-cli'),
        expect.any(Function)
    );
  });

  it('should backup redis with password', async () => {
    process.env.REDIS_PASSWORD = 'secret';
    const options = { outputDir: '/tmp/backups' };
    await backupManager.backupRedis(options);

    expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-a "secret"'),
        expect.any(Function)
    );
    delete process.env.REDIS_PASSWORD;
  });

  it('should backup neo4j successfully when neo4j-admin is present', async () => {
    const options = { outputDir: '/tmp/backups' };

    mockExec.mockImplementation(((cmd: string, callback: any) => {
        callback(null, 'ver', '');
    }) as any);

    await backupManager.backupNeo4j(options);

    expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('neo4j-admin database dump'),
        expect.any(Function)
    );
  });

  it('should fail backup if exec fails', async () => {
    mockExec.mockImplementation(((cmd: string, callback: any) => {
        callback(new Error('Command failed'), '', 'stderr');
    }) as any);

    await expect(backupManager.backupPostgres({ outputDir: '/tmp' }))
        .rejects.toThrow('Command failed');
  });
});
