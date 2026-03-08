"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePool = initializePool;
exports.getPool = getPool;
exports.query = query;
exports.getClient = getClient;
exports.transaction = transaction;
exports.closePool = closePool;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'postgres' });
let pool = null;
function getDefaultConfig() {
    return {
        host: process.env.CONFIG_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.CONFIG_DB_PORT || process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.CONFIG_DB_NAME ||
            process.env.POSTGRES_DB ||
            'intelgraph_config',
        user: process.env.CONFIG_DB_USER || process.env.POSTGRES_USER || 'intelgraph',
        password: process.env.CONFIG_DB_PASSWORD ||
            process.env.POSTGRES_PASSWORD ||
            'devpassword',
        maxConnections: parseInt(process.env.CONFIG_DB_MAX_CONNECTIONS || '20', 10),
        idleTimeoutMs: parseInt(process.env.CONFIG_DB_IDLE_TIMEOUT_MS || '30000', 10),
        connectionTimeoutMs: parseInt(process.env.CONFIG_DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    };
}
function initializePool(config) {
    if (pool) {
        return pool;
    }
    const fullConfig = { ...getDefaultConfig(), ...config };
    pool = new pg_1.Pool({
        host: fullConfig.host,
        port: fullConfig.port,
        database: fullConfig.database,
        user: fullConfig.user,
        password: fullConfig.password,
        max: fullConfig.maxConnections,
        idleTimeoutMillis: fullConfig.idleTimeoutMs,
        connectionTimeoutMillis: fullConfig.connectionTimeoutMs,
        application_name: 'config-service',
    });
    pool.on('error', (err) => {
        log.error({ err }, 'Unexpected PostgreSQL client error');
    });
    pool.on('connect', () => {
        log.debug('New PostgreSQL client connected');
    });
    log.info({ host: fullConfig.host, database: fullConfig.database }, 'PostgreSQL pool initialized');
    return pool;
}
function getPool() {
    if (!pool) {
        return initializePool();
    }
    return pool;
}
async function query(text, params) {
    const p = getPool();
    const start = Date.now();
    try {
        const result = await p.query(text, params);
        const duration = Date.now() - start;
        log.debug({ duration, rows: result.rowCount, query: text.substring(0, 100) }, 'Query executed');
        return result;
    }
    catch (err) {
        const duration = Date.now() - start;
        log.error({ err, duration, query: text.substring(0, 100) }, 'Query failed');
        throw err;
    }
}
async function getClient() {
    const p = getPool();
    return p.connect();
}
async function transaction(fn) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
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
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        log.info('PostgreSQL pool closed');
    }
}
async function healthCheck() {
    try {
        const result = await query('SELECT 1');
        return result.rowCount === 1;
    }
    catch {
        return false;
    }
}
