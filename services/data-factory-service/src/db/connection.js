"use strict";
/**
 * Data Factory Service - Database Connection
 *
 * PostgreSQL connection pool management with health checking and graceful shutdown.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
exports.getPool = getPool;
exports.query = query;
exports.getClient = getClient;
exports.transaction = transaction;
exports.healthCheck = healthCheck;
exports.closePool = closePool;
const pg_1 = __importDefault(require("pg"));
const pino_1 = __importDefault(require("pino"));
const { Pool } = pg_1.default;
const logger = (0, pino_1.default)({
    name: 'data-factory-db',
    level: process.env.LOG_LEVEL || 'info',
});
const defaultConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'intelgraph_data_factory',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'devpassword',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    ssl: process.env.DB_SSL === 'true',
};
let pool = null;
function createPool(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    pool = new Pool({
        host: finalConfig.host,
        port: finalConfig.port,
        database: finalConfig.database,
        user: finalConfig.user,
        password: finalConfig.password,
        max: finalConfig.maxConnections,
        idleTimeoutMillis: finalConfig.idleTimeoutMs,
        connectionTimeoutMillis: finalConfig.connectionTimeoutMs,
        ssl: finalConfig.ssl ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('connect', () => {
        logger.debug('New client connected to database');
    });
    pool.on('error', (err) => {
        logger.error({ err }, 'Unexpected error on idle client');
    });
    pool.on('remove', () => {
        logger.debug('Client removed from pool');
    });
    return pool;
}
function getPool() {
    if (!pool) {
        pool = createPool();
    }
    return pool;
}
async function query(text, params) {
    const start = Date.now();
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    logger.debug({
        query: text.slice(0, 100),
        duration,
        rows: result.rowCount,
    }, 'Executed query');
    return result;
}
async function getClient() {
    return getPool().connect();
}
async function transaction(callback) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
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
async function healthCheck() {
    const start = Date.now();
    try {
        await query('SELECT 1');
        const p = getPool();
        return {
            status: 'healthy',
            latency: Date.now() - start,
            poolSize: p.totalCount,
            idleCount: p.idleCount,
            waitingCount: p.waitingCount,
        };
    }
    catch {
        return {
            status: 'unhealthy',
            latency: Date.now() - start,
            poolSize: 0,
            idleCount: 0,
            waitingCount: 0,
        };
    }
}
async function closePool() {
    if (pool) {
        logger.info('Closing database pool');
        await pool.end();
        pool = null;
    }
}
exports.default = {
    createPool,
    getPool,
    query,
    getClient,
    transaction,
    healthCheck,
    closePool,
};
