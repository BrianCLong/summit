"use strict";
/**
 * Database Connection Management
 *
 * Handles connections to PostgreSQL and Neo4j databases
 * with health checking and graceful shutdown.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseConnections = void 0;
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const redis_1 = require("redis");
const logger_js_1 = require("../utils/logger.js");
const config_js_1 = require("../utils/config.js");
/**
 * Database connection manager
 */
class DatabaseConnections {
    _pgPool = null;
    _neo4jDriver = null;
    _redisClient = null;
    _isConnected = false;
    /**
     * Get PostgreSQL pool
     */
    get postgres() {
        if (!this._pgPool) {
            throw new Error('PostgreSQL not connected');
        }
        return this._pgPool;
    }
    /**
     * Get Neo4j driver
     */
    get neo4j() {
        return this._neo4jDriver || undefined;
    }
    /**
     * Get Redis client
     */
    get redis() {
        return this._redisClient || undefined;
    }
    /**
     * Check if connected
     */
    get isConnected() {
        return this._isConnected;
    }
    /**
     * Connect to all databases
     */
    async connect() {
        logger_js_1.logger.info('Connecting to databases...');
        // Connect to PostgreSQL (required)
        await this.connectPostgres();
        // Connect to Neo4j (optional)
        await this.connectNeo4j();
        // Connect to Redis (optional)
        await this.connectRedis();
        this._isConnected = true;
        logger_js_1.logger.info('Database connections established');
    }
    /**
     * Connect to PostgreSQL
     */
    async connectPostgres() {
        const pgConfig = config_js_1.config.database.postgres;
        this._pgPool = new pg_1.Pool({
            host: pgConfig.host,
            port: pgConfig.port,
            database: pgConfig.database,
            user: pgConfig.user,
            password: pgConfig.password,
            max: pgConfig.maxConnections,
            idleTimeoutMillis: pgConfig.idleTimeoutMs,
            connectionTimeoutMillis: 10000,
        });
        // Test connection
        try {
            const client = await this._pgPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger_js_1.logger.info('PostgreSQL connected successfully');
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'PostgreSQL connection failed');
            throw new Error('Failed to connect to PostgreSQL');
        }
        // Handle pool errors
        this._pgPool.on('error', (err) => {
            logger_js_1.logger.error({ error: err }, 'PostgreSQL pool error');
        });
    }
    /**
     * Connect to Neo4j
     */
    async connectNeo4j() {
        const neo4jConfig = config_js_1.config.database.neo4j;
        if (!neo4jConfig.uri || !neo4jConfig.password) {
            logger_js_1.logger.warn('Neo4j credentials not configured, skipping');
            return;
        }
        try {
            this._neo4jDriver = neo4j_driver_1.default.driver(neo4jConfig.uri, neo4j_driver_1.default.auth.basic(neo4jConfig.username, neo4jConfig.password), {
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 10000,
            });
            // Test connection
            const session = this._neo4jDriver.session();
            await session.run('RETURN 1');
            await session.close();
            logger_js_1.logger.info('Neo4j connected successfully');
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Neo4j connection failed, graph queries will use PostgreSQL fallback');
            this._neo4jDriver = null;
        }
    }
    /**
     * Connect to Redis
     */
    async connectRedis() {
        const redisConfig = config_js_1.config.database.redis;
        if (!redisConfig.host) {
            logger_js_1.logger.warn('Redis not configured, caching disabled');
            return;
        }
        try {
            this._redisClient = (0, redis_1.createClient)({
                socket: {
                    host: redisConfig.host,
                    port: redisConfig.port,
                },
                password: redisConfig.password,
                database: redisConfig.db,
            });
            this._redisClient.on('error', (err) => {
                logger_js_1.logger.error({ error: err }, 'Redis client error');
            });
            await this._redisClient.connect();
            logger_js_1.logger.info('Redis connected successfully');
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Redis connection failed, caching disabled');
            this._redisClient = null;
        }
    }
    /**
     * Check health of all database connections
     */
    async checkHealth() {
        const health = {
            postgres: 'unavailable',
            neo4j: 'unavailable',
            redis: 'unavailable',
        };
        // Check PostgreSQL
        if (this._pgPool) {
            try {
                await this._pgPool.query('SELECT 1');
                health.postgres = 'healthy';
            }
            catch {
                health.postgres = 'unhealthy';
            }
        }
        // Check Neo4j
        if (this._neo4jDriver) {
            try {
                const session = this._neo4jDriver.session();
                await session.run('RETURN 1');
                await session.close();
                health.neo4j = 'healthy';
            }
            catch {
                health.neo4j = 'unhealthy';
            }
        }
        // Check Redis
        if (this._redisClient) {
            try {
                await this._redisClient.ping();
                health.redis = 'healthy';
            }
            catch {
                health.redis = 'unhealthy';
            }
        }
        return health;
    }
    /**
     * Execute a PostgreSQL query
     */
    async query(text, params) {
        if (!this._pgPool) {
            throw new Error('PostgreSQL not connected');
        }
        return this._pgPool.query(text, params);
    }
    /**
     * Execute a query within a transaction
     */
    async transaction(callback) {
        if (!this._pgPool) {
            throw new Error('PostgreSQL not connected');
        }
        const client = await this._pgPool.connect();
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
    /**
     * Execute a Neo4j query
     */
    async cypherQuery(cypher, params) {
        if (!this._neo4jDriver) {
            throw new Error('Neo4j not connected');
        }
        const session = this._neo4jDriver.session();
        try {
            const result = await session.run(cypher, params);
            return result.records.map(record => record.toObject());
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get value from Redis cache
     */
    async cacheGet(key) {
        if (!this._redisClient) {
            return null;
        }
        try {
            const value = await this._redisClient.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Set value in Redis cache
     */
    async cacheSet(key, value, ttlSeconds = 300) {
        if (!this._redisClient) {
            return;
        }
        try {
            await this._redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        }
        catch (error) {
            logger_js_1.logger.warn({ error, key }, 'Cache set failed');
        }
    }
    /**
     * Delete value from Redis cache
     */
    async cacheDelete(key) {
        if (!this._redisClient) {
            return;
        }
        try {
            await this._redisClient.del(key);
        }
        catch (error) {
            logger_js_1.logger.warn({ error, key }, 'Cache delete failed');
        }
    }
    /**
     * Gracefully close all connections
     */
    async disconnect() {
        logger_js_1.logger.info('Disconnecting from databases...');
        if (this._pgPool) {
            await this._pgPool.end();
            this._pgPool = null;
            logger_js_1.logger.info('PostgreSQL disconnected');
        }
        if (this._neo4jDriver) {
            await this._neo4jDriver.close();
            this._neo4jDriver = null;
            logger_js_1.logger.info('Neo4j disconnected');
        }
        if (this._redisClient) {
            await this._redisClient.quit();
            this._redisClient = null;
            logger_js_1.logger.info('Redis disconnected');
        }
        this._isConnected = false;
        logger_js_1.logger.info('All database connections closed');
    }
}
exports.DatabaseConnections = DatabaseConnections;
// Singleton instance
exports.db = new DatabaseConnections();
