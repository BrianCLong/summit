
import { RedisService } from '../cache/redis.js';
import logger from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createWriteStream } from 'fs';
import zlib from 'zlib';
import { PrometheusMetrics } from '../utils/metrics.js';

const execAsync = promisify(exec);

// Metrics
const backupMetrics = new PrometheusMetrics('backup_service');
backupMetrics.createCounter('ops_total', 'Total backup operations', ['type', 'status']);
backupMetrics.createHistogram('duration_seconds', 'Backup duration', { buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120] });
backupMetrics.createGauge('size_bytes', 'Backup size', ['type']);

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface BackupOptions {
  compress?: boolean;
  uploadToS3?: boolean;
}

export class BackupService {
  private backupRoot: string;
  private s3Config: S3Config | null = null;
  private redis: RedisService;

  constructor(backupRoot: string = process.env.BACKUP_ROOT_DIR || './backups') {
    this.backupRoot = backupRoot;
    this.redis = RedisService.getInstance();

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

      try {
          if (process.env.USE_AWS_CLI === 'true') {
             await execAsync(`aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region}`);
          } else {
              // Simulating upload delay
              await new Promise(r => setTimeout(r, 500));
              logger.info('Simulated S3 upload complete.');
          }
      } catch (error: any) {
          logger.error('Failed to upload to S3', error);
          throw error;
      }
  }

