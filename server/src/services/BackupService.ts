
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getRedisClient } from '../db/redis.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'BackupService' });

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

/**
 * @class BackupService
 * @description Provides functionality to perform backups and restores of the application's data stores: PostgreSQL, Neo4j, and Redis.
 */
export class BackupService {
  private static instance: BackupService;

  private constructor() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
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
      child.stderr.on('data', (data) => logger.debug(`pg_dump stderr: ${data}`));
      child.on('error', (err) => reject(err));
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
    const file = path.join(BACKUP_DIR, `neo4j_${timestamp}.ndjson`);
    const driver = getNeo4jDriver();
    const session = driver.session();
    const writeStream = fs.createWriteStream(file);

    try {
        // Stream Nodes first
        await new Promise<void>((resolve, reject) => {
          session.run('MATCH (n) RETURN n, elementId(n) as id, labels(n) as labels').subscribe({
            onNext: (record: any) => {
              const node = record.get('n');
              const id = record.get('id');
              const labels = record.get('labels');
              const entry = { type: 'node', id, labels, properties: node.properties };
              writeStream.write(JSON.stringify(entry) + '\n');
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        // Stream Relationships
        await new Promise<void>((resolve, reject) => {
          session.run('MATCH (n)-[r]->(m) RETURN r, elementId(n) as start, elementId(m) as end, type(r) as type').subscribe({
            onNext: (record: any) => {
              const r = record.get('r');
              const start = record.get('start');
              const end = record.get('end');
              const type = record.get('type');
              const entry = { type: 'relationship', start, end, relType: type, properties: r.properties };
              writeStream.write(JSON.stringify(entry) + '\n');
            },
            onCompleted: () => resolve(),
            onError: (err: any) => reject(err)
          });
        });

        logger.info(`Neo4j streaming backup created at ${file}`);
    } finally {
      writeStream.end();
      await session.close();
    }
  }

  private async backupRedis(timestamp: string): Promise<void> {
    const client = getRedisClient();
    if (!client) throw new Error('Redis client unavailable');

    const file = path.join(BACKUP_DIR, `redis_${timestamp}.ndjson`);
    const writeStream = fs.createWriteStream(file);

    const stream = client.scanStream({ match: '*', count: 100 });

    for await (const keys of stream) {
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((key: string) => pipeline.get(key));
        const values = await pipeline.exec();

        keys.forEach((key: string, index: number) => {
          const val = values?.[index]?.[1];
          if (typeof val === 'string') {
            const entry = { key, value: val };
            writeStream.write(JSON.stringify(entry) + '\n');
          }
        });
      }
    }

    writeStream.end();
    logger.info(`Redis streaming backup created at ${file}`);
  }

  // Restore Methods

  async restorePostgres(file: string, dbName?: string): Promise<void> {
    if (!fs.existsSync(file)) throw new Error(`Backup file not found: ${file}`);
    logger.info(`Restoring PostgreSQL from ${file}...`);

    const env = { ...process.env };
    const args: string[] = [];

    if (env.DATABASE_URL && !dbName) {
      args.push(env.DATABASE_URL);
    } else {
      if (env.POSTGRES_HOST) args.push('-h', env.POSTGRES_HOST);
      if (env.POSTGRES_PORT) args.push('-p', env.POSTGRES_PORT);
      if (env.POSTGRES_USER) args.push('-U', env.POSTGRES_USER);
      if (dbName) {
          args.push('-d', dbName);
      } else if (env.POSTGRES_DB) {
          args.push('-d', env.POSTGRES_DB);
      }
      if (!env.PGPASSWORD && env.POSTGRES_PASSWORD) {
        env.PGPASSWORD = env.POSTGRES_PASSWORD;
      }
    }

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(file);
      const child = spawn('psql', args, { env });

      readStream.pipe(child.stdin);

      child.stderr.on('data', (data) => logger.debug(`psql stderr: ${data}`));
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`PostgreSQL restore complete from ${file}`);
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });
    });
  }

  async restoreNeo4j(file: string): Promise<void> {
    if (!fs.existsSync(file)) throw new Error(`Backup file not found: ${file}`);
    logger.info(`Restoring Neo4j from ${file}...`);

    const driver = getNeo4jDriver();
    const session = driver.session();

    // We need a map to store old ID -> new ID mapping to reconstruct relationships
    // WARNING: In a very large graph, this map might get large.
    // For extreme scale, we'd need a temporary KV store (like Redis or RocksDB),
    // but for now, a Map is better than loading the whole file.
    const idMap = new Map<string, string>();

    const fileStream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    try {
        await session.run('MATCH (n) DETACH DELETE n');

        // First pass: Restore Nodes
        // We will process relationships in a second pass if possible,
        // OR we just process line by line.
        // BUT, relationships depend on nodes being created and having new IDs.
        // So we might need two passes over the file or separate files.
        // Given we write mixed content (nodes first, then rels) in one file,
        // we can just process sequentially if we ensure nodes come before rels (which we did in backup).

        for await (const line of rl) {
            if (!line.trim()) continue;
            const entry = JSON.parse(line);

            if (entry.type === 'node') {
                // Create node with labels and properties
                const labelStr = entry.labels.map((l: string) => `\`${l}\``).join(':');
                const query = `CREATE (n${labelStr ? ':' + labelStr : ''}) SET n = $props RETURN elementId(n) as newId`;

                const result = await session.run(query, { props: entry.properties });
                const newId = result.records[0].get('newId');

                // Map old ID to new ID
                idMap.set(entry.id, newId);

            } else if (entry.type === 'relationship') {
                const newStart = idMap.get(entry.start);
                const newEnd = idMap.get(entry.end);

                if (newStart && newEnd) {
                    const query = `
                        MATCH (a), (b)
                        WHERE elementId(a) = $start AND elementId(b) = $end
                        CREATE (a)-[r:\`${entry.relType}\`]->(b)
                        SET r = $props
                    `;
                    await session.run(query, {
                        start: newStart,
                        end: newEnd,
                        props: entry.properties
                    });
                } else {
                    logger.warn(`Skipping relationship due to missing node(s): ${entry.start} -> ${entry.end}`);
                }
            }
        }

    } finally {
        await session.close();
    }
    logger.info('Neo4j restore complete.');
  }

  async restoreRedis(file: string): Promise<void> {
    if (!fs.existsSync(file)) throw new Error(`Backup file not found: ${file}`);
    logger.info(`Restoring Redis from ${file}...`);

    const client = getRedisClient();
    const fileStream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let pipeline = client.pipeline();
    let count = 0;
    const BATCH_SIZE = 1000;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);

        if (entry.key && typeof entry.value === 'string') {
            pipeline.set(entry.key, entry.value);
            count++;
        }

        if (count >= BATCH_SIZE) {
            await pipeline.exec();
            pipeline = client.pipeline();
            count = 0;
        }
    }

    if (count > 0) {
        await pipeline.exec();
    }

    logger.info('Redis restore complete.');
  }
}
