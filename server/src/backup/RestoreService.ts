import logger from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { RedisService } from '../cache/redis.js';
import fs from 'fs';
import fsp from 'fs/promises';
import readline from 'readline';
import { promisify } from 'util';
import { exec, execFile } from 'child_process';
import zlib from 'zlib';
import path from 'path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class RestoreService {
  private redis?: RedisService;

  constructor(redis?: RedisService) {
      this.redis = redis;
  }

  async downloadFromS3(s3Key: string, localPath: string): Promise<void> {
    const bucket = process.env.S3_BACKUP_BUCKET;
    const region = process.env.S3_REGION || 'us-east-1';

    if (!bucket) {
        throw new Error('S3_BACKUP_BUCKET is not configured');
    }

    logger.info(`Downloading ${s3Key} from S3 bucket ${bucket} to ${localPath}...`);

    try {
        if (process.env.USE_AWS_CLI === 'true') {
            await execFileAsync('aws', ['s3', 'cp', `s3://${bucket}/${s3Key}`, localPath, '--region', region]);
        } else {
            // Placeholder for SDK implementation if needed, or error.
            // For now, consistent with BackupService simulation/CLI dependency.
            if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
                 logger.warn('Simulating S3 download (USE_AWS_CLI!=true). Expecting file to exist or created manually.');
            } else {
                 throw new Error('AWS CLI required for S3 download (USE_AWS_CLI=true) in this environment configuration.');
            }
        }
        logger.info('S3 download completed.');
    } catch (error: any) {
        logger.error('Failed to download from S3', error);
        throw error;
    }
  }

  async restorePostgres(filepath: string): Promise<void> {
    logger.info(`Starting PostgreSQL restore from ${filepath}...`);
    try {
      const pgHost = process.env.POSTGRES_HOST || 'localhost';
      const pgUser = process.env.POSTGRES_USER || 'intelgraph';
      const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
      const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

      let cmd = `PGPASSWORD='${pgPassword}' psql -h ${pgHost} -U ${pgUser} -d ${pgDb}`;

      if (filepath.endsWith('.gz')) {
          cmd = `gunzip -c "${filepath}" | ${cmd}`;
      } else {
          cmd = `${cmd} -f "${filepath}"`;
      }

      await execAsync(cmd);
      logger.info('PostgreSQL restore completed successfully.');
    } catch (error: any) {
      logger.error('PostgreSQL restore failed', error);
      throw error;
    }
  }

  async restoreNeo4j(filepath: string): Promise<void> {
    logger.info(`Starting Neo4j restore from ${filepath}...`);
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        logger.info('Wiping existing Neo4j data...');
        await session.run('MATCH (n) DETACH DELETE n');

        const fileStream = fs.createReadStream(filepath);
        let input;

        if (filepath.endsWith('.gz')) {
             input = fileStream.pipe(zlib.createGunzip());
        } else {
             input = fileStream;
        }

        const rl = readline.createInterface({
            input: input,
            crlfDelay: Infinity
        });

        let nodesCount = 0;
        let relsCount = 0;

        let nodeBatch: any[] = [];
        let relBatch: any[] = [];
        const BATCH_SIZE = 1000;

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const item = JSON.parse(line);

                if (item.type === 'node') {
                    nodeBatch.push(item);
                    if (nodeBatch.length >= BATCH_SIZE) {
                        await this.processNodeBatch(session, nodeBatch);
                        nodesCount += nodeBatch.length;
                        nodeBatch = [];
                    }
                } else if (item.type === 'rel') {
                    relBatch.push(item);
                    if (relBatch.length >= BATCH_SIZE) {
                        await this.processRelBatch(session, relBatch);
                        relsCount += relBatch.length;
                        relBatch = [];
                    }
                }
            } catch (e) {
                logger.warn('Failed to parse line in backup file', e);
            }
        }

        if (nodeBatch.length > 0) {
            await this.processNodeBatch(session, nodeBatch);
            nodesCount += nodeBatch.length;
        }
        if (relBatch.length > 0) {
            await this.processRelBatch(session, relBatch);
            relsCount += relBatch.length;
        }

        logger.info(`Neo4j restore completed. Nodes: ${nodesCount}, Relationships: ${relsCount}`);

    } catch (error: any) {
        logger.error('Neo4j restore failed', error);
        throw error;
    } finally {
        await session.close();
    }
  }

  async restoreRedis(filepath: string): Promise<void> {
      logger.info(`Starting Redis restore from ${filepath}...`);
      try {
          const redis = this.redis || RedisService.getInstance();
          const client = redis.getClient();
          if (!client) throw new Error('Redis client not available to determine data directory');

          // 1. Get Redis Directory
          // @ts-ignore
          const configDirArray = await client.config('GET', 'dir');
           // @ts-ignore
          const configDbFilenameArray = await client.config('GET', 'dbfilename');

          const redisDir = configDirArray[1];
          const dbFilename = configDbFilenameArray[1];
          const targetPath = path.join(redisDir, dbFilename);

          logger.info({ targetPath }, 'Identified Redis RDB target path');

          // 2. Check if file exists
          if (!fs.existsSync(filepath)) {
              throw new Error(`Backup file not found: ${filepath}`);
          }

          // 3. Copy file
          logger.warn('Overwriting Redis RDB file. Redis must be restarted to load this data.');

          // Verify we can write to the target directory
          try {
            await fsp.access(path.dirname(targetPath), fs.constants.W_OK);
          } catch (e) {
             throw new Error(`Cannot write to Redis directory: ${path.dirname(targetPath)}`);
          }

          await fsp.copyFile(filepath, targetPath);

          logger.info('Redis RDB file restored successfully.');
          logger.warn('IMPORTANT: Please restart the Redis service to load the restored data.');

      } catch (error: any) {
          logger.error('Redis restore failed', error);
          throw error;
      }
  }

  private async processNodeBatch(session: any, batch: any[]) {
      const batchesByLabel = new Map<string, any[]>();
      for (const item of batch) {
          const labelKey = item.labels ? item.labels.sort().join(':') : '';
          if (!batchesByLabel.has(labelKey)) batchesByLabel.set(labelKey, []);
          batchesByLabel.get(labelKey)!.push(item.props);
      }

      for (const [labels, propsList] of batchesByLabel.entries()) {
          const cypherLabels = labels ? `:${labels}` : '';
          await session.run(
              `UNWIND $propsList AS props CREATE (n${cypherLabels}) SET n = props`,
              { propsList }
          );
      }
  }

  private async processRelBatch(session: any, batch: any[]) {
      const batchesByType = new Map<string, any[]>();
      for (const item of batch) {
          const type = item.typeName;
          if (!batchesByType.has(type)) batchesByType.set(type, []);
          batchesByType.get(type)!.push(item);
      }

      for (const [type, items] of batchesByType.entries()) {
          await session.run(
              `
              UNWIND $items AS item
              MATCH (a {id: item.startId}), (b {id: item.endId})
              CREATE (a)-[r:${type}]->(b)
              SET r = item.props
              `,
              { items }
          );
      }
  }
}