  async verifyBackup(filepath: string): Promise<boolean> {
      logger.info(`Verifying backup integrity for ${filepath}...`);
      try {
          const stats = await fs.stat(filepath);
          if (stats.size === 0) throw new Error('Backup file is empty');

          if (filepath.endsWith('.gz')) {
              await execAsync(`gzip -t "${filepath}"`);
          }

          logger.info(`Backup verification successful for ${filepath}`);
          return true;
      } catch (error: any) {
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

      const pgHost = process.env.POSTGRES_HOST || 'localhost';
      const pgUser = process.env.POSTGRES_USER || 'intelgraph';
      const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
      const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

      const cmd = `pg_dump -h ${pgHost} -U ${pgUser} ${pgDb}`;
      const env = { ...process.env, PGPASSWORD: pgPassword };

      if (options.compress) {
        await execAsync(`${cmd} | gzip > "${finalPath}"`, { env });
      } else {
        await execAsync(`${cmd} > "${finalPath}"`, { env });
      }

      const stats = await fs.stat(finalPath);
      backupMetrics.setGauge('size_bytes', stats.size, { type: 'postgres' });
      backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'postgres', status: 'success' });
      backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'success' });

      logger.info({ path: finalPath, size: stats.size }, 'PostgreSQL backup completed');

      if (options.uploadToS3) {
          const s3Key = `postgres/${path.basename(finalPath)}`;
          await this.uploadToS3(finalPath, s3Key);
      }

      await this.verifyBackup(finalPath);
      await this.recordBackupMeta('postgres', finalPath, stats.size);

      return finalPath;
    } catch (error: any) {
      backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'failure' });
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
      const filename = `neo4j-export-${timestamp}.jsonl`;
      const filepath = path.join(dir, filename);
      const finalPath = options.compress ? `${filepath}.gz` : filepath;

      const driver = getNeo4jDriver();
      const session = driver.session();

      try {
          const fileStream = createWriteStream(finalPath);
          const outputStream = options.compress
              ? zlib.createGzip()
              : null;

          if (outputStream) {
              outputStream.pipe(fileStream as unknown as NodeJS.WritableStream);
          }

          const writeTarget = outputStream || fileStream;

          // Full logical backup (removed LIMIT)
          const nodeResult = await session.run('MATCH (n) RETURN n');
          for (const record of nodeResult.records) {
              const node = record.get('n');
              const line = JSON.stringify({ type: 'node', labels: node.labels, props: node.properties }) + '\n';
              writeTarget.write(line);
          }

          const relResult = await session.run('MATCH ()-[r]->() RETURN r');
          for (const record of relResult.records) {
              const rel = record.get('r');
              const line = JSON.stringify({ type: 'rel', typeName: rel.type, props: rel.properties }) + '\n';
              writeTarget.write(line);
          }

          writeTarget.end();

          await new Promise<void>((resolve, reject) => {
              fileStream.on('finish', () => resolve());
              fileStream.on('error', (err: any) => reject(err));
          });

      } finally {
        await session.close();
      }

      const stats = await fs.stat(finalPath);
      backupMetrics.setGauge('size_bytes', stats.size, { type: 'neo4j' });
      backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'neo4j', status: 'success' });

      logger.info({ path: finalPath, size: stats.size }, 'Neo4j logical backup completed');

      if (options.uploadToS3) {
          const s3Key = `neo4j/${path.basename(finalPath)}`;
          await this.uploadToS3(finalPath, s3Key);
      }

      await this.verifyBackup(finalPath);
      await this.recordBackupMeta('neo4j', finalPath, stats.size);

      return finalPath;
    } catch (error: any) {
      logger.error('Neo4j backup failed', error);
      throw error;
    }
  }

  async backupRedis(options: BackupOptions = {}): Promise<string> {
     const startTime = Date.now();
     logger.info('Starting Redis backup...');
     try {
       const client = this.redis.getClient();
       if (!client) throw new Error('Redis client not available');

       const dir = await this.ensureBackupDir('redis');
       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
       const filename = `redis-logical-backup-${timestamp}.jsonl`;
       const filepath = path.join(dir, filename);
       const finalPath = options.compress ? `${filepath}.gz` : filepath;

       const fileStream = createWriteStream(finalPath);
       const outputStream = options.compress ? zlib.createGzip() : null;
       if (outputStream) outputStream.pipe(fileStream as unknown as NodeJS.WritableStream);
       const writeTarget = outputStream || fileStream;

       let cursor = '0';
       do {
         // Scan keys
         const result = await client.scan(cursor, 'MATCH', '*', 'COUNT', 1000);
         cursor = result[0];
         const keys = result[1];

         if (keys.length > 0) {
             const pipeline = client.pipeline();
             keys.forEach(key => {
                 // Use dumpBuffer to ensure we get a Buffer, preventing UTF-8 corruption of binary data
                 (pipeline as any).dumpBuffer(key);
                 pipeline.pttl(key); // Returns TTL in ms
             });
             const results = await pipeline.exec();

             if (results) {
                 for (let i = 0; i < keys.length; i++) {
                     const [dumpErr, dumpVal] = results[i * 2];
                     const [ttlErr, ttlVal] = results[i * 2 + 1];
                     const key = keys[i];

                     if (!dumpErr && dumpVal) {
                         // Serialize binary dump to base64
                         const dumpBase64 = (dumpVal as Buffer).toString('base64');
                         // RESTORE expects TTL in ms. PTTL returns -1 for no expiry, -2 for not found.
                         // We map -1 (no expiry) to 0 (persist) for RESTORE command.
                         const ttlMs = (ttlVal as number) > 0 ? (ttlVal as number) : 0;

                         const record = JSON.stringify({ k: key, v: dumpBase64, t: ttlMs });
                         writeTarget.write(record + '\n');
                     } else if (dumpErr) {
                         logger.warn(`Failed to dump key ${key}`, dumpErr);
                     }
                 }
             }
         }
       } while (cursor !== '0');

       if (outputStream) outputStream.end();
       else writeTarget.end();

       await new Promise<void>((resolve, reject) => {
           fileStream.on('finish', () => resolve());
           fileStream.on('error', reject);
       });

       const stats = await fs.stat(finalPath);
       backupMetrics.setGauge('size_bytes', stats.size, { type: 'redis' });
       backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'redis', status: 'success' });

       logger.info({ path: finalPath, size: stats.size }, 'Redis logical backup completed');

       if (options.uploadToS3) {
           const s3Key = `redis/${path.basename(finalPath)}`;
           await this.uploadToS3(finalPath, s3Key);
       }

       await this.recordBackupMeta('redis', finalPath, stats.size);
       return finalPath;
     } catch (error: any) {
       logger.error('Redis backup failed', error);
       throw error;
     }
  }

  async restoreRedis(backupFile: string): Promise<void> {
    logger.info(`Restoring Redis from ${backupFile}...`);
    const startTime = Date.now();
    try {
        const client = this.redis.getClient();
        if (!client) throw new Error('Redis client not available');

        await fs.access(backupFile);

        const readline = await import('readline');
        const fsStream = await import('fs');
        const stream = fsStream.createReadStream(backupFile);

        let input: NodeJS.ReadableStream = stream;
        if (backupFile.endsWith('.gz')) {
            const unzip = zlib.createGunzip();
            stream.pipe(unzip);
            input = unzip;
        }

        const rl = readline.createInterface({
            input: input,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                const { k, v, t } = JSON.parse(line);
                if (!k || !v) continue;

                const buffer = Buffer.from(v, 'base64');
                // RESTORE key ttl serialized-value [REPLACE]
                // REPLACE modifier (Redis 3.0+) overwrites existing key.
                await client.restore(k, t, buffer, 'REPLACE');

            } catch (e) {
                logger.warn(`Failed to restore key`, e);
            }
        }

        backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'redis_restore', status: 'success' });
        logger.info('Redis restore completed');

    } catch (error: any) {
         backupMetrics.incrementCounter('ops_total', { type: 'redis_restore', status: 'failure' });
         logger.error('Redis restore failed', error);
         throw error;
    }
  }

  async recordBackupMeta(type: string, filepath: string, size: number): Promise<void> {
      const meta = {
          type,
          filepath,
          size,
          timestamp: new Date().toISOString(),
          host: process.env.HOSTNAME || 'unknown'
      };
      // Store in Redis list for easy retrieval by DR service
      const client = this.redis.getClient();
      if (client) {
          await client.lpush(`backups:${type}:history`, JSON.stringify(meta));
          await client.ltrim(`backups:${type}:history`, 0, 99);
      }
  }

  async runAllBackups(): Promise<Record<string, string>> {
     const results: Record<string, string> = {};
     const uploadToS3 = !!process.env.S3_BACKUP_BUCKET;

     try {
        results.postgres = await this.backupPostgres({ compress: true, uploadToS3 });
     } catch (e: any) {
        results.postgres = `Failed: ${e}`;
     }
     try {
        results.neo4j = await this.backupNeo4j({ compress: true, uploadToS3 });
     } catch (e: any) {
        results.neo4j = `Failed: ${e}`;
     }
     try {
        results.redis = await this.backupRedis({ uploadToS3 });
     } catch (e: any) {
        results.redis = `Failed: ${e}`;
     }
     return results;
  }

  async restorePostgres(backupFile: string, targetDb?: string): Promise<void> {
    logger.info(`Restoring PostgreSQL from ${backupFile}...`);
    const startTime = Date.now();
    try {
        const pgHost = process.env.POSTGRES_HOST || 'localhost';
        const pgUser = process.env.POSTGRES_USER || 'intelgraph';
        const pgDb = targetDb || process.env.POSTGRES_DB || 'intelgraph_dev';
        const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

        // Check if file exists
        await fs.access(backupFile);

        let cmd = `psql -h ${pgHost} -U ${pgUser} -d ${pgDb}`;
        const env = { ...process.env, PGPASSWORD: pgPassword };

        if (backupFile.endsWith('.gz')) {
            cmd = `gunzip -c "${backupFile}" | ${cmd}`;
        } else {
            cmd = `${cmd} < "${backupFile}"`;
        }

        await execAsync(cmd, { env });

        backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'postgres_restore', status: 'success' });
        logger.info(`PostgreSQL restore to ${pgDb} completed successfully.`);

    } catch (error: any) {
        backupMetrics.incrementCounter('ops_total', { type: 'postgres_restore', status: 'failure' });
        logger.error(`PostgreSQL restore failed`, error);
        throw error;
    }
  }
}
