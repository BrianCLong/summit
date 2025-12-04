import { BackupService } from './BackupService.js';
import logger from '../utils/logger.js';
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
      } catch (error) {
        logger.error('Scheduled backup execution failed', error);
      }
    });
  }

  async triggerImmediateBackup() {
    logger.info('Triggering immediate backup...');
    return await this.backupService.runAllBackups();
  }
}
