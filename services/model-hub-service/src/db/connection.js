"use strict";
/**
 * Database connection management for Model Hub Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const logger_js_1 = require("../utils/logger.js");
class DatabaseConnection {
    pool = null;
    isConnected = false;
    config = null;
    async connect(config) {
        if (this.isConnected && this.pool) {
            return;
        }
        this.config = config || {
            host: process.env.MODEL_HUB_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.MODEL_HUB_DB_PORT || process.env.POSTGRES_PORT || '5432'),
            database: process.env.MODEL_HUB_DB_NAME || process.env.POSTGRES_DB || 'intelgraph',
            user: process.env.MODEL_HUB_DB_USER || process.env.POSTGRES_USER || 'intelgraph',
            password: process.env.MODEL_HUB_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
            maxConnections: parseInt(process.env.MODEL_HUB_DB_MAX_CONNECTIONS || '20'),
            idleTimeoutMs: parseInt(process.env.MODEL_HUB_DB_IDLE_TIMEOUT_MS || '30000'),
            connectionTimeoutMs: parseInt(process.env.MODEL_HUB_DB_CONNECTION_TIMEOUT_MS || '10000'),
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        };
        try {
            this.pool = new pg_1.Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                password: this.config.password,
                max: this.config.maxConnections,
                idleTimeoutMillis: this.config.idleTimeoutMs,
                connectionTimeoutMillis: this.config.connectionTimeoutMs,
                ssl: this.config.ssl,
            });
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.isConnected = true;
            logger_js_1.logger.info({
                message: 'Database connection established',
                host: this.config.host,
                database: this.config.database,
                port: this.config.port,
            });
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Failed to connect to database',
                error: error instanceof Error ? error.message : String(error),
                host: this.config.host,
                database: this.config.database,
            });
            throw error;
        }
    }
    async query(text, params, client) {
        if (!this.pool && !client) {
            throw new Error('Database pool not initialized');
        }
        const queryClient = client || this.pool;
        const startTime = Date.now();
        try {
            const result = await queryClient.query(text, params);
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                logger_js_1.logger.warn({
                    message: 'Slow database query',
                    duration,
                    query: text.substring(0, 200),
                });
            }
            return result;
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Database query failed',
                query: text.substring(0, 200),
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }
        return this.pool.connect();
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.logger.error({
                message: 'Database transaction failed',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async healthCheck() {
        try {
            if (!this.pool) {
                return { status: 'disconnected' };
            }
            const result = await this.query('SELECT version(), now() as current_time');
            return {
                status: 'healthy',
                details: {
                    connected: this.isConnected,
                    totalCount: this.pool.totalCount,
                    idleCount: this.pool.idleCount,
                    waitingCount: this.pool.waitingCount,
                    serverInfo: result.rows[0],
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            logger_js_1.logger.info('Database connection closed');
        }
    }
    getPool() {
        return this.pool;
    }
}
exports.db = new DatabaseConnection();
