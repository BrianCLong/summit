"use strict";
/**
 * Database Connection Pool
 * PostgreSQL connection management for KB service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDBConfig = getDBConfig;
exports.getPool = getPool;
exports.query = query;
exports.transaction = transaction;
exports.closePool = closePool;
exports.healthCheck = healthCheck;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
let pool = null;
function getDBConfig() {
    return {
        host: process.env.KB_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.KB_DB_PORT || process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.KB_DB_NAME || process.env.POSTGRES_DB || 'intelgraph',
        user: process.env.KB_DB_USER || process.env.POSTGRES_USER || 'postgres',
        password: process.env.KB_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
        max: parseInt(process.env.KB_DB_POOL_SIZE || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}
function getPool() {
    if (!pool) {
        const config = getDBConfig();
        pool = new Pool(config);
        pool.on('error', (err) => {
            console.error('Unexpected database pool error:', err);
        });
    }
    return pool;
}
async function query(text, params) {
    const client = await getPool().connect();
    try {
        return await client.query(text, params);
    }
    finally {
        client.release();
    }
}
async function transaction(callback) {
    const client = await getPool().connect();
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
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
async function healthCheck() {
    try {
        const result = await query('SELECT 1 AS health');
        return result.rows.length === 1;
    }
    catch {
        return false;
    }
}
