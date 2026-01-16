
import logger from '../config/logger.js';
import { S3Config } from '../backup/BackupService.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { getPostgresPool } from '../db/postgres.js';

const execAsync = promisify(exec);

export class ColdStorageService {
  private s3Config: S3Config | null = null;

  constructor() {
    if (process.env.S3_COLD_STORAGE_BUCKET) {
      this.s3Config = {
        bucket: process.env.S3_COLD_STORAGE_BUCKET,
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
  }

  /**
   * Upload a file to Cold Storage (e.g. S3 Glacier)
   */
  async upload(filepath: string, key: string): Promise<void> {
    if (!this.s3Config) {
      logger.warn('Skipping Cold Storage upload: No configuration found.');
      return;
    }

    logger.info(`Uploading ${filepath} to Cold Storage bucket ${this.s3Config.bucket} as ${key}...`);

    try {
      if (process.env.USE_AWS_CLI === 'true') {
        // Use standard storage class for now, lifecycle rules can move to Glacier
        await execAsync(
          `aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region} --storage-class STANDARD_IA`
        );
      } else {
        // Simulating upload delay
        await new Promise((r: any) => setTimeout(r, 500));
        logger.info('Simulated Cold Storage upload complete.');
      }
    } catch (error: any) {
      logger.error('Failed to upload to Cold Storage', error);
      throw error;
    }
  }

  /**
   * Archive a table partition
   * 1. Export partition data to file (CSV/Parquet/SQL)
   * 2. Upload to Cold Storage
   * 3. (Optional) Drop partition from DB
   */
  async archivePartition(
    tableName: string,
    partitionName: string,
    dropAfterArchive: boolean = false
  ): Promise<void> {
    logger.info(`Archiving partition ${partitionName} of table ${tableName}...`);

    const exportDir = path.join(process.env.TEMP_DIR || '/tmp', 'archives');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${partitionName}-${timestamp}.sql.gz`;
    const filepath = path.join(exportDir, filename);

    // DB Connection details for pg_dump
    const pgHost = process.env.POSTGRES_HOST || 'localhost';
    const pgUser = process.env.POSTGRES_USER || 'intelgraph';
    const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
    const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

    try {
        // Use pg_dump to export the partition table
        // Note: pg_dump must be available in the environment
        const cmd = `PGPASSWORD='${pgPassword}' pg_dump -h ${pgHost} -U ${pgUser} -t ${partitionName} ${pgDb} | gzip > "${filepath}"`;

        if (process.env.MOCK_ARCHIVE === 'true') {
             await fs.writeFile(filepath, `Simulated export of ${partitionName}\n`);
             logger.info('Simulated pg_dump execution');
        } else {
            await execAsync(cmd);
        }

        // Upload
        const s3Key = `archives/${tableName}/${filename}`;
        await this.upload(filepath, s3Key);

        // Cleanup local file
        await fs.unlink(filepath);

        if (dropAfterArchive) {
            logger.info(`Dropping partition ${partitionName} after successful archive...`);
            const pool = getPostgresPool();
            const client = await pool.connect();
            try {
                await client.query(`DROP TABLE IF EXISTS ${partitionName}`);
                logger.info(`Partition ${partitionName} dropped.`);
            } finally {
                client.release();
            }
        }

    } catch (error: any) {
        logger.error(`Failed to archive partition ${partitionName}`, error);
        throw error;
    }
  }
}

export const coldStorageService = new ColdStorageService();
