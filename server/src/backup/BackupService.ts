// @ts-nocheck
import { exec, spawn } from 'child_process';
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
import { getRedisClient } from '../db/redis.js';

const execAsync = promisify(exec);

interface S3Config {
    bucket: string;
    region: string;
    endpoint?: string;
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

      try {
          if (process.env.USE_AWS_CLI === 'true') {
             await execAsync(`aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region}`);
          } else {
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
          const stats = await fs.stat(filepath);
          if (stats.size === 0) throw new Error('Backup file is empty');

          if (filepath.endsWith('.gz')) {
              await execAsync(`gzip -t "${filepath}"`);
          }

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

  async restorePostgres(backupPath: string): Promise<void> {
    logger.info(`Starting PostgreSQL restore from ${backupPath}...`);
    try {
        const pgHost = process.env.POSTGRES_HOST || 'localhost';
        const pgUser = process.env.POSTGRES_USER || 'intelgraph';
        const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
        const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

        // Check if file exists
        await fs.access(backupPath);

        // Security check: ensure backupPath is not obviously malicious (basic check)
        // Ideally we use spawn to avoid shell, but we need piping.
        // We will use spawn with stdio piping.

        const psqlEnv = { ...process.env, PGPASSWORD: pgPassword };
        const psqlArgs = ['-h', pgHost, '-U', pgUser, pgDb];

        let inputStream;
        if (backupPath.endsWith('.gz')) {
            const fileStream = createReadStream(backupPath);
            const gunzip = zlib.createGunzip();
            inputStream = fileStream.pipe(gunzip);
        } else {
            inputStream = createReadStream(backupPath);
        }

        const psql = spawn('psql', psqlArgs, { env: psqlEnv, stdio: ['pipe', 'inherit', 'inherit'] });

        inputStream.pipe(psql.stdin);

        await new Promise((resolve, reject) => {
            psql.on('close', (code) => {
                if (code === 0) resolve(code);
                else reject(new Error(`psql exited with code ${code}`));
            });
            psql.on('error', reject);
            inputStream.on('error', reject);
        });

        logger.info('PostgreSQL restore completed successfully.');
    } catch (error) {
        logger.error('PostgreSQL restore failed', error);
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
          const writeStream = options.compress
              ? zlib.createGzip()
              : createWriteStream(filepath);

          if (options.compress) {
              writeStream.pipe(createWriteStream(finalPath));
          }

          const nodeResult = await session.run('MATCH (n) RETURN n');
          for (const record of nodeResult.records) {
              const node = record.get('n');
              const line = JSON.stringify({ type: 'node', labels: node.labels, props: node.properties }) + '\n';
              writeStream.write(line);
          }

          // Fetch relationships with start and end node IDs (assuming nodes have 'id' property)
          // We also return internal node IDs just in case, though they are unstable across restarts,
          // they are stable within a session for mapping.
          // BUT, for a logical backup, we MUST rely on application-level IDs.
          // We assume every node has an 'id' property.
          const relResult = await session.run(`
            MATCH (a)-[r]->(b)
            RETURN r, a.id as startNodeId, b.id as endNodeId
          `);

          for (const record of relResult.records) {
              const rel = record.get('r');
              const startNodeId = record.get('startNodeId');
              const endNodeId = record.get('endNodeId');

              if (startNodeId && endNodeId) {
                const line = JSON.stringify({
                    type: 'rel',
                    typeName: rel.type,
                    props: rel.properties,
                    startNodeId,
                    endNodeId
                }) + '\n';
                writeStream.write(line);
              } else {
                  logger.warn(`Skipping relationship ${rel.identity} because start/end node missing 'id' property`);
              }
          }

          writeStream.end();

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

  async restoreNeo4j(backupPath: string): Promise<void> {
      logger.info(`Starting Neo4j restore from ${backupPath}...`);
      try {
          await fs.access(backupPath);
          const driver = getNeo4jDriver();
          const session = driver.session();

          const fileStream = createReadStream(backupPath);
          const rl = require('readline').createInterface({
            input: backupPath.endsWith('.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream,
            crlfDelay: Infinity
          });

          let nodesCount = 0;
          let relsCount = 0;
          const relationships = [];

          try {
             for await (const line of rl) {
                 const data = JSON.parse(line);
                 if (data.type === 'node') {
                     const labels = data.labels.map((l: string) => `\`${l}\``).join(':');
                     await session.run(`MERGE (n:${labels} {id: $props.id}) SET n += $props`, { props: data.props });
                     nodesCount++;
                 } else if (data.type === 'rel') {
                     relationships.push(data);
                 }
             }

             // Restore relationships in a second pass (or after collecting them)
             for (const rel of relationships) {
                 // Construct Cypher for relationship
                 // MATCH (a {id: $start}), (b {id: $end}) MERGE (a)-[r:TYPE]->(b) SET r += $props
                 const query = `
                    MATCH (a {id: $startId}), (b {id: $endId})
                    MERGE (a)-[r:\`${rel.typeName}\`]->(b)
                    SET r += $props
                 `;
                 await session.run(query, {
                     startId: rel.startNodeId,
                     endId: rel.endNodeId,
                     props: rel.props
                 });
                 relsCount++;
             }

          } finally {
              await session.close();
          }

          logger.info(`Neo4j restore completed. Restored ${nodesCount} nodes and ${relsCount} relationships.`);
      } catch (error) {
          logger.error('Neo4j restore failed', error);
          throw error;
      }
  }

  async backupRedis(options: BackupOptions = {}): Promise<string> {
     const startTime = Date.now();
     logger.info('Starting Redis backup...');
     try {
       const client = getRedisClient();
       if (!client) throw new Error('Redis client not available');

       await client.bgsave();

       let attempts = 0;
       while (attempts < 30) {
           const info = await client.info('persistence');
           if (!info.includes('rdb_bgsave_in_progress:1')) {
               break;
           }
           await new Promise(r => setTimeout(r, 1000));
           attempts++;
       }

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
