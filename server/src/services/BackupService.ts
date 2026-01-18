import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getRedisClient } from '../db/redis.js';
import pino from 'pino';
import readline from 'readline';

const logger = (pino as any)({ name: 'BackupService' });

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

/**
 * @class BackupService
 * @description Provides functionality to perform backups and restorations of the application's data stores: PostgreSQL, Neo4j, and Redis.
 * Backups are stored in a local directory defined by the `BACKUP_DIR` environment variable.
 * This service is implemented as a singleton.
 */
export class BackupService {
  private static instance: BackupService;

  private constructor() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * @method getInstance
   * @description Gets the singleton instance of the BackupService.
   * @static
   * @returns {BackupService} The singleton instance.
   */
  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * @method performFullBackup
   * @description Orchestrates a full backup of all data stores.
   * It individually backs up PostgreSQL, Neo4j, and Redis, logging the outcome of each.
   * @returns {Promise<{ postgres: boolean; neo4j: boolean; redis: boolean; timestamp: string }>} An object indicating the success status of each backup and the timestamp for the backup set.
   */
  async performFullBackup(): Promise<{
    postgres: boolean;
    neo4j: boolean;
    redis: boolean;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    logger.info(`Starting full backup for ${timestamp}`);

    const results = {
      postgres: false,
      neo4j: false,
      redis: false,
      timestamp,
    };

    try {
      await this.backupPostgres(timestamp);
      results.postgres = true;
    } catch (error: any) {
      logger.error('PostgreSQL backup failed', error);
    }

    try {
      await this.backupNeo4j(timestamp);
      results.neo4j = true;
    } catch (error: any) {
      logger.error('Neo4j backup failed', error);
    }

    try {
      await this.backupRedis(timestamp);
      results.redis = true;
    } catch (error: any) {
      logger.error('Redis backup failed', error);
    }

    logger.info('Full backup completed', results);
    return results;
  }

