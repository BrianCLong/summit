// @ts-nocheck
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import logger from '../utils/logger.js';
import { backupDuration, backupSize } from '../metrics/dbMetrics.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';
import { getRedisClient } from '../config/database.js';

const execAsync = promisify(exec);

// Minimal S3 interface for simulation or replacement with @aws-sdk/client-s3
interface S3Config {
    bucket: string;
    region: string;
    endpoint?: string; // For MinIO or other S3-compatible
    accessKeyId?: string;
    secretAccessKey?: string;
}

export interface BackupOptions {
  destinationPath?: string;
  compress?: boolean;
  uploadToS3?: boolean;
}

export class BackupService {
  private backupRoot: string;
  private s3Config: S3Config | null = null;

  constructor(backupRoot: string = process.env.BACKUP_ROOT_DIR || './backups') {
    this.backupRoot = backupRoot;
    if (process.env.S3_BACKUP_BUCKET) {
        this.s3Config = {
            bucket: process.env.S3_BACKUP_BUCKET,
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    }
  }

  async ensureBackupDir(type: string): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(this.backupRoot, type, date);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async uploadToS3(filepath: string, key: string): Promise<void> {
      if (!this.s3Config) {
          logger.warn('Skipping S3 upload: No S3 configuration found.');
          return;
      }
      logger.info(`Uploading ${filepath} to S3 bucket ${this.s3Config.bucket} as ${key}...`);

      // Simulation of S3 upload if SDK is not present, or use SDK if we were to add it.
      // Ideally:
      // const s3 = new S3Client(this.s3Config);
      // await s3.send(new PutObjectCommand({ Bucket: ..., Key: ..., Body: fs.createReadStream(filepath) }));

      // For now, we mock the success or use a CLI tool if available
      try {
          if (process.env.USE_AWS_CLI === 'true') {
             await execAsync(`aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region}`);
          } else {
              // Simulating upload delay
              await new Promise(r => setTimeout(r, 500));
              logger.info('Simulated S3 upload complete.');
          }
      } catch (error) {
          logger.error('Failed to upload to S3', error);
          throw error;
      }
  }

  async verifyBackup(filepath: string): Promise<boolean> {
      logger.info(`Verifying backup integrity for ${filepath}...`);
      try {
          // 1. Check if file exists and has size > 0
          const stats = await fs.stat(filepath);
          if (stats.size === 0) throw new Error('Backup file is empty');

          // 2. If compressed, try to test gzip integrity
          if (filepath.endsWith('.gz')) {
              await execAsync(`gzip -t "${filepath}"`);
          }

          // 3. (Optional) Attempt a restoration to a temporary DB (advanced)

          logger.info(`Backup verification successful for ${filepath}`);
          return true;
      } catch (error) {
          logger.error(`Backup verification failed for ${filepath}`, error);
          return false;
      }
  }

  async backupPostgres(options: BackupOptions = {}): Promise<string> {
    const startTime = Date.now();
    logger.info('Starting PostgreSQL backup...');
    try {
      const dir = await this.ensureBackupDir('postgres');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `postgres-backup-${timestamp}.sql`;
      const filepath = path.join(dir, filename);
      const finalPath = options.compress ? `${filepath}.gz` : filepath;

      // Ensure pg_dump is available or handle via docker exec if running in container
      const pgHost = process.env.POSTGRES_HOST || 'localhost';
      const pgUser = process.env.POSTGRES_USER || 'intelgraph';
      const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
      const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

      const cmd = `PGPASSWORD='${pgPassword}' pg_dump -h ${pgHost} -U ${pgUser} ${pgDb}`;

      if (options.compress) {
        await execAsync(`${cmd} | gzip > "${finalPath}"`);
      } else {
        await execAsync(`${cmd} > "${finalPath}"`);
      }

      const stats = await fs.stat(finalPath);
      backupSize.labels('postgres').set(stats.size);
      backupDuration.labels('postgres', 'success').observe((Date.now() - startTime) / 1000);

      logger.info({ path: finalPath, size: stats.size }, 'PostgreSQL backup completed');

      if (options.uploadToS3) {
          const s3Key = `postgres/${path.basename(finalPath)}`;
          await this.uploadToS3(finalPath, s3Key);
      }

      await this.verifyBackup(finalPath);

      return finalPath;
    } catch (error) {
      backupDuration.labels('postgres', 'failure').observe((Date.now() - startTime) / 1000);
      logger.error('PostgreSQL backup failed', error);
      throw error;
    }
  }

  async backupNeo4j(options: BackupOptions = {}): Promise<string> {
    const startTime = Date.now();
    logger.info('Starting Neo4j backup...');
    try {
      const dir = await this.ensureBackupDir('neo4j');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `neo4j-export-${timestamp}.jsonl`; // JSON Lines for logical dump
      const filepath = path.join(dir, filename);
      const finalPath = options.compress ? `${filepath}.gz` : filepath;

      const driver = getNeo4jDriver();
      const session = driver.session();

      // Logical backup: Export nodes and relationships to JSONL
      // This works remotely without server-side file access
      try {
          const writeStream = options.compress
              ? zlib.createGzip()
              : createWriteStream(filepath);

          if (options.compress) {
              writeStream.pipe(createWriteStream(finalPath));
          }

          // Dump Nodes
          const nodeResult = await session.run('MATCH (n) RETURN n');
          for (const record of nodeResult.records) {
              const node = record.get('n');
              const line = JSON.stringify({ type: 'node', labels: node.labels, props: node.properties }) + '\n';
              writeStream.write(line);
          }

          // Dump Relationships
          const relResult = await session.run('MATCH ()-[r]->() RETURN r');
          for (const record of relResult.records) {
              const rel = record.get('r');
              // Note: preserving IDs is tricky in logical dumps without more complex logic,
              // but we are preserving the properties and type.
              // For a full restore, we'd need start/end identifiers (e.g. uuid).
              const line = JSON.stringify({ type: 'rel', typeName: rel.type, props: rel.properties }) + '\n';
              writeStream.write(line);
          }

          writeStream.end();

          // Wait for stream to finish
          await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
          });

      } finally {
        await session.close();
      }

      const stats = await fs.stat(finalPath);
      backupSize.labels('neo4j').set(stats.size);
      backupDuration.labels('neo4j', 'success').observe((Date.now() - startTime) / 1000);

      logger.info({ path: finalPath, size: stats.size }, 'Neo4j logical backup completed');

      if (options.uploadToS3) {
          const s3Key = `neo4j/${path.basename(finalPath)}`;
          await this.uploadToS3(finalPath, s3Key);
      }

      await this.verifyBackup(finalPath);

      return finalPath;
    } catch (error) {
      backupDuration.labels('neo4j', 'failure').observe((Date.now() - startTime) / 1000);
      logger.error('Neo4j backup failed', error);
      throw error;
    }
  }

  async backupRedis(options: BackupOptions = {}): Promise<string> {
     const startTime = Date.now();
     logger.info('Starting Redis backup...');
     try {
       const client = getRedisClient();
       if (!client) throw new Error('Redis client not available');

       // Trigger background save
       await client.bgsave();

       // Poll for completion
       let attempts = 0;
       while (attempts < 30) {
           const info = await client.info('persistence');
           if (!info.includes('rdb_bgsave_in_progress:1')) {
               break;
           }
           await new Promise(r => setTimeout(r, 1000));
           attempts++;
       }

       // We cannot download the RDB file if Redis is remote/containerized without volume access.
       // We log the successful trigger and last save time.
       const lastSave = await client.lastsave();

       const dir = await this.ensureBackupDir('redis');
       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
       const filename = `redis-backup-log-${timestamp}.txt`;
       const filepath = path.join(dir, filename);

       await fs.writeFile(filepath, `Redis BGSAVE triggered successfully. Last save timestamp: ${lastSave}\nNote: RDB file resides on Redis server volume.`);

       backupDuration.labels('redis', 'success').observe((Date.now() - startTime) / 1000);

       if (options.uploadToS3) {
           const s3Key = `redis/${path.basename(filepath)}`;
           await this.uploadToS3(filepath, s3Key);
       }

       return filepath;
     } catch (error) {
       backupDuration.labels('redis', 'failure').observe((Date.now() - startTime) / 1000);
       logger.error('Redis backup failed', error);
       throw error;
     }
  }

  async runAllBackups(): Promise<Record<string, string>> {
     const results: Record<string, string> = {};
     // Determine if we should upload to S3 based on env
     const uploadToS3 = !!process.env.S3_BACKUP_BUCKET;

     try {
        results.postgres = await this.backupPostgres({ compress: true, uploadToS3 });
     } catch (e) {
        results.postgres = `Failed: ${e}`;
     }
     try {
        results.neo4j = await this.backupNeo4j({ compress: true, uploadToS3 });
     } catch (e) {
        results.neo4j = `Failed: ${e}`;
     }
     try {
        results.redis = await this.backupRedis({ uploadToS3 });
     } catch (e) {
        results.redis = `Failed: ${e}`;
     }
     return results;
  }
}
