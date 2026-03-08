"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = __importDefault(require("pg"));
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const { Pool } = pg_1.default;
class Database {
    pool = null;
    isConnected = false;
    async connect(dbConfig) {
        if (this.isConnected && this.pool) {
            return;
        }
        const poolConfig = {
            host: dbConfig?.host ?? config_js_1.config.postgres.host,
            port: dbConfig?.port ?? config_js_1.config.postgres.port,
            database: dbConfig?.database ?? config_js_1.config.postgres.database,
            user: dbConfig?.user ?? config_js_1.config.postgres.user,
            password: dbConfig?.password ?? config_js_1.config.postgres.password,
            max: dbConfig?.max ?? config_js_1.config.postgres.maxConnections,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        };
        this.pool = new Pool(poolConfig);
        // Test connection
        const client = await this.pool.connect();
        try {
            await client.query('SELECT NOW()');
            this.isConnected = true;
            logger_js_1.logger.info({ host: poolConfig.host, database: poolConfig.database }, 'Database connected');
        }
        finally {
            client.release();
        }
        // Handle pool errors
        this.pool.on('error', (err) => {
            logger_js_1.logger.error({ err }, 'Unexpected database pool error');
        });
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
                logger_js_1.logger.warn({ query: text.substring(0, 100), duration }, 'Slow query detected');
            }
            return result;
        }
        catch (error) {
            logger_js_1.logger.error({ query: text.substring(0, 100), error }, 'Query failed');
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
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            logger_js_1.logger.info('Database disconnected');
        }
    }
    async isHealthy() {
        if (!this.pool || !this.isConnected) {
            return false;
        }
        try {
            await this.pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.db = new Database();
