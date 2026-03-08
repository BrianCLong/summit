"use strict";
/**
 * Database Connection Manager
 *
 * Manages PostgreSQL connection pools for the ER service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
const pg_1 = require("pg");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'ERDatabase' });
class DatabaseManager {
    writePool;
    readPool;
    initialized = false;
    constructor(config) {
        const poolConfig = {
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
            connectionTimeoutMillis: config.connectionTimeoutMs ?? 5000,
        };
        this.writePool = new pg_1.Pool({
            ...poolConfig,
            max: config.maxConnections ?? 20,
        });
        this.readPool = new pg_1.Pool({
            ...poolConfig,
            max: (config.maxConnections ?? 20) * 1.5,
        });
        this.writePool.on('error', (err) => {
            logger.error({ err }, 'Write pool error');
        });
        this.readPool.on('error', (err) => {
            logger.error({ err }, 'Read pool error');
        });
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Test connections
            const writeClient = await this.writePool.connect();
            await writeClient.query('SELECT 1');
            writeClient.release();
            const readClient = await this.readPool.connect();
            await readClient.query('SELECT 1');
            readClient.release();
            this.initialized = true;
            logger.info('Database connections established');
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize database connections');
            throw error;
        }
    }
    async getWriteClient() {
        return this.writePool.connect();
    }
    async getReadClient() {
        return this.readPool.connect();
    }
    async query(sql, params) {
        const client = await this.readPool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async queryOne(sql, params) {
        const rows = await this.query(sql, params);
        return rows[0] ?? null;
    }
    async execute(sql, params) {
        const client = await this.writePool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rowCount ?? 0;
        }
        finally {
            client.release();
        }
    }
    async transaction(fn) {
        const client = await this.writePool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await Promise.all([this.writePool.end(), this.readPool.end()]);
        this.initialized = false;
        logger.info('Database connections closed');
    }
}
exports.DatabaseManager = DatabaseManager;
let dbManager = null;
function initializeDatabase(config) {
    if (dbManager) {
        return dbManager;
    }
    dbManager = new DatabaseManager(config);
    return dbManager;
}
function getDatabase() {
    if (!dbManager) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return dbManager;
}
