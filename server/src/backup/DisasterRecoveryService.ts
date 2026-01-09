
import { RedisService } from '../cache/redis.js';
import logger from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import zlib from 'zlib';
import readline from 'readline';

export interface BackupMeta {
  type: string;
  filepath: string;
  size: number;
  timestamp: string;
  host: string;
}

export class DisasterRecoveryService {
  private redis: RedisService;
  private backupRoot: string;

  constructor(backupRoot: string = process.env.BACKUP_ROOT_DIR || './backups') {
    this.redis = RedisService.getInstance();
    this.backupRoot = backupRoot;
  }

  /**
   * List available backups for a given type (postgres, neo4j, redis)
   */
  async listBackups(type: 'postgres' | 'neo4j' | 'redis'): Promise<BackupMeta[]> {
    const client = this.redis.getClient();
    if (!client) {
        return this.scanFilesystemBackups(type);
    }
    const history = await client.lrange(`backups:${type}:history`, 0, 49);
    return history.map(item => JSON.parse(item));
  }

  private async scanFilesystemBackups(type: string): Promise<BackupMeta[]> {
      const metas: BackupMeta[] = [];
      try {
          const typeDir = path.join(this.backupRoot, type);
          const dates = await fs.readdir(typeDir);
          for (const date of dates) {
              const dateDir = path.join(typeDir, date);
              if (!(await fs.stat(dateDir)).isDirectory()) continue;

              const files = await fs.readdir(dateDir);
              for (const file of files) {
                  const filepath = path.join(dateDir, file);
                  const stats = await fs.stat(filepath);
                  metas.push({
                      type,
                      filepath,
                      size: stats.size,
                      timestamp: stats.mtime.toISOString(),
                      host: 'local'
                  });
              }
          }
      } catch (err) {
          logger.warn(`Failed to scan filesystem backups for ${type}: ${err}`);
      }
      return metas.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Restore PostgreSQL from a specific backup file
   */
  async restorePostgres(filepath: string): Promise<void> {
    logger.info(`Starting PostgreSQL restore from ${filepath}...`);

    if (!filepath.startsWith(this.backupRoot) && !filepath.includes('/tmp/')) {
        throw new Error('Security Error: Cannot restore from outside backup directory');
    }

    const stats = await fs.stat(filepath);
    if (stats.size === 0) throw new Error('Backup file is empty');

    const pgHost = process.env.POSTGRES_HOST;
    const pgUser = process.env.POSTGRES_USER;
    const pgDb = process.env.POSTGRES_DB;
    const pgPassword = process.env.POSTGRES_PASSWORD;

    if (!pgHost || !pgUser || !pgDb || !pgPassword) {
        throw new Error('Missing required PostgreSQL environment variables for restore');
    }

    const env = { ...process.env, PGPASSWORD: pgPassword };
    const args = ['-h', pgHost, '-U', pgUser, '-d', pgDb];

    let input: any;
    if (filepath.endsWith('.gz')) {
        const gunzip = zlib.createGunzip();
        const fileStream = createReadStream(filepath);
        input = fileStream.pipe(gunzip);
    } else {
        input = createReadStream(filepath);
    }

    return new Promise((resolve, reject) => {
        logger.warn('⚠️ Executing Database Restore. This will overwrite existing data.');

        const child = spawn('psql', args, { env, stdio: ['pipe', 'inherit', 'inherit'] });

        input.pipe(child.stdin);

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                logger.info('PostgreSQL restore completed successfully.');
                resolve();
            } else {
                reject(new Error(`psql exited with code ${code}`));
            }
        });
    });
  }

  /**
   * Restore Neo4j from a logical export (JSONL)
   */
  async restoreNeo4j(filepath: string): Promise<void> {
      logger.info(`Starting Neo4j restore from ${filepath}...`);

      const driver = getNeo4jDriver();
      const session = driver.session();

      try {
          const fileStream = createReadStream(filepath);
          const rl = readline.createInterface({
              input: filepath.endsWith('.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream,
              crlfDelay: Infinity
          });

          let nodeBatch: any[] = [];
          let relBatch: any[] = [];
          const BATCH_SIZE = 1000;

          for await (const line of rl) {
              if (!line.trim()) continue;
              const item = JSON.parse(line);

              if (item.type === 'node') {
                  nodeBatch.push(item);
                  if (nodeBatch.length >= BATCH_SIZE) {
                      await this.processNodeBatch(session, nodeBatch);
                      nodeBatch = [];
                  }
              } else if (item.type === 'rel') {
                  relBatch.push(item);
                  if (relBatch.length >= BATCH_SIZE) {
                      await this.processRelBatch(session, relBatch);
                      relBatch = [];
                  }
              }
          }
          if (nodeBatch.length > 0) await this.processNodeBatch(session, nodeBatch);
          if (relBatch.length > 0) await this.processRelBatch(session, relBatch);

          logger.info('Neo4j restore completed.');
      } finally {
          await session.close();
      }
  }

  private async processNodeBatch(session: any, batch: any[]) {
      const query = `
      UNWIND $batch as item
      CALL apoc.create.node(item.labels, item.props) YIELD node
      RETURN count(node)
      `;
      try {
          await session.run(query, { batch });
      } catch (e) {
          // Fallback if APOC is missing
          for (const item of batch) {
               const labels = item.labels.map((l: string) => `\`${l}\``).join(':');
               await session.run(`CREATE (n:${labels}) SET n = $props`, { props: item.props });
          }
      }
  }

  private async processRelBatch(session: any, batch: any[]) {
      const query = `
      UNWIND $batch as item
      MATCH (a {id: item.startId}), (b {id: item.endId})
      CALL apoc.create.relationship(a, item.typeName, item.props, b) YIELD rel
      RETURN count(rel)
      `;

      try {
          await session.run(query, { batch });
      } catch (e) {
           // Fallback if APOC is missing
           for (const item of batch) {
               if (item.startId && item.endId) {
                   await session.run(
                       `MATCH (a {id: $startId}), (b {id: $endId})
                        CREATE (a)-[r:${item.typeName}]->(b)
                        SET r = $props`,
                       { startId: item.startId, endId: item.endId, props: item.props }
                   );
               }
           }
      }
  }
}