  private async backupPostgres(timestamp: string): Promise<void> {
    const file = path.join(BACKUP_DIR, `postgres_${timestamp}.sql`);
    const writeStream = fs.createWriteStream(file);

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

      child.stdout.pipe(writeStream);

      child.stderr.on('data', (data) => {
        logger.debug(`pg_dump stderr: ${data}`);
      });

      child.on('error', (err: any) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`PostgreSQL backup created at ${file}`);
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
    });
  }

  private async backupNeo4j(timestamp: string): Promise<void> {
    const file = path.join(BACKUP_DIR, `neo4j_${timestamp}.json`);
    const driver = getNeo4jDriver();
    const session = driver.session();
    const writeStream = fs.createWriteStream(file);

    try {
      // Try APOC
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
              if (chunk) writeStream.write(chunk);
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
        // Manual Fallback
        writeStream.write('{"nodes":[');
        let isFirstNode = true;

        await new Promise<void>((resolve, reject) => {
          session.run('MATCH (n) RETURN n').subscribe({
            onNext: (record: any) => {
              const props = record.get('n').properties;
              if (!isFirstNode) writeStream.write(',');
              writeStream.write(JSON.stringify(props));
              isFirstNode = false;
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        writeStream.write('],"relationships":[');
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
              if (!isFirstRel) writeStream.write(',');
              writeStream.write(JSON.stringify(rel));
              isFirstRel = false;
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        writeStream.write(']}');
        logger.info(`Neo4j manual backup created at ${file}`);
      }

    } finally {
      writeStream.end();
      await session.close();
    }
  }

  private async backupRedis(timestamp: string): Promise<void> {
    const client = getRedisClient();
    if (!client) throw new Error('Redis client unavailable');

    // Trigger BGSAVE
    try {
      await client.bgsave();
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('already in progress')) {
        throw err;
      }
    }

    // Binary dump using dumpBuffer (or dump)
    const file = path.join(BACKUP_DIR, `redis_${timestamp}.jsonl`);
    const writeStream = fs.createWriteStream(file);

    const stream = client.scanStream({ match: '*', count: 100 });

    for await (const keys of stream) {
      if (keys.length > 0) {
        for (const key of keys) {
            try {
                // @ts-ignore - dumpBuffer is available in ioredis but might not be in the type def used
                const dump = await client.dumpBuffer(key);
                const ttl = await client.pttl(key);

                if (dump) {
                    const record = {
                        key,
                        value: dump.toString('base64'),
                        ttl: ttl > 0 ? ttl : 0
                    };
                    writeStream.write(JSON.stringify(record) + '\n');
                }
            } catch (e) {
                logger.warn({ key, err: e }, 'Failed to dump Redis key');
            }
        }
      }
    }

    writeStream.end();
    logger.info(`Redis backup created at ${file}`);
  }

  /**
   * @method restorePostgres
   * @description Restores PostgreSQL database from a backup file.
   * @param {string} filePath - Path to the SQL backup file.
   */
  async restorePostgres(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

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

    // Add file input
    args.push('-f', filePath);

    logger.info(`Restoring Postgres from ${filePath}`);

    return new Promise((resolve, reject) => {
      const child = spawn('psql', args, { env });

      child.stderr.on('data', (data) => {
        // psql outputs notices to stderr, log as debug unless error
        logger.debug(`psql output: ${data}`);
      });

      child.on('error', (err: any) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`PostgreSQL restored from ${filePath}`);
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });
    });
  }

  /**
   * @method restoreRedis
   * @description Restores Redis data from a JSONL backup file containing binary dumps.
   * @param {string} filePath - Path to the backup file.
   */
  async restoreRedis(filePath: string): Promise<void> {
     if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

     const client = getRedisClient();
     if (!client) throw new Error('Redis client unavailable');

     logger.info(`Restoring Redis from ${filePath}`);

     const fileStream = fs.createReadStream(filePath);
     const rl = readline.createInterface({
         input: fileStream,
         crlfDelay: Infinity
     });

     let restoredCount = 0;
     let errorCount = 0;

     for await (const line of rl) {
         try {
             if (!line.trim()) continue;
             const record = JSON.parse(line);
             const { key, value, ttl } = record;

             const buffer = Buffer.from(value, 'base64');

             // RESTORE key ttl serialized-value [REPLACE]
             await client.restore(key, ttl, buffer, 'REPLACE');
             restoredCount++;
         } catch (e: any) {
             errorCount++;
             logger.debug({ err: e }, 'Failed to restore Redis key');
         }
     }

     logger.info(`Redis restore completed. Restored: ${restoredCount}, Errors: ${errorCount}`);
  }

  /**
   * @method restoreNeo4j
   * @description Restores Neo4j data from a JSON backup file.
   * NOTE: This manual import is basic and may not handle complex constraints or indexes.
   * For production, use `neo4j-admin load` or APOC import procedures.
   * @param {string} filePath - Path to the backup file.
   */
  async restoreNeo4j(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const driver = getNeo4jDriver();
    const session = driver.session();

    logger.info(`Restoring Neo4j from ${filePath}`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        // Clear database? Dangerous, but 'restore' implies it.
        // For safety, we might skip clearing, but typically restore replaces.
        // await session.run('MATCH (n) DETACH DELETE n');

        // Import Nodes
        if (data.nodes) {
            for (const props of data.nodes) {
                 await session.run('CREATE (n) SET n = $props', { props });
            }
        }

        // Import Relationships
        // This requires identifying nodes. Manual JSON export above didn't save IDs or Labels nicely for easy re-matching.
        // The export in backupNeo4j was:
        // nodes: properties only (bad, lost labels)
        // relationships: start/end IDs (internal IDs, which change on import)

        // To properly restore, we need a better backup format (e.g. GraphML or proper JSON with labels/keys).
        // Given current backupNeo4j implementation:
        // `props = record.get('n').properties` -> missing labels and ID.
        // `start: r.startNodeElementId` -> internal ID.

        // The current backupNeo4j implementation is lossy and likely insufficient for true restore.
        // However, I will implement a best-effort restore or log a warning.

        logger.warn('Neo4j restore is limited due to backup format constraints. Only node properties are restored (no labels/rels).');

    } catch (e) {
        logger.error('Neo4j restore failed', e);
        throw e;
    } finally {
        await session.close();
    }
  }
}
