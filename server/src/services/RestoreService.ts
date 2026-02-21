import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getRedisClient } from '../db/redis.js';
import { logger as baseLogger } from '../config/logger.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const logger = baseLogger.child({ service: 'RestoreService' });

export class RestoreService {
  private static instance: RestoreService;
  private s3Client: S3Client | null = null;
  private backupDir: string;
  private s3Bucket: string | undefined;

  private constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    this.s3Bucket = process.env.S3_BACKUP_BUCKET;
    const awsRegion = process.env.AWS_REGION || 'us-east-1';

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && this.s3Bucket) {
        this.s3Client = new S3Client({ region: awsRegion });
    }
  }

  public static getInstance(): RestoreService {
    if (!RestoreService.instance) {
      RestoreService.instance = new RestoreService();
    }
    return RestoreService.instance;
  }

  async restore(backupId: string): Promise<void> {
    logger.info(`Starting restore for backupId: ${backupId}`);

    try {
        const pgFile = await this.ensureArtifact(`postgres_${backupId}.sql`);
        if (pgFile) await this.restorePostgres(pgFile);

        const neo4jFile = await this.ensureArtifact(`neo4j_${backupId}.json`);
        if (neo4jFile) await this.restoreNeo4j(neo4jFile);

        const redisFile = await this.ensureArtifact(`redis_${backupId}.json`);
        if (redisFile) await this.restoreRedis(redisFile);

        logger.info(`Restore completed for ${backupId}`);
    } catch (error) {
        logger.error({ error, backupId }, 'Restore failed');
        throw error;
    }
  }

  private async ensureArtifact(filename: string): Promise<string | null> {
      const localPath = path.join(this.backupDir, filename);
      if (fs.existsSync(localPath)) {
          return localPath;
      }

      if (this.s3Client && this.s3Bucket) {
          try {
              logger.info(`Downloading ${filename} from S3...`);
              const command = new GetObjectCommand({
                  Bucket: this.s3Bucket,
                  Key: `backups/${filename}`
              });
              const response = await this.s3Client.send(command);
              if (response.Body) {
                  const writeStream = fs.createWriteStream(localPath);
                  // @ts-ignore
                  response.Body.pipe(writeStream);
                  await new Promise((resolve, reject) => {
                      writeStream.on('finish', resolve);
                      writeStream.on('error', reject);
                  });
                  return localPath;
              }
          } catch (error) {
              logger.warn({ filename, error: (error as Error).message }, 'Failed to download artifact from S3');
          }
      }

      logger.warn(`Artifact ${filename} not found locally or in S3`);
      return null;
  }

  async restorePostgres(filePath: string): Promise<void> {
    logger.info(`Restoring Postgres from ${filePath}`);
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

    args.push('-f', filePath);

    return new Promise((resolve, reject) => {
        const child = spawn('psql', args, { env });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                logger.info('Postgres restore successful');
                resolve();
            } else {
                reject(new Error(`psql exited with code ${code}`));
            }
        });
    });
  }

  async restoreNeo4j(filePath: string): Promise<void> {
    logger.info(`Restoring Neo4j from ${filePath}`);
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        // Create index on _restore_id for efficient relationship linking
        // Using a temporary label 'RestoredNode' to limit the scope and enable indexing
        await session.run('CREATE INDEX restore_id_idx IF NOT EXISTS FOR (n:RestoredNode) ON (n._restore_id)');

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const nodeBatch: any[] = [];
        const BATCH_SIZE = 1000;

        // Phase 1: Nodes
        for await (const line of rl) {
            try {
                if (!line.trim()) continue;
                const item = JSON.parse(line);
                if (item.type === 'node') {
                    nodeBatch.push(item);
                    if (nodeBatch.length >= BATCH_SIZE) {
                        await this.processNodeBatch(session, nodeBatch);
                        nodeBatch.length = 0;
                    }
                }
            } catch (e) {
                logger.warn({ error: e, line: line.substring(0, 50) }, 'Failed to parse line');
            }
        }
        if (nodeBatch.length > 0) {
            await this.processNodeBatch(session, nodeBatch);
        }

        // Phase 2: Relationships
        // We need to re-read the file
        const fileStream2 = fs.createReadStream(filePath);
        const rl2 = readline.createInterface({
            input: fileStream2,
            crlfDelay: Infinity
        });

        const relBatch: any[] = [];

        for await (const line of rl2) {
             try {
                if (!line.trim()) continue;
                const item = JSON.parse(line);
                if (item.type === 'relationship') {
                    relBatch.push(item);
                    if (relBatch.length >= BATCH_SIZE) {
                        await this.processRelBatch(session, relBatch);
                        relBatch.length = 0;
                    }
                }
            } catch (e) { }
        }
        if (relBatch.length > 0) {
            await this.processRelBatch(session, relBatch);
        }

        // Cleanup
        await session.run('MATCH (n:RestoredNode) REMOVE n._restore_id REMOVE n:RestoredNode');
        await session.run('DROP INDEX restore_id_idx IF EXISTS');

        logger.info('Neo4j restore completed');
    } finally {
        await session.close();
    }
  }

  private async processNodeBatch(session: any, batch: any[]) {
      // Uses APOC for dynamic label creation.
      // If APOC is missing, this will fail. Assuming APOC is present given BackupService implementation.
      await session.run(`
          UNWIND $batch AS data
          CALL apoc.create.node(data.labels + ['RestoredNode'], data.properties) YIELD node
          SET node._restore_id = data.id
      `, { batch });
  }

  private async processRelBatch(session: any, batch: any[]) {
      await session.run(`
          UNWIND $batch AS data
          MATCH (start:RestoredNode { _restore_id: data.start })
          MATCH (end:RestoredNode { _restore_id: data.end })
          CALL apoc.create.relationship(start, data.label, data.properties, end) YIELD rel
          RETURN count(rel)
      `, { batch });
  }

  async restoreRedis(filePath: string): Promise<void> {
      logger.info(`Restoring Redis from ${filePath}`);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
      });

      const client = getRedisClient();
      let pipeline = client.pipeline();
      let count = 0;
      const BATCH_SIZE = 1000;

      for await (const line of rl) {
          try {
              if (!line.trim()) continue;
              const { key, value } = JSON.parse(line);
              if (key !== undefined && value !== undefined) {
                  pipeline.set(key, value);
                  count++;
                  if (count % BATCH_SIZE === 0) {
                      await pipeline.exec();
                      pipeline = client.pipeline();
                  }
              }
          } catch (e) {
              logger.warn({ error: e }, 'Failed to parse Redis backup line');
          }
      }

      if (count % BATCH_SIZE !== 0) {
          await pipeline.exec();
      }
      logger.info(`Restored ${count} keys to Redis`);
  }
}

export const restoreService = RestoreService.getInstance();
