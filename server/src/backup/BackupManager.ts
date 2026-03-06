import { BackupService } from './BackupService.js';
import { logger } from '../config/logger.js';
import cron from 'node-cron';

export class BackupManager {
  private backupService: BackupService;
  private schedule: string; // Cron expression

  constructor(schedule: string = '0 2 * * *') { // Default: 2 AM daily
    this.backupService = new BackupService();
    this.schedule = schedule;
  }

  startScheduler() {
    logger.info(`Starting backup scheduler with schedule: ${this.schedule}`);
    cron.schedule(this.schedule, async () => {
      logger.info('Running scheduled backups...');
      try {
        const results = await this.backupService.runAllBackups();
        logger.info({ results }, 'Scheduled backups completed');
      } catch (error: any) {
        logger.error('Scheduled backup execution failed', error);
      }
    });

    // Hourly Redis Backup (for fast recovery)
    cron.schedule('0 * * * *', async () => {
      logger.info('Running hourly Redis backup...');
      try {
        await this.backupService.backupRedis({ uploadToS3: false }); // Local only for speed
      } catch (error: any) {
        logger.error('Hourly Redis backup failed', error);
      }
    });
  }

  async triggerImmediateBackup() {
    logger.info('Triggering immediate backup...');
    return await this.backupService.runAllBackups();
  }
}
