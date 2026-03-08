"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = __importDefault(require("pg"));
const logger_js_1 = require("./logger.js");
const { Pool } = pg_1.default;
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'intelgraph',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.POSTGRES_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
    logger_js_1.logger.error('Unexpected database pool error', { error: err.message });
});
pool.on('connect', () => {
    logger_js_1.logger.debug('New database connection established');
});
exports.db = {
    /**
     * Execute a query with parameters
     */
    query: async (text, params) => {
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            if (duration > 100) {
                logger_js_1.logger.warn('Slow query detected', {
                    duration,
                    query: text.substring(0, 200),
                });
            }
            return {
                rows: result.rows,
                rowCount: result.rowCount,
            };
        }
        catch (error) {
            logger_js_1.logger.error('Query execution failed', {
                query: text.substring(0, 200),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    },
    /**
     * Execute a transaction with multiple queries
     */
    transaction: async (fn) => {
        const client = await pool.connect();
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
    },
    /**
     * Get a client for manual transaction management
     */
    getClient: async () => {
        return pool.connect();
    },
    /**
     * Close all connections
     */
    end: async () => {
        await pool.end();
        logger_js_1.logger.info('Database pool closed');
    },
    /**
     * Check if database is healthy
     */
    healthCheck: async () => {
        try {
            await pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    },
};
