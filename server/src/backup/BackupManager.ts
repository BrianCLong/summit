
import { BackupService } from './BackupService.js';
import logger from '../config/logger.js';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';

export class BackupManager {
  private backupService: BackupService;
  private schedule: string;
  private retentionDays: number;
  private backupRoot: string;

  constructor(schedule: string = '0 2 * * *', retentionDays: number = 7) {
    this.backupService = new BackupService();
    this.schedule = schedule;
    this.retentionDays = retentionDays;
    this.backupRoot = process.env.BACKUP_ROOT_DIR || './backups';
  }

  startScheduler() {
    logger.info(`Starting backup scheduler with schedule: ${this.schedule} and retention: ${this.retentionDays} days`);
    cron.schedule(this.schedule, async () => {
      logger.info('Running scheduled backups...');
      try {
        await this.backupService.runAllBackups();
        await this.cleanupOldBackups();
        logger.info('Scheduled backups and cleanup completed');
      } catch (error: any) {
        logger.error('Scheduled backup execution failed', error);
      }
    });
  }

  async cleanupOldBackups() {
      const types = ['postgres', 'neo4j', 'redis'];
      const now = Date.now();
      const maxAgeMs = this.retentionDays * 24 * 60 * 60 * 1000;

      for (const type of types) {
          const dir = path.join(this.backupRoot, type);
          try {
              const files = await this.getAllFiles(dir);
              for (const file of files) {
                  const stats = await fs.stat(file);
                  if (now - stats.mtimeMs > maxAgeMs) {
                      await fs.unlink(file);
                      logger.info(`Deleted old backup: ${file}`);
                  }
              }
          } catch (err: any) {
              // Directory might not exist yet
              if (err.code !== 'ENOENT') {
                  logger.error(`Failed to cleanup backups for ${type}`, err);
              }
          }
      }
  }

  private async getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
          const fullPath = path.join(dirPath, file);
          if ((await fs.stat(fullPath)).isDirectory()) {
              await this.getAllFiles(fullPath, arrayOfFiles);
          } else {
              arrayOfFiles.push(fullPath);
          }
      }
      return arrayOfFiles;
  }

  async triggerImmediateBackup() {
    logger.info('Triggering immediate backup...');
    return await this.backupService.runAllBackups();
  }
}
