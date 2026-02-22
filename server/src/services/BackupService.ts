import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getRedisClient } from '../db/redis.js';
import pino from 'pino';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import zlib from 'zlib';
import { createWriteStream, createReadStream } from 'fs';
import { PrometheusMetrics } from '../utils/metrics.js';

const logger = (pino as any)({ name: 'BackupService' });

// Initialize Metrics
const backupMetrics = new PrometheusMetrics('backup_service');
backupMetrics.createCounter('ops_total', 'Total backup operations', ['type', 'status']);
backupMetrics.createHistogram('duration_seconds', 'Backup duration', { buckets: [0.1, 1, 10, 60, 300, 600] });
backupMetrics.createGauge('size_bytes', 'Backup size', ['type']);

export class BackupService {
  private static instance: BackupService;
  private s3Client: S3Client | null = null;
  private backupDir: string;
  private s3Bucket: string | undefined;
  private retentionDays: number;
  private awsRegion: string;

  private constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    this.s3Bucket = process.env.S3_BACKUP_BUCKET;
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && this.s3Bucket) {
      this.s3Client = new S3Client({ region: this.awsRegion });
      logger.info('S3 Backup configured');
    } else {
      logger.warn('S3 Backup not configured (missing credentials or bucket)');
    }
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  async performFullBackup(): Promise<{
    postgres: boolean;
    neo4j: boolean;
    redis: boolean;
    timestamp: string;
    s3Uploads: string[];
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    logger.info(`Starting full backup for ${timestamp}`);
    const startTime = Date.now();

    const results = {
      postgres: false,
      neo4j: false,
      redis: false,
      timestamp,
      s3Uploads: [] as string[],
    };

    const files: string[] = [];

    // Postgres
    try {
      const pgFile = await this.backupPostgres(timestamp);
      results.postgres = true;
      files.push(pgFile);
      const stats = fs.statSync(pgFile);
      backupMetrics.setGauge('size_bytes', stats.size, { type: 'postgres' });
      backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'success' });
    } catch (error: any) {
      logger.error('PostgreSQL backup failed', error);
      backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'failure' });
    }

    // Neo4j
    try {
      const neo4jFile = await this.backupNeo4j(timestamp);
      results.neo4j = true;
      files.push(neo4jFile);
      const stats = fs.statSync(neo4jFile);
      backupMetrics.setGauge('size_bytes', stats.size, { type: 'neo4j' });
      backupMetrics.incrementCounter('ops_total', { type: 'neo4j', status: 'success' });
    } catch (error: any) {
      logger.error('Neo4j backup failed', error);
      backupMetrics.incrementCounter('ops_total', { type: 'neo4j', status: 'failure' });
    }

    // Redis
    try {
      const redisFile = await this.backupRedis(timestamp);
      results.redis = true;
      files.push(redisFile);
      const stats = fs.statSync(redisFile);
      backupMetrics.setGauge('size_bytes', stats.size, { type: 'redis' });
      backupMetrics.incrementCounter('ops_total', { type: 'redis', status: 'success' });
    } catch (error: any) {
      logger.error('Redis backup failed', error);
      backupMetrics.incrementCounter('ops_total', { type: 'redis', status: 'failure' });
    }

    // Upload to S3
    if (this.s3Client && this.s3Bucket) {
      for (const file of files) {
        try {
          const s3Key = await this.uploadToS3(file);
          results.s3Uploads.push(s3Key);
        } catch (error: any) {
          logger.error({ file, error }, 'Failed to upload backup to S3');
        }
      }
    }

    // Cleanup Old Backups
    await this.cleanupOldBackups();

    const duration = (Date.now() - startTime) / 1000;
    backupMetrics.observeHistogram('duration_seconds', duration);

    logger.info({ results, duration }, 'Full backup completed');
    return results;
  }

  private async backupPostgres(timestamp: string): Promise<string> {
    const fileName = `postgres_${timestamp}.sql.gz`;
    const file = path.join(this.backupDir, fileName);
    const writeStream = createWriteStream(file);
    const gzip = zlib.createGzip();

    gzip.pipe(writeStream);

    const env = { ...process.env };
    const args: string[] = [];

    if (env.DATABASE_URL) {
      args.push(env.DATABASE_URL);
    } else {
      if (env.POSTGRES_HOST) args.push('-h', env.POSTGRES_HOST);
      if (env.POSTGRES_PORT) args.push('-p', env.POSTGRES_PORT);
      if (env.POSTGRES_USER) args.push('-U', env.POSTGRES_USER);
      if (env.POSTGRES_DB) args.push(env.POSTGRES_DB);
      if (!env.PGPASSWORD && env.POSTGRES_PASSWORD) {
        env.PGPASSWORD = env.POSTGRES_PASSWORD;
      }
    }

    return new Promise((resolve, reject) => {
      const child = spawn('pg_dump', args, { env });

      child.stdout.pipe(gzip);

      child.stderr.on('data', (data) => {
        logger.debug(`pg_dump stderr: ${data}`);
      });

      child.on('error', (err: any) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`PostgreSQL backup created at ${file}`);
          resolve(file);
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
    });
  }

  private async backupNeo4j(timestamp: string): Promise<string> {
    const fileName = `neo4j_${timestamp}.json.gz`;
    const file = path.join(this.backupDir, fileName);
    const driver = getNeo4jDriver();
    const session = driver.session();

    const writeStream = createWriteStream(file);
    const gzip = zlib.createGzip();
    gzip.pipe(writeStream);

    try {
      let apocSuccess = false;
      try {
        await new Promise<void>((resolve, reject) => {
          session.run(`
            CALL apoc.export.json.all(null, {stream: true})
            YIELD data
            RETURN data
          `).subscribe({
            onNext: (record: any) => {
              apocSuccess = true;
              const chunk = record.get('data');
              if (chunk) gzip.write(chunk);
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });
        logger.info(`Neo4j backup (APOC) created at ${file}`);
      } catch (err: any) {
        logger.warn('APOC export failed, falling back to manual stream', err);
        apocSuccess = false;
      }

      if (!apocSuccess) {
        gzip.write('{"nodes":[');
        let isFirstNode = true;

        await new Promise<void>((resolve, reject) => {
          session.run('MATCH (n) RETURN n').subscribe({
            onNext: (record: any) => {
              const props = record.get('n').properties;
              if (!isFirstNode) gzip.write(',');
              gzip.write(JSON.stringify(props));
              isFirstNode = false;
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        gzip.write('],"relationships":[');
        let isFirstRel = true;

        await new Promise<void>((resolve, reject) => {
          session.run('MATCH ()-[r]->() RETURN r').subscribe({
            onNext: (record: any) => {
              const r = record.get('r');
              const rel = {
                type: r.type,
                properties: r.properties,
                start: r.startNodeElementId,
                end: r.endNodeElementId
              };
              if (!isFirstRel) gzip.write(',');
              gzip.write(JSON.stringify(rel));
              isFirstRel = false;
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        gzip.write(']}');
        logger.info(`Neo4j manual backup created at ${file}`);
      }

      // Finish gzip stream
      gzip.end();

      return new Promise((resolve, reject) => {
          writeStream.on('finish', () => resolve(file));
          writeStream.on('error', reject);
      });

    } finally {
      await session.close();
    }
  }

  private async backupRedis(timestamp: string): Promise<string> {
    const fileName = `redis_${timestamp}.json.gz`;
    const file = path.join(this.backupDir, fileName);
    const client = getRedisClient();
    if (!client) throw new Error('Redis client unavailable');

    try {
      // Trigger background save on server for persistence
      await client.bgsave().catch(() => {}); // Ignore if already in progress
    } catch (err) { }

    const writeStream = createWriteStream(file);
    const gzip = zlib.createGzip();
    gzip.pipe(writeStream);

    gzip.write('{');
    let isFirstKey = true;

    const stream = client.scanStream({ match: '*', count: 100 });

    for await (const keys of stream) {
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((key: string) => pipeline.get(key));
        const values = await pipeline.exec();

        keys.forEach((key: string, index: number) => {
          const val = values?.[index]?.[1];
          if (typeof val === 'string') {
            if (!isFirstKey) gzip.write(',');
            gzip.write(`"${key}":${JSON.stringify(val)}`);
            isFirstKey = false;
          }
        });
      }
    }

    gzip.write('}');
    gzip.end();

    logger.info(`Redis backup created at ${file}`);
    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(file));
        writeStream.on('error', reject);
    });
  }

  async uploadToS3(filePath: string): Promise<string> {
    if (!this.s3Client || !this.s3Bucket) {
      throw new Error('S3 not configured');
    }

    const fileName = path.basename(filePath);
    const fileStream = createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: `backups/${fileName}`,
      Body: fileStream,
    });

    await this.s3Client.send(command);
    logger.info(`Uploaded ${fileName} to S3 bucket ${this.s3Bucket}`);
    return `s3://${this.s3Bucket}/backups/${fileName}`;
  }

  async cleanupOldBackups(): Promise<void> {
    const now = Date.now();
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

    // 1. Local Cleanup
    try {
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > retentionMs) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted local backup: ${file}`);
        }
      }
    } catch (error: any) {
      logger.error('Error cleaning up local backups', error);
    }

    // 2. S3 Cleanup
    if (this.s3Client && this.s3Bucket) {
      try {
        const listCommand = new ListObjectsV2Command({
          Bucket: this.s3Bucket,
          Prefix: 'backups/',
        });
        const objects = await this.s3Client.send(listCommand);

        const objectsToDelete: { Key: string }[] = [];

        if (objects.Contents) {
          for (const obj of objects.Contents) {
            if (obj.LastModified && obj.Key) {
              if (now - obj.LastModified.getTime() > retentionMs) {
                objectsToDelete.push({ Key: obj.Key });
              }
            }
          }
        }

        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.s3Bucket,
            Delete: { Objects: objectsToDelete },
          });
          await this.s3Client.send(deleteCommand);
          logger.info(`Deleted ${objectsToDelete.length} old backups from S3`);
        }
      } catch (error: any) {
        logger.error('Error cleaning up S3 backups', error);
      }
    }
  }

  async restore(backupId: string): Promise<void> {
    logger.warn(`Restore functionality requested for ${backupId} but not fully implemented. Manual intervention required.`);
  }
}
