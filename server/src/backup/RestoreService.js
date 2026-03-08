"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestoreService = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const neo4j_js_1 = require("../db/neo4j.js");
const redis_js_1 = require("../cache/redis.js");
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const zlib_1 = __importDefault(require("zlib"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class RestoreService {
    async restorePostgres(filepath) {
        logger_js_1.default.info(`Starting PostgreSQL restore from ${filepath}...`);
        try {
            const pgHost = process.env.POSTGRES_HOST || 'localhost';
            const pgUser = process.env.POSTGRES_USER || 'intelgraph';
            const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
            const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';
            let cmd = `PGPASSWORD='${pgPassword}' psql -h ${pgHost} -U ${pgUser} -d ${pgDb}`;
            if (filepath.endsWith('.gz')) {
                cmd = `gunzip -c "${filepath}" | ${cmd}`;
            }
            else {
                cmd = `${cmd} -f "${filepath}"`;
            }
            await execAsync(cmd);
            logger_js_1.default.info('PostgreSQL restore completed successfully.');
        }
        catch (error) {
            logger_js_1.default.error('PostgreSQL restore failed', error);
            throw error;
        }
    }
    async restoreNeo4j(filepath, wipe = false) {
        logger_js_1.default.info(`Starting Neo4j restore from ${filepath}...`);
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            if (wipe) {
                logger_js_1.default.warn('Wiping existing Neo4j data...');
                await session.run('MATCH (n) DETACH DELETE n');
            }
            else {
                logger_js_1.default.info('Appending to existing Neo4j data (no wipe requested).');
            }
            const fileStream = fs_1.default.createReadStream(filepath);
            let input;
            if (filepath.endsWith('.gz')) {
                input = fileStream.pipe(zlib_1.default.createGunzip());
            }
            else {
                input = fileStream;
            }
            const rl = readline_1.default.createInterface({
                input: input,
                crlfDelay: Infinity
            });
            let nodesCount = 0;
            let relsCount = 0;
            let nodeBatch = [];
            let relBatch = [];
            const BATCH_SIZE = 1000;
            for await (const line of rl) {
                if (!line.trim())
                    continue;
                try {
                    const item = JSON.parse(line);
                    if (item.type === 'node') {
                        nodeBatch.push(item);
                        if (nodeBatch.length >= BATCH_SIZE) {
                            await this.processNodeBatch(session, nodeBatch);
                            nodesCount += nodeBatch.length;
                            nodeBatch = [];
                        }
                    }
                    else if (item.type === 'rel') {
                        relBatch.push(item);
                        if (relBatch.length >= BATCH_SIZE) {
                            await this.processRelBatch(session, relBatch);
                            relsCount += relBatch.length;
                            relBatch = [];
                        }
                    }
                }
                catch (e) {
                    logger_js_1.default.warn('Failed to parse line in backup file', e);
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
            logger_js_1.default.info(`Neo4j restore completed. Nodes: ${nodesCount}, Relationships: ${relsCount}`);
        }
        catch (error) {
            logger_js_1.default.error('Neo4j restore failed', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async restoreRedis(filepath, wipe = false) {
        logger_js_1.default.info(`Starting Redis restore from ${filepath}...`);
        const redis = redis_js_1.RedisService.getInstance();
        const client = redis.getClient();
        try {
            if (wipe) {
                logger_js_1.default.warn('Flushing Redis DB...');
                await client.flushdb();
            }
            const fileStream = fs_1.default.createReadStream(filepath);
            let input;
            if (filepath.endsWith('.gz')) {
                input = fileStream.pipe(zlib_1.default.createGunzip());
            }
            else {
                input = fileStream;
            }
            const rl = readline_1.default.createInterface({
                input: input,
                crlfDelay: Infinity
            });
            let count = 0;
            for await (const line of rl) {
                if (!line.trim())
                    continue;
                try {
                    const item = JSON.parse(line);
                    // item: { k: key, t: type, e: ttl(sec), v: base64 }
                    const key = item.k;
                    const ttlSec = item.e;
                    const value = Buffer.from(item.v, 'base64');
                    // Restore command: RESTORE key ttl serialized-value [REPLACE]
                    // ttl is in ms. If ttlSec is -1, pass 0.
                    const ttlMs = (ttlSec === -1) ? 0 : ttlSec * 1000;
                    // Use REPLACE to overwrite if exists (even if we didn't wipe, we might want to overwrite collisions)
                    await client.restore(key, ttlMs, value, 'REPLACE');
                    count++;
                }
                catch (e) {
                    logger_js_1.default.warn({ error: e }, 'Failed to restore Redis key');
                }
            }
            logger_js_1.default.info(`Redis restore completed. Keys restored: ${count}`);
        }
        catch (error) {
            logger_js_1.default.error('Redis restore failed', error);
            throw error;
        }
    }
    async processNodeBatch(session, batch) {
        const batchesByLabel = new Map();
        for (const item of batch) {
            const labelKey = item.labels ? item.labels.sort().join(':') : '';
            if (!batchesByLabel.has(labelKey))
                batchesByLabel.set(labelKey, []);
            batchesByLabel.get(labelKey).push(item.props);
        }
        for (const [labels, propsList] of batchesByLabel.entries()) {
            const cypherLabels = labels ? `:${labels}` : '';
            await session.run(`UNWIND $propsList AS props CREATE (n${cypherLabels}) SET n = props`, { propsList });
        }
    }
    async processRelBatch(session, batch) {
        const batchesByType = new Map();
        for (const item of batch) {
            const type = item.typeName;
            if (!batchesByType.has(type))
                batchesByType.set(type, []);
            batchesByType.get(type).push(item);
        }
        for (const [type, items] of batchesByType.entries()) {
            await session.run(`
              UNWIND $items AS item
              MATCH (a {id: item.startId}), (b {id: item.endId})
              CREATE (a)-[r:${type}]->(b)
              SET r = item.props
              `, { items });
        }
    }
}
exports.RestoreService = RestoreService;
