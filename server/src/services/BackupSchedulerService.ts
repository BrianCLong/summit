import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { BackupService } from './BackupService.js';

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 0 * * *'; // Daily at midnight

/**
 * @class BackupSchedulerService
 * @description Manages automated backup scheduling and retention policies.
 */
export class BackupSchedulerService {
  private static instance: BackupSchedulerService;
  private backupTask: cron.ScheduledTask | null = null;
  private backupService: BackupService;

  private constructor() {
    this.backupService = BackupService.getInstance();
  }

  public static getInstance(): BackupSchedulerService {
    if (!BackupSchedulerService.instance) {
      BackupSchedulerService.instance = new BackupSchedulerService();
    }
    return BackupSchedulerService.instance;
  }

  /**
   * Starts the backup scheduler.
   */
  public start(): void {
    if (this.backupTask) {
      logger.warn('Backup scheduler already running');
      return;
    }

    logger.info(`Starting backup scheduler with schedule: ${BACKUP_SCHEDULE}`);

    this.backupTask = cron.schedule(BACKUP_SCHEDULE, async () => {
      logger.info('Running scheduled backup...');
      try {
        await this.backupService.performFullBackup();
        await this.cleanOldBackups();
      } catch (error) {
        logger.error('Scheduled backup failed', { error });
      }
    });

    logger.info('Backup scheduler started');
  }

  /**
   * Stops the backup scheduler.
   */
  public stop(): void {
    if (this.backupTask) {
      this.backupTask.stop();
      this.backupTask = null;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Removes backups older than the retention period.
   */
  public async cleanOldBackups(): Promise<void> {
    logger.info(`Cleaning backups older than ${BACKUP_RETENTION_DAYS} days`);

    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return;
      }

      const files = await fs.promises.readdir(BACKUP_DIR);
      const now = Date.now();
      const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > retentionMs) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          logger.debug(`Deleted old backup: ${file}`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old backup files`);
      }
    } catch (error) {
      logger.error('Failed to clean old backups', { error });
    }
  }
}
