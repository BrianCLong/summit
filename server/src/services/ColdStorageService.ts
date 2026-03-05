
import logger from '../config/logger.js';
import { S3Config } from '../backup/BackupService.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

export class ColdStorageService {
  private s3Config: S3Config | null = null;
  private s3Client: S3Client | null = null;

  constructor() {
    if (process.env.S3_COLD_STORAGE_BUCKET) {
      this.s3Config = {
        bucket: process.env.S3_COLD_STORAGE_BUCKET,
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };

      this.s3Client = new S3Client({
          region: this.s3Config.region,
          endpoint: this.s3Config.endpoint,
          credentials: {
              accessKeyId: this.s3Config.accessKeyId || '',
              secretAccessKey: this.s3Config.secretAccessKey || ''
          },
          forcePathStyle: true // Often needed for MinIO/Localstack
      });
    }
  }

  /**
   * Upload a file to Cold Storage (e.g. S3 Glacier)
   */
  async upload(filepath: string, key: string, storageClass: 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE' = 'STANDARD_IA'): Promise<void> {
    if (!this.s3Client || !this.s3Config) {
      logger.warn('Skipping Cold Storage upload: No configuration found.');
      return;
    }

    logger.info(`Uploading ${filepath} to Cold Storage bucket ${this.s3Config.bucket} as ${key} (Class: ${storageClass})...`);

    try {
      const fileStream = createReadStream(filepath);
      const command = new PutObjectCommand({
          Bucket: this.s3Config.bucket,
          Key: key,
          Body: fileStream,
          StorageClass: storageClass
      });

      await this.s3Client.send(command);
      logger.info(`Cold Storage upload complete (Class: ${storageClass}).`);
    } catch (error: any) {
      logger.error('Failed to upload to Cold Storage', error);
      throw error;
    }
  }

  /**
   * Archive a table partition
   * 1. Export partition data to file (pg_dump compressed)
   * 2. Upload to Cold Storage
   * 3. (Optional) Drop partition from DB (Not implemented here, handled by caller)
   */
  async archivePartition(
    tableName: string,
    partitionName: string,
    dropAfterArchive: boolean = false, // Kept for interface compatibility but ignored or warned
    storageClass: 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE' = 'STANDARD_IA'
  ): Promise<void> {
    logger.info(`Archiving partition ${partitionName} of table ${tableName} to ${storageClass}...`);

    const exportDir = path.join(process.env.TEMP_DIR || '/tmp', 'archives');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${partitionName}-${timestamp}.sql.gz`;
    const filepath = path.join(exportDir, filename);

    const pgHost = process.env.POSTGRES_HOST || 'localhost';
    const pgUser = process.env.POSTGRES_USER || 'intelgraph';
    const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
    const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

    // pg_dump -t table_name ... | gzip > file
    // Pass password via environment variable for security
    const cmd = `pg_dump -h ${pgHost} -U ${pgUser} -d ${pgDb} -t ${partitionName} | gzip > "${filepath}"`;

    try {
        logger.info({ cmd: cmd.replace(pgPassword, '***') }, 'Executing pg_dump for partition');

        await execAsync(cmd, {
            env: {
                ...process.env,
                PGPASSWORD: pgPassword
            }
        });

        // Upload
        await this.upload(filepath, `archives/${tableName}/${filename}`, storageClass);

        // Cleanup local file
        await fs.unlink(filepath);

        if (dropAfterArchive) {
             logger.warn('dropAfterArchive was set to true but ColdStorageService does not handle dropping partitions to avoid circular dependencies or transaction issues. Please drop manually or use PartitionManager.');
        }

    } catch (error: any) {
        logger.error(`Failed to archive partition ${partitionName}`, error);
        throw error;
    }
  }
}

export const coldStorageService = new ColdStorageService();
