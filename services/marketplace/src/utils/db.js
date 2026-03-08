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
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    logger_js_1.logger.error('Unexpected database error', { error: err.message });
});
exports.db = {
    query: async (text, params) => {
        const start = Date.now();
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 100) {
            logger_js_1.logger.warn('Slow query', { text, duration, rows: result.rowCount });
        }
        return result;
    },
    getClient: async () => {
        const client = await pool.connect();
        return client;
    },
    // Transaction helper
    transaction: async (fn) => {
        const client = await pool.connect();
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
    },
};
