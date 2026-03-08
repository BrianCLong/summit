"use strict";
/**
 * Database Connection Manager
 * PostgreSQL connection for ESG Reporting Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = __importDefault(require("pg"));
const logger_js_1 = require("./logger.js");
const { Pool } = pg_1.default;
class Database {
    pool = null;
    isConnected = false;
    async connect(config) {
        if (this.isConnected && this.pool) {
            logger_js_1.logger.debug('Database already connected');
            return;
        }
        const dbConfig = {
            host: config?.host || process.env.POSTGRES_HOST || 'localhost',
            port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
            database: config?.database || process.env.POSTGRES_DB || 'summit_dev',
            user: config?.user || process.env.POSTGRES_USER || 'summit',
            password: config?.password || process.env.POSTGRES_PASSWORD || 'devpassword',
            ssl: process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
            max: config?.max || 20,
            idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config?.connectionTimeoutMillis || 10000,
        };
        try {
            this.pool = new Pool(dbConfig);
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.isConnected = true;
            logger_js_1.logger.info({ host: dbConfig.host, database: dbConfig.database }, 'Database connected');
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Failed to connect to database');
            throw error;
        }
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            logger_js_1.logger.info('Database disconnected');
        }
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (duration > 1000) {
                logger_js_1.logger.warn({ duration, query: text.substring(0, 100) }, 'Slow query detected');
            }
            else {
                logger_js_1.logger.debug({ duration, rows: result.rowCount }, 'Query executed');
            }
            return result;
        }
        catch (error) {
            logger_js_1.logger.error({ error, query: text.substring(0, 100) }, 'Query failed');
            throw error;
        }
    }
    async transaction(callback) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
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
    get connected() {
        return this.isConnected;
    }
    getPool() {
        return this.pool;
    }
}
exports.db = new Database();
exports.default = exports.db;
