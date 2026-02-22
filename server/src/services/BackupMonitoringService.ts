
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logger as baseLogger } from '../config/logger.js';

const logger = baseLogger.child({ service: 'BackupMonitoringService' });

export interface BackupStatus {
  lastBackupAt: string | null;
  sizeBytes: number;
  filename: string | null;
  healthy: boolean;
  message?: string;
}

export class BackupMonitoringService {
  private s3Client: S3Client | null = null;
  private bucket: string | null = null;
  private prefix: string = 'backups/';

  constructor() {
    if (process.env.S3_BACKUP_BUCKET) {
      this.bucket = process.env.S3_BACKUP_BUCKET;
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: true,
      });
    } else {
      logger.warn('S3 Backup Bucket not configured. Monitoring disabled.');
    }
  }

  async getLastBackupStatus(): Promise<BackupStatus> {
    if (!this.s3Client || !this.bucket) {
      return {
        lastBackupAt: null,
        sizeBytes: 0,
        filename: null,
        healthy: false,
        message: 'Backup monitoring not configured',
      };
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return {
          lastBackupAt: null,
          sizeBytes: 0,
          filename: null,
          healthy: false,
          message: 'No backups found',
        };
      }

      // Sort by LastModified descending
      const backups = response.Contents.sort((a, b) => {
        return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
      });

      const latest = backups[0];

      // Check if backup is recent (e.g., within 24 hours)
      const now = Date.now();
      const lastModified = latest.LastModified?.getTime() || 0;
      const hoursSinceLastBackup = (now - lastModified) / (1000 * 60 * 60);
      const isHealthy = hoursSinceLastBackup < 25; // 25 hours grace period

      return {
        lastBackupAt: latest.LastModified?.toISOString() || null,
        sizeBytes: latest.Size || 0,
        filename: latest.Key || null,
        healthy: isHealthy,
        message: isHealthy ? 'Backup system healthy' : `Last backup was ${hoursSinceLastBackup.toFixed(1)} hours ago`,
      };

    } catch (error: any) {
      logger.error({ error }, 'Failed to check backup status');
      return {
        lastBackupAt: null,
        sizeBytes: 0,
        filename: null,
        healthy: false,
        message: `Error checking backups: ${error.message}`,
      };
    }
  }
}

export const backupMonitoringService = new BackupMonitoringService();
