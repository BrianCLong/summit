import { BackupService } from '../services/BackupService.js';
import { flagService } from '../services/FlagService.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'BackupScheduler' });

const BACKUP_INTERVAL_MS = parseInt(process.env.BACKUP_INTERVAL_MS || '86400000', 10); // Default 24h

export function startBackupScheduler() {
  logger.info(`Starting backup scheduler with interval ${BACKUP_INTERVAL_MS}ms`);

  // Initial backup on startup (optional, maybe too heavy? let's stick to interval)
  // setTimeout(() => runBackup(), 10000);

  setInterval(() => {
    runBackup();
  }, BACKUP_INTERVAL_MS);
}

async function runBackup() {
  if (flagService.getFlag('DISABLE_BACKUPS')) {
      logger.warn('Skipping scheduled backup due to kill switch DISABLE_BACKUPS');
      return;
  }

  try {
    logger.info('Triggering scheduled backup...');
    await BackupService.getInstance().performFullBackup();
    logger.info('Scheduled backup finished successfully.');
  } catch (error: any) {
    logger.error('Scheduled backup failed', error);
  }
}
