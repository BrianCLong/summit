"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupManager = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("../utils/logger.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupManager {
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }
    ensureDir(dir) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    async backupPostgres(options) {
        const timestamp = this.getTimestamp();
        const filename = `postgres-backup-${timestamp}.sql`;
        const outputPath = path_1.default.join(options.outputDir, filename);
        this.ensureDir(options.outputDir);
        logger_js_1.logger.info(`Starting PostgreSQL backup to ${outputPath}`);
        try {
            // Use DATABASE_URL if available, otherwise assume local defaults or env vars
            const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
            // Use pg_dump. Note: requires pg_dump to be installed in the environment
            await execAsync(`pg_dump "${dbUrl}" -f "${outputPath}"`);
            logger_js_1.logger.info('PostgreSQL backup completed successfully');
            return outputPath;
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'PostgreSQL backup failed');
            throw error;
        }
    }
    async backupRedis(options) {
        const timestamp = this.getTimestamp();
        const filename = `redis-backup-${timestamp}.rdb`;
        const outputPath = path_1.default.join(options.outputDir, filename);
        this.ensureDir(options.outputDir);
        logger_js_1.logger.info(`Starting Redis backup to ${outputPath}`);
        try {
            // Redis backup usually involves SAVE command or copying dump.rdb
            // Here we'll try to trigger a SAVE and then copy the dump file if local,
            // or use --rdb if redis-cli is available and remote.
            const redisHost = process.env.REDIS_HOST || 'localhost';
            const redisPort = process.env.REDIS_PORT || '6379';
            const redisPassword = process.env.REDIS_PASSWORD;
            let command = `redis-cli -h ${redisHost} -p ${redisPort}`;
            if (redisPassword) {
                // Warning: Process list might show password. Use config file in real prod if strict.
                command += ` -a "${redisPassword}"`;
            }
            command += ` --rdb "${outputPath}"`;
            await execAsync(command);
            logger_js_1.logger.info('Redis backup completed successfully');
            return outputPath;
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Redis backup failed');
            throw error;
        }
    }
    async backupNeo4j(options) {
        const timestamp = this.getTimestamp();
        const filename = `neo4j-backup-${timestamp}.dump`;
        const outputPath = path_1.default.join(options.outputDir, filename);
        this.ensureDir(options.outputDir);
        logger_js_1.logger.info(`Starting Neo4j backup to ${outputPath}`);
        try {
            // neo4j-admin is the standard way, but requires being on the server or having access.
            // If we are in a container, we might need to exec into the neo4j container or use cypher-shell to export.
            // Given the constraints, we will attempt to use `neo4j-admin database dump` if available,
            // or fallback to a warning if not running locally/accessible.
            // Check if neo4j-admin exists
            try {
                await execAsync('neo4j-admin --version');
                await execAsync(`neo4j-admin database dump neo4j --to-path="${options.outputDir}"`);
                // Rename to include timestamp if needed, or just return the dir
                // neo4j-admin dump creates a file named <database>.dump
                const defaultDump = path_1.default.join(options.outputDir, 'neo4j.dump');
                if (fs_1.default.existsSync(defaultDump)) {
                    fs_1.default.renameSync(defaultDump, outputPath);
                }
                logger_js_1.logger.info('Neo4j backup completed successfully');
                return outputPath;
            }
            catch (e) {
                logger_js_1.logger.warn('neo4j-admin not found. Attempting Cypher export via APOC (if available) is complex via CLI. Skipping native dump.');
                throw new Error('neo4j-admin tool not found or failed');
            }
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Neo4j backup failed');
            throw error;
        }
    }
    async backupAll(options) {
        const results = [];
        try {
            results.push(await this.backupPostgres(options));
        }
        catch (e) {
            logger_js_1.logger.error('Skipping Postgres due to error');
        }
        try {
            results.push(await this.backupRedis(options));
        }
        catch (e) {
            logger_js_1.logger.error('Skipping Redis due to error');
        }
        try {
            results.push(await this.backupNeo4j(options));
        }
        catch (e) {
            logger_js_1.logger.error('Skipping Neo4j due to error');
        }
        return results;
    }
}
exports.BackupManager = BackupManager;
