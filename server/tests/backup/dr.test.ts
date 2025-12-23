
import { jest } from '@jest/globals';
import { DisasterRecoveryManager } from '../../src/backup/DisasterRecoveryManager.js';
import { BackupService } from '../../src/backup/BackupService.js';

jest.mock('../../src/backup/BackupService.js');
jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('DisasterRecoveryManager', () => {
  let drManager: DisasterRecoveryManager;
  let mockBackupService: jest.Mocked<BackupService>;

  beforeEach(() => {
    mockBackupService = new BackupService() as jest.Mocked<BackupService>;
    (BackupService as unknown as jest.Mock).mockImplementation(() => mockBackupService);

    drManager = new DisasterRecoveryManager();
  });

  it('should orchestrate full recovery', async () => {
    const pgPath = '/backups/pg.sql.gz';
    const neoPath = '/backups/neo.jsonl.gz';

    await drManager.performFullRecovery(pgPath, neoPath);

    expect(mockBackupService.restorePostgres).toHaveBeenCalledWith(pgPath);
    expect(mockBackupService.restoreNeo4j).toHaveBeenCalledWith(neoPath);
  });

  it('should handle partial recovery', async () => {
    const pgPath = '/backups/pg.sql.gz';

    await drManager.performFullRecovery(pgPath, undefined);

    expect(mockBackupService.restorePostgres).toHaveBeenCalledWith(pgPath);
    expect(mockBackupService.restoreNeo4j).not.toHaveBeenCalled();
  });

  it('should propagate errors', async () => {
      mockBackupService.restorePostgres.mockRejectedValue(new Error('Restore failed'));

      await expect(drManager.performFullRecovery('/path')).rejects.toThrow('Restore failed');
  });
});
