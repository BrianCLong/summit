"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgresConnection = void 0;
const pg_1 = require("pg");
const logger_js_1 = require("../utils/logger.js");
class PostgreSQLConnection {
    pool = null;
    isConnected = false;
    async connect() {
        if (this.isConnected && this.pool)
            return;
        const config = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'intelgraph',
            user: process.env.POSTGRES_USER || 'intelgraph',
            password: process.env.POSTGRES_PASSWORD,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        };
        try {
            this.pool = new pg_1.Pool(config);
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.isConnected = true;
            logger_js_1.logger.info('PostgreSQL connected');
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'PostgreSQL connection failed');
            throw error;
        }
    }
    async query(text, params) {
        if (!this.pool)
            throw new Error('Database not connected');
        return this.pool.query(text, params);
    }
    async transaction(callback) {
        if (!this.pool)
            throw new Error('Database not connected');
        const client = await this.pool.connect();
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
    async healthCheck() {
        try {
            await this.query('SELECT 1');
            return { status: 'healthy' };
        }
        catch {
            return { status: 'unhealthy' };
        }
    }
}
exports.postgresConnection = new PostgreSQLConnection();
