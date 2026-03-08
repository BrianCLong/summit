"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const redis_js_1 = require("../cache/redis.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const neo4j_js_1 = require("../db/neo4j.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const zlib_1 = __importDefault(require("zlib"));
const metrics_js_1 = require("../utils/metrics.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Metrics
const backupMetrics = new metrics_js_1.PrometheusMetrics('backup_service');
backupMetrics.createCounter('ops_total', 'Total backup operations', ['type', 'status']);
backupMetrics.createHistogram('duration_seconds', 'Backup duration', { buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120] });
backupMetrics.createGauge('size_bytes', 'Backup size', ['type']);
class BackupService {
    backupRoot;
    s3Config = null;
    redis;
    constructor(backupRoot = process.env.BACKUP_ROOT_DIR || './backups') {
        this.backupRoot = backupRoot;
        this.redis = redis_js_1.RedisService.getInstance();
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
    async ensureBackupDir(type) {
        const date = new Date().toISOString().split('T')[0];
        const dir = path_1.default.join(this.backupRoot, type, date);
        await promises_1.default.mkdir(dir, { recursive: true });
        return dir;
    }
    async uploadToS3(filepath, key) {
        if (!this.s3Config) {
            logger_js_1.default.warn('Skipping S3 upload: No S3 configuration found.');
            return;
        }
        logger_js_1.default.info(`Uploading ${filepath} to S3 bucket ${this.s3Config.bucket} as ${key}...`);
        try {
            if (process.env.USE_AWS_CLI === 'true') {
                await execAsync(`aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region}`);
            }
            else {
                // Simulating upload delay
                await new Promise(r => setTimeout(r, 500));
                logger_js_1.default.info('Simulated S3 upload complete.');
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to upload to S3', error);
            throw error;
        }
    }
    async verifyBackup(filepath) {
        logger_js_1.default.info(`Verifying backup integrity for ${filepath}...`);
        try {
            const stats = await promises_1.default.stat(filepath);
            if (stats.size === 0)
                throw new Error('Backup file is empty');
            if (filepath.endsWith('.gz')) {
                await execAsync(`gzip -t "${filepath}"`);
            }
            logger_js_1.default.info(`Backup verification successful for ${filepath}`);
            return true;
        }
        catch (error) {
            logger_js_1.default.error(`Backup verification failed for ${filepath}`, error);
            return false;
        }
    }
    async backupPostgres(options = {}) {
        const startTime = Date.now();
        logger_js_1.default.info('Starting PostgreSQL backup...');
        try {
            const dir = await this.ensureBackupDir('postgres');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `postgres-backup-${timestamp}.sql`;
            const filepath = path_1.default.join(dir, filename);
            const finalPath = options.compress ? `${filepath}.gz` : filepath;
            const pgHost = process.env.POSTGRES_HOST || 'localhost';
            const pgUser = process.env.POSTGRES_USER || 'intelgraph';
            const pgDb = process.env.POSTGRES_DB || 'intelgraph_dev';
            const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';
            const cmd = `PGPASSWORD='${pgPassword}' pg_dump -h ${pgHost} -U ${pgUser} ${pgDb}`;
            let attempt = 0;
            const maxRetries = 3;
            while (attempt < maxRetries) {
                try {
                    if (options.compress) {
                        await execAsync(`${cmd} | gzip > "${finalPath}"`);
                    }
                    else {
                        await execAsync(`${cmd} > "${finalPath}"`);
                    }
                    break;
                }
                catch (e) {
                    attempt++;
                    if (attempt >= maxRetries)
                        throw e;
                    logger_js_1.default.warn({ error: e }, `Postgres backup attempt ${attempt} failed, retrying in 2s...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            const stats = await promises_1.default.stat(finalPath);
            backupMetrics.setGauge('size_bytes', stats.size, { type: 'postgres' });
            backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'postgres', status: 'success' });
            backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'success' });
            logger_js_1.default.info({ path: finalPath, size: stats.size }, 'PostgreSQL backup completed');
            if (options.uploadToS3) {
                const s3Key = `postgres/${path_1.default.basename(finalPath)}`;
                await this.uploadToS3(finalPath, s3Key);
            }
            await this.verifyBackup(finalPath);
            await this.recordBackupMeta('postgres', finalPath, stats.size);
            return finalPath;
        }
        catch (error) {
            backupMetrics.incrementCounter('ops_total', { type: 'postgres', status: 'failure' });
            logger_js_1.default.error('PostgreSQL backup failed', error);
            throw error;
        }
    }
    async backupNeo4j(options = {}) {
        const startTime = Date.now();
        logger_js_1.default.info('Starting Neo4j backup...');
        try {
            const dir = await this.ensureBackupDir('neo4j');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `neo4j-export-${timestamp}.jsonl`;
            const filepath = path_1.default.join(dir, filename);
            const finalPath = options.compress ? `${filepath}.gz` : filepath;
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                const fileStream = (0, fs_1.createWriteStream)(finalPath);
                const outputStream = options.compress
                    ? zlib_1.default.createGzip()
                    : null;
                if (outputStream) {
                    outputStream.pipe(fileStream);
                }
                const writeTarget = outputStream || fileStream;
                // Full logical backup (removed LIMIT)
                const nodeResult = await session.run('MATCH (n) RETURN n');
                for (const record of nodeResult.records) {
                    const node = record.get('n');
                    const line = JSON.stringify({ type: 'node', labels: node.labels, props: node.properties }) + '\n';
                    writeTarget.write(line);
                }
                const relResult = await session.run('MATCH (a)-[r]->(b) RETURN r, a.id as startId, b.id as endId');
                for (const record of relResult.records) {
                    const rel = record.get('r');
                    const startId = record.get('startId');
                    const endId = record.get('endId');
                    const line = JSON.stringify({
                        type: 'rel',
                        typeName: rel.type,
                        props: rel.properties,
                        startId,
                        endId
                    }) + '\n';
                    writeTarget.write(line);
                }
                writeTarget.end();
                await new Promise((resolve, reject) => {
                    fileStream.on('finish', () => resolve());
                    fileStream.on('error', (err) => reject(err));
                });
            }
            finally {
                await session.close();
            }
            const stats = await promises_1.default.stat(finalPath);
            backupMetrics.setGauge('size_bytes', stats.size, { type: 'neo4j' });
            backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'neo4j', status: 'success' });
            logger_js_1.default.info({ path: finalPath, size: stats.size }, 'Neo4j logical backup completed');
            if (options.uploadToS3) {
                const s3Key = `neo4j/${path_1.default.basename(finalPath)}`;
                await this.uploadToS3(finalPath, s3Key);
            }
            await this.verifyBackup(finalPath);
            await this.recordBackupMeta('neo4j', finalPath, stats.size);
            return finalPath;
        }
        catch (error) {
            logger_js_1.default.error('Neo4j backup failed', error);
            throw error;
        }
    }
    async backupRedis(options = {}) {
        const startTime = Date.now();
        logger_js_1.default.info('Starting Redis backup...');
        try {
            const client = this.redis.getClient();
            if (!client)
                throw new Error('Redis client not available');
            // Check if cluster or standalone
            const isCluster = client.constructor.name === 'Cluster';
            if (isCluster) {
                // @ts-ignore
                const nodes = client.nodes ? client.nodes('master') : [];
                if (nodes.length > 0) {
                    logger_js_1.default.info(`Triggering BGSAVE on ${nodes.length} master nodes...`);
                    await Promise.all(nodes.map((node) => node.bgsave().catch((e) => logger_js_1.default.warn(`Failed to trigger BGSAVE on node ${node.options.host}: ${e.message}`))));
                }
                else {
                    logger_js_1.default.warn('No master nodes found in cluster for backup.');
                }
            }
            else {
                // @ts-ignore
                await client.bgsave();
            }
            const dir = await this.ensureBackupDir('redis');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `redis-backup-log-${timestamp}.txt`;
            const filepath = path_1.default.join(dir, filename);
            await promises_1.default.writeFile(filepath, `Redis BGSAVE triggered successfully. Last save timestamp: ${new Date().toISOString()}`);
            backupMetrics.observeHistogram('duration_seconds', (Date.now() - startTime) / 1000, { type: 'redis', status: 'success' });
            if (options.uploadToS3) {
                const s3Key = `redis/${path_1.default.basename(filepath)}`;
                await this.uploadToS3(filepath, s3Key);
            }
            await this.recordBackupMeta('redis', filepath, 0);
            return filepath;
        }
        catch (error) {
            logger_js_1.default.error('Redis backup failed', error);
            throw error;
        }
    }
    async recordBackupMeta(type, filepath, size) {
        const meta = {
            type,
            filepath,
            size,
            timestamp: new Date().toISOString(),
            host: process.env.HOSTNAME || 'unknown'
        };
        // Store in Redis list for easy retrieval by DR service
        const client = this.redis.getClient();
        if (client) {
            await client.lpush(`backups:${type}:history`, JSON.stringify(meta));
            await client.ltrim(`backups:${type}:history`, 0, 99);
        }
    }
    async runAllBackups() {
        const results = {};
        const uploadToS3 = !!process.env.S3_BACKUP_BUCKET;
        try {
            results.postgres = await this.backupPostgres({ compress: true, uploadToS3 });
        }
        catch (e) {
            results.postgres = `Failed: ${e}`;
        }
        try {
            results.neo4j = await this.backupNeo4j({ compress: true, uploadToS3 });
        }
        catch (e) {
            results.neo4j = `Failed: ${e}`;
        }
        try {
            results.redis = await this.backupRedis({ uploadToS3 });
        }
        catch (e) {
            results.redis = `Failed: ${e}`;
        }
        return results;
    }
}
exports.BackupService = BackupService;
