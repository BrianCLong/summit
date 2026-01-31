
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

      const cmd = `PGPASSWORD='${pgPassword}' pg_dump -h ${pgHost} -U ${pgUser} ${pgDb}`;

      let attempt = 0;
      const maxRetries = 3;
      while (attempt < maxRetries) {
          try {
              if (options.compress) {
                await execAsync(`${cmd} | gzip > "${finalPath}"`);
              } else {
                await execAsync(`${cmd} > "${finalPath}"`);
              }
              break;
          } catch (e) {
              attempt++;
              if (attempt >= maxRetries) throw e;
              logger.warn({ error: e }, `Postgres backup attempt ${attempt} failed, retrying in 2s...`);
              await new Promise(r => setTimeout(r, 2000));
          }
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

          const relResult = await session.run('MATCH (a)-[r]->(b) RETURN r, a.id as startId, b.id as endId');
          for (const record of relResult.records) {
              const rel = record.get('r');
              const startId = record.get('startId');
              const endId = record.get('endId');
              const line = JSON.stringify({
                  type: 'rel',
                  typeName: rel.type,
                  props: rel.properties,
                  startId,
                  endId
              }) + '\n';
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

       // Check if cluster or standalone
       const isCluster = (client as any).constructor.name === 'Cluster';

       if (isCluster) {
          // @ts-ignore
          const nodes = client.nodes ? client.nodes('master') : [];
          if (nodes.length > 0) {
              logger.info(`Triggering BGSAVE on ${nodes.length} master nodes...`);
              await Promise.all(nodes.map((node: any) => node.bgsave().catch((e: any) =>
                  logger.warn(`Failed to trigger BGSAVE on node ${node.options.host}: ${e.message}`)
              )));
          } else {
              logger.warn('No master nodes found in cluster for backup.');
          }
       } else {
           // @ts-ignore
           await client.bgsave();
       }

       const dir = await this.ensureBackupDir('redis');
       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
       const filename = `redis-backup-log-${timestamp}.txt`;
       const filepath = path.join(dir, filename);

       await fs.writeFile(filepath, `Redis BGSAVE triggered successfully. Last save timestamp: ${new Date().toISOString()}`);

       backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'redis', status: 'success' });

       if (options.uploadToS3) {
           const s3Key = `redis/${path.basename(filepath)}`;
           await this.uploadToS3(filepath, s3Key);
       }

       await this.recordBackupMeta('redis', filepath, 0);

       return filepath;
     } catch (error: any) {
       logger.error('Redis backup failed', error);
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
}
