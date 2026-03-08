"use strict";
/**
 * IntelGraph PostgreSQL Database Connection
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgresPool = exports.postgresConnection = exports.PostgreSQLConnection = void 0;
const pg_1 = require("pg");
const logger_js_1 = require("../utils/logger.js");
class PostgreSQLConnection {
    pool = null;
    isConnected = false;
    async connect() {
        if (this.isConnected && this.pool) {
            return;
        }
        const config = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'intelgraph',
            user: process.env.POSTGRES_USER || 'intelgraph',
            password: process.env.POSTGRES_PASSWORD || 'password',
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
            connectionTimeoutMillis: 10000, // How long to wait for a connection
            ssl: process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
        };
        try {
            this.pool = new pg_1.Pool(config);
            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.isConnected = true;
            logger_js_1.logger.info({
                message: 'PostgreSQL connection established',
                host: config.host,
                database: config.database,
                port: config.port,
            });
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'Failed to connect to PostgreSQL',
                error: error instanceof Error ? error.message : String(error),
                host: config.host,
                database: config.database,
            });
            throw error;
        }
    }
    async query(text, params, client) {
        if (!this.pool && !client) {
            throw new Error('PostgreSQL pool not initialized');
        }
        const queryClient = client || this.pool;
        const startTime = Date.now();
        try {
            const result = await queryClient.query(text, params);
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                // Log slow queries
                logger_js_1.logger.warn({
                    message: 'Slow PostgreSQL query',
                    duration,
                    query: text.substring(0, 100),
                    params: params?.slice(0, 5), // Log only first 5 params for security
                });
            }
            return result;
        }
        catch (error) {
            logger_js_1.logger.error({
                message: 'PostgreSQL query failed',
                query: text.substring(0, 100),
                params: params?.slice(0, 5),
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized');
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
                message: 'PostgreSQL transaction failed',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Common query helpers
    async findOne(table, conditions, client) {
        const keys = Object.keys(conditions);
        const values = Object.values(conditions);
        const whereClause = keys
            .map((key, index) => `${key} = $${index + 1}`)
            .join(' AND ');
        const query = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
        const result = await this.query(query, values, client);
        return result.rows[0] || null;
    }
    async findMany(table, conditions = {}, options = {}, client) {
        const keys = Object.keys(conditions);
        const values = Object.values(conditions);
        let query = `SELECT * FROM ${table}`;
        if (keys.length > 0) {
            const whereClause = keys
                .map((key, index) => `${key} = $${index + 1}`)
                .join(' AND ');
            query += ` WHERE ${whereClause}`;
        }
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
        }
        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }
        if (options.offset) {
            query += ` OFFSET ${options.offset}`;
        }
        const result = await this.query(query, values, client);
        return result.rows;
    }
    async insert(table, data, returning = '*', client) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
        const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING ${returning}
    `;
        const result = await this.query(query, values, client);
        return result.rows[0];
    }
    async update(table, data, conditions, returning = '*', client) {
        const dataKeys = Object.keys(data);
        const dataValues = Object.values(data);
        const conditionKeys = Object.keys(conditions);
        const conditionValues = Object.values(conditions);
        const setClause = dataKeys
            .map((key, index) => `${key} = $${index + 1}`)
            .join(', ');
        const whereClause = conditionKeys
            .map((key, index) => `${key} = $${dataKeys.length + index + 1}`)
            .join(' AND ');
        const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING ${returning}
    `;
        const result = await this.query(query, [...dataValues, ...conditionValues], client);
        return result.rows[0] || null;
    }
    async delete(table, conditions, client) {
        const keys = Object.keys(conditions);
        const values = Object.values(conditions);
        const whereClause = keys
            .map((key, index) => `${key} = $${index + 1}`)
            .join(' AND ');
        const query = `DELETE FROM ${table} WHERE ${whereClause}`;
        const result = await this.query(query, values, client);
        return result.rowCount || 0;
    }
    // Health check
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
            logger_js_1.logger.info('PostgreSQL connection closed');
        }
    }
}
exports.PostgreSQLConnection = PostgreSQLConnection;
// Export singleton instance
exports.postgresConnection = new PostgreSQLConnection();
exports.postgresPool = exports.postgresConnection;
// Initialize connection on module load
exports.postgresConnection.connect().catch((error) => {
    logger_js_1.logger.error({
        message: 'Failed to initialize PostgreSQL connection',
        error: error instanceof Error ? error.message : String(error),
    });
});
