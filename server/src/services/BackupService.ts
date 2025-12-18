import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getRedisClient } from '../db/redis.js';
import pino from 'pino';

const logger = pino({ name: 'BackupService' });

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

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
    } catch (error) {
      logger.error('PostgreSQL backup failed', error);
    }

    try {
      await this.backupNeo4j(timestamp);
      results.neo4j = true;
    } catch (error) {
      logger.error('Neo4j backup failed', error);
    }

    try {
      await this.backupRedis(timestamp);
      results.redis = true;
    } catch (error) {
      logger.error('Redis backup failed', error);
    }

    logger.info('Full backup completed', results);
    return results;
  }

  private async backupPostgres(timestamp: string): Promise<void> {
    const file = path.join(BACKUP_DIR, `postgres_${timestamp}.sql`);
    const writeStream = fs.createWriteStream(file);

    // Extract connection params safely
    const env = { ...process.env };
    // Set explicit password env var for pg_dump to pick up
    // This avoids putting it in CLI args

    // Construct args
    const args = [];

    // If DATABASE_URL is set, pg_dump can use it directly via -d
    if (env.DATABASE_URL) {
       args.push(env.DATABASE_URL);
    } else {
       // Fallback to manual host/user/db params
       if (env.POSTGRES_HOST) args.push('-h', env.POSTGRES_HOST);
       if (env.POSTGRES_PORT) args.push('-p', env.POSTGRES_PORT);
       if (env.POSTGRES_USER) args.push('-U', env.POSTGRES_USER);
       if (env.POSTGRES_DB) args.push(env.POSTGRES_DB);
       // Password is handled via PGPASSWORD env var which is already in `env` if loaded,
       // or we explicitly set it if using manual fallback
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

        child.on('error', (err) => {
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
      // Attempt APOC export first (streaming)
      // We use RX session or simple subscription to stream results
      // Since `neo4j-driver` exposes a reactive-like API for result consumption, we can use that.

      // Try APOC
      let apocSuccess = false;
      try {
        await new Promise<void>((resolve, reject) => {
          session.run(`
            CALL apoc.export.json.all(null, {stream: true})
            YIELD data
            RETURN data
          `).subscribe({
            onNext: record => {
               apocSuccess = true;
               const chunk = record.get('data');
               if (chunk) writeStream.write(chunk);
            },
            onCompleted: () => resolve(),
            onError: (err) => reject(err)
          });
        });
        logger.info(`Neo4j backup (APOC) created at ${file}`);
      } catch (err) {
         // APOC failed, proceed to fallback
         logger.warn('APOC export failed, falling back to manual stream', err);
         apocSuccess = false;
      }

      if (!apocSuccess) {
           // Manual Fallback: Stream Nodes then Relationships
           // To ensure valid JSON, we manually construct the stream
           writeStream.write('{"nodes":[');
           let isFirstNode = true;

           await new Promise<void>((resolve, reject) => {
               session.run('MATCH (n) RETURN n').subscribe({
                   onNext: record => {
                       const props = record.get('n').properties;
                       if (!isFirstNode) writeStream.write(',');
                       writeStream.write(JSON.stringify(props));
                       isFirstNode = false;
                   },
                   onCompleted: () => resolve(),
                   onError: err => reject(err)
               });
           });

           writeStream.write('],"relationships":[');
           let isFirstRel = true;

           await new Promise<void>((resolve, reject) => {
               session.run('MATCH ()-[r]->() RETURN r').subscribe({
                   onNext: record => {
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
                   onError: err => reject(err)
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

    // Trigger BGSAVE for RDB persistence on disk
    try {
        await client.bgsave();
    } catch (err: any) {
        // Ignore "Background save already in progress" error
        if (!err.message.includes('already in progress')) {
            throw err;
        }
    }

    // Also perform JSON dump for portability (streaming)
    const file = path.join(BACKUP_DIR, `redis_${timestamp}.json`);
    const writeStream = fs.createWriteStream(file);

    writeStream.write('{');
    let isFirstKey = true;

    // Use SCAN stream to avoid memory pressure
    const stream = client.scanStream({ match: '*', count: 100 });

    for await (const keys of stream) {
        if (keys.length > 0) {
            const pipeline = client.pipeline();
            keys.forEach((key: string) => pipeline.get(key));
            const values = await pipeline.exec();

            keys.forEach((key: string, index: number) => {
                const val = values?.[index]?.[1];
                if (typeof val === 'string') {
                    if (!isFirstKey) writeStream.write(',');
                    writeStream.write(`"${key}":${JSON.stringify(val)}`);
                    isFirstKey = false;
                }
            });
        }
    }

    writeStream.write('}');
    writeStream.end();

    logger.info(`Redis backup created at ${file}`);
  }
}
