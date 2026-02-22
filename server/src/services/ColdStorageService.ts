import logger from '../config/logger.js';
import { S3Config } from '../backup/BackupService.js';
import path from 'path';
import { getPostgresPool } from '../db/postgres.js';
import pgCopyStreams from 'pg-copy-streams';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { exec } from 'child_process';

const { to: copyTo } = pgCopyStreams;
import { promisify } from 'util';

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

      if (this.s3Config.accessKeyId && this.s3Config.secretAccessKey) {
          this.s3Client = new S3Client({
              region: this.s3Config.region,
              endpoint: this.s3Config.endpoint,
              credentials: {
                  accessKeyId: this.s3Config.accessKeyId,
                  secretAccessKey: this.s3Config.secretAccessKey
              },
              forcePathStyle: true // Needed for some S3 compatible storages like MinIO
          });
      }
    }
  }

  /**
   * Archive a table partition
   * Stream data directly from DB -> Gzip -> S3
   */
  async archivePartition(
    tableName: string,
    partitionName: string,
    dropAfterArchive: boolean = false,
    storageClass: 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE' = 'STANDARD_IA'
  ): Promise<void> {
    if (!this.s3Client || !this.s3Config) {
         logger.warn(`Skipping archive for ${partitionName}: Cold Storage not configured`);
         return;
    }

    logger.info(`Archiving partition ${partitionName} of table ${tableName} to ${storageClass}...`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `archives/${tableName}/${partitionName}-${timestamp}.csv.gz`;

    const pool = getPostgresPool();
    // We need a raw client for streaming
    const client = await pool.connect();

    try {
        const stream = client.query(copyTo(`COPY (SELECT * FROM ${partitionName}) TO STDOUT WITH (FORMAT CSV, HEADER)`));
        const gzip = zlib.createGzip();

        // Use @aws-sdk/lib-storage Upload for streaming upload
        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.s3Config.bucket,
                Key: s3Key,
                Body: stream.pipe(gzip),
                StorageClass: storageClass,
                ContentType: 'application/gzip'
            }
        });

        await upload.done();
        logger.info(`Successfully archived ${partitionName} to s3://${this.s3Config.bucket}/${s3Key}`);

        if (dropAfterArchive) {
             logger.info(`Dropping partition ${partitionName} after successful archive`);
             await client.query(`DROP TABLE IF EXISTS ${partitionName}`);
        }

    } catch (error: any) {
        logger.error(`Failed to archive partition ${partitionName}`, error);
        throw error;
    } finally {
        client.release();
    }
  }

  // Keep legacy upload method (simulated or CLI based) for compatibility
  async upload(filepath: string, key: string, storageClass: 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE' = 'STANDARD_IA'): Promise<void> {
    if (!this.s3Config) {
      logger.warn('Skipping Cold Storage upload: No configuration found.');
      return;
    }

    logger.info(`Uploading ${filepath} to Cold Storage bucket ${this.s3Config.bucket} as ${key} (Class: ${storageClass})...`);

    try {
      if (process.env.USE_AWS_CLI === 'true') {
        await execAsync(
          `aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region} --storage-class ${storageClass}`
        );
      } else {
        // Simulating upload delay
        await new Promise((r: any) => setTimeout(r, 500));
        logger.info(`Simulated Cold Storage upload complete (Class: ${storageClass}).`);
      }
    } catch (error: any) {
      logger.error('Failed to upload to Cold Storage', error);
      throw error;
    }
  }
}

export const coldStorageService = new ColdStorageService();
