"use strict";
/**
 * CompanyOS Tenant API - PostgreSQL Connection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.healthCheck = healthCheck;
exports.closePool = closePool;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:devpassword@localhost:5432/intelgraph',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('[tenant-api] Unexpected PostgreSQL error:', err);
});
async function healthCheck() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    }
    catch (error) {
        console.error('[tenant-api] PostgreSQL health check failed:', error);
        return false;
    }
}
async function closePool() {
    await pool.end();
}
