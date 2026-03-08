"use strict";
/**
 * PostgreSQL database client for scenario registry
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbClient = void 0;
exports.getDbConfig = getDbConfig;
exports.getDbClient = getDbClient;
exports.closeDbClient = closeDbClient;
const pg_1 = __importDefault(require("pg"));
const pino_1 = require("pino");
const { Pool } = pg_1.default;
const logger = (0, pino_1.pino)({ name: 'scenario-registry:db' });
/**
 * Get database configuration from environment
 */
function getDbConfig() {
    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'intelgraph',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
    };
}
/**
 * Database connection pool
 */
class DbClient {
    pool;
    constructor(config) {
        this.pool = new Pool(config);
        this.pool.on('error', (err) => {
            logger.error({ err }, 'Unexpected database pool error');
        });
        this.pool.on('connect', () => {
            logger.debug('New database connection established');
        });
        this.pool.on('remove', () => {
            logger.debug('Database connection removed from pool');
        });
    }
    /**
     * Execute a query
     */
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');
            return result;
        }
        catch (err) {
            logger.error({ err, query: text }, 'Query failed');
            throw err;
        }
    }
    /**
     * Get a client from the pool for transactions
     */
    async getClient() {
        return await this.pool.connect();
    }
    /**
     * Execute a callback within a transaction
     */
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check database health
     */
    async healthCheck() {
        const start = Date.now();
        try {
            await this.query('SELECT 1');
            const latency = Date.now() - start;
            return { healthy: true, latency };
        }
        catch (err) {
            logger.error({ err }, 'Database health check failed');
            return { healthy: false, latency: Date.now() - start };
        }
    }
    /**
     * Close all database connections
     */
    async close() {
        await this.pool.end();
        logger.info('Database connection pool closed');
    }
}
exports.DbClient = DbClient;
/**
 * Singleton database client instance
 */
let dbClientInstance = null;
/**
 * Get or create the database client instance
 */
function getDbClient() {
    if (!dbClientInstance) {
        const config = getDbConfig();
        dbClientInstance = new DbClient(config);
    }
    return dbClientInstance;
}
/**
 * Close the database client instance
 */
async function closeDbClient() {
    if (dbClientInstance) {
        await dbClientInstance.close();
        dbClientInstance = null;
    }
}
