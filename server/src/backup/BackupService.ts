
import { RedisService } from '../cache/redis.js';
import logger from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import zlib from 'zlib';
import { PrometheusMetrics } from '../utils/metrics.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  private s3Client: S3Client | null = null;
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

        this.s3Client = new S3Client({
            region: this.s3Config.region,
            endpoint: this.s3Config.endpoint,
            credentials: {
                accessKeyId: this.s3Config.accessKeyId || '',
                secretAccessKey: this.s3Config.secretAccessKey || ''
            },
            forcePathStyle: true
        });
    }
  }

  async ensureBackupDir(type: string): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(this.backupRoot, type, date);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async uploadToS3(filepath: string, key: string): Promise<void> {
      if (!this.s3Client || !this.s3Config) {
          logger.warn('Skipping S3 upload: No S3 configuration found.');
          return;
      }
      logger.info(`Uploading ${filepath} to S3 bucket ${this.s3Config.bucket} as ${key}...`);

      try {
          const fileStream = createReadStream(filepath);
          const command = new PutObjectCommand({
              Bucket: this.s3Config.bucket,
              Key: key,
              Body: fileStream,
          });

          await this.s3Client.send(command);
          logger.info('S3 upload complete.');
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
    logger.info('Starting Neo4j backup (streaming)...');
    try {
      const dir = await this.ensureBackupDir('neo4j');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `neo4j-export-${timestamp}.jsonl`;
      const filepath = path.join(dir, filename);
      const finalPath = options.compress ? `${filepath}.gz` : filepath;

      const driver = getNeo4jDriver();
      const session = driver.session();

      const fileStream = createWriteStream(finalPath);
      const outputStream = options.compress ? zlib.createGzip() : null;

      if (outputStream) {
          outputStream.pipe(fileStream);
      }
      const writeTarget = outputStream || fileStream;

      try {
          // Stream nodes
          const nodeResult = session.run('MATCH (n) RETURN n');
          for await (const record of nodeResult) {
               const node = record.get('n');
               const line = JSON.stringify({ type: 'node', labels: node.labels, props: node.properties }) + '\n';
               if (!writeTarget.write(line)) {
                   await new Promise(resolve => writeTarget.once('drain', resolve));
               }
          }

          // Stream relationships
          const relResult = session.run('MATCH (a)-[r]->(b) RETURN r, a.id as startId, b.id as endId');
          for await (const record of relResult) {
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
               if (!writeTarget.write(line)) {
                   await new Promise(resolve => writeTarget.once('drain', resolve));
               }
          }

          if (outputStream) outputStream.end();
          else writeTarget.end();

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

      logger.info({ path: finalPath, size: stats.size }, 'Neo4j backup completed');

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
     logger.info('Starting Redis logical backup...');
     try {
       const client = this.redis.getClient();
       if (!client) throw new Error('Redis client not available');

       const dir = await this.ensureBackupDir('redis');
       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
       const filename = `redis-logical-${timestamp}.jsonl`;
       const filepath = path.join(dir, filename);
       const finalPath = options.compress ? `${filepath}.gz` : filepath;

       const fileStream = createWriteStream(finalPath);
       const outputStream = options.compress ? zlib.createGzip() : null;
       if (outputStream) outputStream.pipe(fileStream);
       const writeTarget = outputStream || fileStream;

       // Check if cluster
       const isCluster = (client as any).constructor.name === 'Cluster';

       const scanAndWrite = async (redisNode: any) => {
            const streamScan = redisNode.scanStream({ match: '*', count: 100 });
            for await (const keys of streamScan) {
                for (const key of keys) {
                    try {
                        const type = await redisNode.type(key);
                        const ttl = await redisNode.ttl(key);
                        // DUMP returns a Buffer containing the Redis RDB encoded value
                        const dump = await (redisNode as any).dump(key);

                        if (dump) {
                            const record = {
                                k: key,
                                t: type,
                                e: ttl,
                                v: dump.toString('base64')
                            };
                            if (!writeTarget.write(JSON.stringify(record) + '\n')) {
                                await new Promise(resolve => writeTarget.once('drain', resolve));
                            }
                        }
                    } catch (e) {
                        logger.warn({ key, error: e }, 'Failed to dump key');
                    }
                }
            }
       };

       if (isCluster) {
           const nodes = (client as any).nodes ? (client as any).nodes('master') : [];
           logger.info(`Scanning ${nodes.length} master nodes in Redis Cluster...`);
           for (const node of nodes) {
               await scanAndWrite(node);
           }
       } else {
           logger.info('Scanning standalone Redis...');
           await scanAndWrite(client);
       }

       if (outputStream) outputStream.end();
       else writeTarget.end();

       await new Promise<void>((resolve, reject) => {
           fileStream.on('finish', () => resolve());
           fileStream.on('error', (err: any) => reject(err));
       });

       const stats = await fs.stat(finalPath);
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
          // Use lpush via client (ioredis supports it)
          await (client as any).lpush(`backups:${type}:history`, JSON.stringify(meta));
          await (client as any).ltrim(`backups:${type}:history`, 0, 99);
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
        results.redis = await this.backupRedis({ compress: true, uploadToS3 });
     } catch (e: any) {
        results.redis = `Failed: ${e}`;
     }
     return results;
  }
}
