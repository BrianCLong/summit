import logger from '../config/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { RedisService } from '../db/redis.js';
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import { exec } from 'child_process';
import zlib from 'zlib';

const execAsync = promisify(exec);

export class RestoreService {
  private redis: RedisService;

  constructor() {
    this.redis = RedisService.getInstance();
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

        // Map old ID -> new ID
        const idMap = new Map<number | string, number | string>();

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const item = JSON.parse(line);

                if (item.type === 'node') {
                    nodeBatch.push(item);
                    if (nodeBatch.length >= BATCH_SIZE) {
                        await this.processNodeBatch(session, nodeBatch, idMap);
                        nodesCount += nodeBatch.length;
                        nodeBatch = [];
                    }
                } else if (item.type === 'rel') {
                    relBatch.push(item);
                    if (relBatch.length >= BATCH_SIZE) {
                        await this.processRelBatch(session, relBatch, idMap);
                        relsCount += relBatch.length;
                        relBatch = [];
                    }
                }
            } catch (e) {
                logger.warn('Failed to parse line in backup file', e);
            }
        }

        if (nodeBatch.length > 0) {
            await this.processNodeBatch(session, nodeBatch, idMap);
            nodesCount += nodeBatch.length;
        }
        if (relBatch.length > 0) {
            await this.processRelBatch(session, relBatch, idMap);
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

  private async processNodeBatch(session: any, batch: any[], idMap: Map<number | string, number | string>) {
      const batchesByLabel = new Map<string, any[]>();
      for (const item of batch) {
          const labelKey = item.labels ? item.labels.sort().join(':') : '';
          if (!batchesByLabel.has(labelKey)) batchesByLabel.set(labelKey, []);
          const props = item.props || {};
          // Temporarily store old ID in props for retrieval after creation
          batchesByLabel.get(labelKey)!.push({ ...props, _restore_id: item.elementId });
      }

      for (const [labels, propsList] of batchesByLabel.entries()) {
          const cypherLabels = labels ? `:${labels}` : '';
          // Create nodes, return new ID and the old ID stored in _restore_id, then remove _restore_id
          const result = await session.run(
              `UNWIND $propsList AS props
               CREATE (n${cypherLabels})
               SET n = props
               WITH n, n._restore_id as oldId
               REMOVE n._restore_id
               RETURN id(n) as newId, oldId`,
              { propsList }
          );

          for (const record of result.records) {
              const newId = record.get('newId');
              const oldId = record.get('oldId');

              const safeNewId = typeof newId === 'object' && 'toNumber' in newId ? newId.toNumber() : newId;
              // oldId type depends on what was in JSON, typically number or string

              if (oldId !== null && oldId !== undefined) {
                  idMap.set(oldId, safeNewId);
              }
          }
      }
  }

  private async processRelBatch(session: any, batch: any[], idMap: Map<number | string, number | string>) {
      const batchesByType = new Map<string, any[]>();
      for (const item of batch) {
          const type = item.typeName;
          const newStartId = idMap.get(item.startId);
          const newEndId = idMap.get(item.endId);

          if (newStartId === undefined || newEndId === undefined) {
              // This can happen if relationships refer to nodes not yet processed or failed to create
              // With BackupService ensuring nodes first, this implies missing node data
              continue;
          }

          if (!batchesByType.has(type)) batchesByType.set(type, []);
          batchesByType.get(type)!.push({ ...item, startId: newStartId, endId: newEndId });
      }

      for (const [type, items] of batchesByType.entries()) {
          // Note: using id(n) lookup is fast if we assume internal IDs match
          await session.run(
              `
              UNWIND $items AS item
              MATCH (a), (b)
              WHERE id(a) = item.startId AND id(b) = item.endId
              CREATE (a)-[r:${type}]->(b)
              SET r = item.props
              `,
              { items }
          );
      }
  }

  async restoreRedis(filepath: string): Promise<void> {
      logger.info(`Starting Redis restore from ${filepath}...`);
      const client = this.redis.getClient();
      if (!client) throw new Error('Redis client unavailable');

      try {
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

        let count = 0;
        let pipeline = client.pipeline();
        const BATCH_SIZE = 1000;

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const { key, value } = JSON.parse(line);
                if (key && value) {
                    pipeline.set(key, value);
                    count++;
                }

                if (count % BATCH_SIZE === 0) {
                    await pipeline.exec();
                    pipeline = client.pipeline();
                }
            } catch (e) {
                logger.warn('Failed to parse line in Redis backup file', e);
            }
        }

        if (count % BATCH_SIZE !== 0) {
            await pipeline.exec();
        }

        logger.info(`Redis restore completed. Restored ${count} keys.`);

      } catch (error: any) {
          logger.error('Redis restore failed', error);
          throw error;
      }
  }
}
