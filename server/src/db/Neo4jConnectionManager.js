"use strict";
// @ts-nocheck
/**
 * Enhanced Neo4j Connection Manager
 *
 * Optimized connection pooling, query management, and resource efficiency
 * for Neo4j graph database operations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jConnectionManager = void 0;
exports.initializeNeo4jConnectionManager = initializeNeo4jConnectionManager;
exports.getNeo4jConnectionManager = getNeo4jConnectionManager;
exports.closeNeo4jConnectionManager = closeNeo4jConnectionManager;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pino_1 = __importDefault(require("pino"));
const node_perf_hooks_1 = require("node:perf_hooks");
const logger = pino_1.default({ name: 'neo4j-connection-manager' });
class Neo4jConnectionManager {
    config;
    driver = null;
    queryStats = [];
    maxQueryStatsSize = 1000;
    slowQueryThreshold = 2000; // 2 seconds
    queryTimeout = 30000; // 30 seconds default
    connectionLeakDetectionTimeout = 60000; // 1 minute
    activeSessionTracking = new Map();
    constructor(config) {
        this.config = config;
        this.initializeDriver();
        this.startHealthChecks();
        this.startLeakDetection();
    }
    /**
     * Initialize Neo4j driver with optimized connection pooling
     */
    initializeDriver() {
        try {
            const driverConfig = {
                maxConnectionPoolSize: this.config.maxConnectionPoolSize || 50,
                maxConnectionLifetime: this.config.maxConnectionLifetime || 3600000, // 1 hour
                connectionAcquisitionTimeout: this.config.connectionAcquisitionTimeout || 60000,
                connectionTimeout: this.config.connectionTimeout || 30000,
                maxTransactionRetryTime: this.config.maxTransactionRetryTime || 30000,
                // Enable TCP keepalive to detect dead connections
                socketKeepAlive: true,
                // Optimize for performance
                disableLosslessIntegers: true, // Use native JavaScript numbers
                // Logging configuration
                logging: this.config.logging || {
                    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
                    logger: (level, message) => {
                        if (level === 'error') {
                            logger.error(message);
                        }
                        else if (level === 'warn') {
                            logger.warn(message);
                        }
                        else {
                            logger.debug(message);
                        }
                    },
                },
            };
            this.driver = neo4j_driver_1.default.driver(this.config.uri, neo4j_driver_1.default.auth.basic(this.config.username, this.config.password), driverConfig);
            // Verify connectivity
            this.driver.verifyConnectivity()
                .then(() => {
                logger.info('Neo4j connection pool initialized successfully');
            })
                .catch((error) => {
                logger.error({ error }, 'Failed to verify Neo4j connectivity');
                throw error;
            });
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize Neo4j driver');
            throw error;
        }
    }
    /**
     * Execute a read query with automatic retry and timeout
     */
    async executeRead(query, params = {}, options = {}) {
        return this.executeQuery(query, params, 'READ', options);
    }
    /**
     * Execute a write query with automatic retry and timeout
     */
    async executeWrite(query, params = {}, options = {}) {
        return this.executeQuery(query, params, 'WRITE', options);
    }
    /**
     * Execute a query with optimized session management
     */
    async executeQuery(query, params, accessMode, options = {}) {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized');
        }
        const queryId = this.generateQueryId();
        const startTime = node_perf_hooks_1.performance.now();
        let session = null;
        try {
            const sessionConfig = {
                defaultAccessMode: accessMode === 'READ'
                    ? neo4j_driver_1.default.session.READ
                    : neo4j_driver_1.default.session.WRITE,
                database: options.database || process.env.NEO4J_DATABASE || 'neo4j',
            };
            session = this.driver.session(sessionConfig);
            this.trackSession(queryId, session, query);
            // Execute query with timeout
            const timeout = options.timeout || this.queryTimeout;
            const result = await Promise.race([
                session.run(query, params),
                this.createTimeout(timeout, queryId),
            ]);
            const duration = node_perf_hooks_1.performance.now() - startTime;
            const records = result.records.map((r) => r.toObject());
            // Record stats
            this.recordQueryStats({
                queryId,
                query,
                params,
                duration,
                recordCount: records.length,
                timestamp: new Date(),
                success: true,
            });
            // Warn about slow queries
            if (duration > this.slowQueryThreshold) {
                logger.warn({
                    queryId,
                    duration,
                    query: this.truncateQuery(query),
                    recordCount: records.length,
                }, 'Slow Neo4j query detected');
            }
            return records;
        }
        catch (error) {
            const duration = node_perf_hooks_1.performance.now() - startTime;
            this.recordQueryStats({
                queryId,
                query,
                params,
                duration,
                recordCount: 0,
                timestamp: new Date(),
                success: false,
                error: error.message,
            });
            logger.error({
                error,
                queryId,
                query: this.truncateQuery(query),
                duration,
            }, 'Neo4j query failed');
            throw error;
        }
        finally {
            if (session) {
                await session.close();
                this.untrackSession(queryId);
            }
        }
    }
    /**
     * Execute a transaction with multiple queries
     */
    async executeTransaction(transactionWork, accessMode = 'WRITE', options = {}) {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized');
        }
        const queryId = this.generateQueryId();
        const startTime = node_perf_hooks_1.performance.now();
        let session = null;
        try {
            const sessionConfig = {
                defaultAccessMode: accessMode === 'READ'
                    ? neo4j_driver_1.default.session.READ
                    : neo4j_driver_1.default.session.WRITE,
                database: options.database || process.env.NEO4J_DATABASE || 'neo4j',
            };
            session = this.driver.session(sessionConfig);
            this.trackSession(queryId, session, 'TRANSACTION');
            const timeout = options.timeout || this.queryTimeout;
            let result;
            if (accessMode === 'READ') {
                result = await Promise.race([
                    session.executeRead(transactionWork),
                    this.createTimeout(timeout, queryId),
                ]);
            }
            else {
                result = await Promise.race([
                    session.executeWrite(transactionWork),
                    this.createTimeout(timeout, queryId),
                ]);
            }
            const duration = node_perf_hooks_1.performance.now() - startTime;
            this.recordQueryStats({
                queryId,
                query: 'TRANSACTION',
                params: {},
                duration,
                recordCount: 0,
                timestamp: new Date(),
                success: true,
            });
            return result;
        }
        catch (error) {
            const duration = node_perf_hooks_1.performance.now() - startTime;
            this.recordQueryStats({
                queryId,
                query: 'TRANSACTION',
                params: {},
                duration,
                recordCount: 0,
                timestamp: new Date(),
                success: false,
                error: error.message,
            });
            logger.error({ error, queryId, duration }, 'Neo4j transaction failed');
            throw error;
        }
        finally {
            if (session) {
                await session.close();
                this.untrackSession(queryId);
            }
        }
    }
    /**
     * Get health status of connection pool
     */
    async getHealth() {
        const recentQueries = this.queryStats.slice(-100);
        const averageQueryTime = recentQueries.length > 0
            ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
            : 0;
        const slowQueries = recentQueries.filter(q => q.duration > this.slowQueryThreshold).length;
        const failedQueries = recentQueries.filter(q => !q.success).length;
        const lastError = recentQueries.find(q => !q.success)?.error;
        let healthy = true;
        let serverInfo = null;
        try {
            if (this.driver) {
                await this.driver.verifyConnectivity();
                serverInfo = await this.driver.getServerInfo();
            }
        }
        catch (error) {
            healthy = false;
            logger.error({ error }, 'Neo4j health check failed');
        }
        return {
            healthy,
            activeConnections: this.activeSessionTracking.size,
            idleConnections: serverInfo ?
                (this.config.maxConnectionPoolSize || 50) - this.activeSessionTracking.size :
                0,
            totalConnections: this.config.maxConnectionPoolSize || 50,
            queuedRequests: 0, // Not directly available from driver
            averageQueryTime,
            slowQueries,
            failedQueries,
            lastError,
        };
    }
    /**
     * Get query statistics
     */
    getQueryStatistics() {
        const total = this.queryStats.length;
        const successful = this.queryStats.filter(q => q.success).length;
        const failed = total - successful;
        const durations = this.queryStats.map(q => q.duration).sort((a, b) => a - b);
        const averageDuration = durations.length > 0
            ? durations.reduce((sum, d) => sum + d, 0) / durations.length
            : 0;
        const p95Index = Math.floor(durations.length * 0.95);
        const p95Duration = durations[p95Index] || 0;
        const slowQueries = this.queryStats.filter(q => q.duration > this.slowQueryThreshold).length;
        return {
            total,
            successful,
            failed,
            averageDuration,
            p95Duration,
            slowQueries,
        };
    }
    /**
     * Get slow queries report
     */
    getSlowQueries(limit = 10) {
        return [...this.queryStats]
            .filter(q => q.duration > this.slowQueryThreshold)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }
    /**
     * Close the driver and clean up resources
     */
    async close() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
            logger.info('Neo4j connection pool closed');
        }
    }
    /**
     * Track active session to detect leaks
     */
    trackSession(queryId, session, query) {
        this.activeSessionTracking.set(queryId, {
            created: new Date(),
            query: this.truncateQuery(query),
        });
    }
    /**
     * Untrack closed session
     */
    untrackSession(queryId) {
        this.activeSessionTracking.delete(queryId);
    }
    /**
     * Create query timeout promise
     */
    createTimeout(ms, queryId) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Neo4j query timeout after ${ms}ms (queryId: ${queryId})`));
            }, ms);
        });
    }
    /**
     * Generate unique query ID
     */
    generateQueryId() {
        return `neo4j-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Record query statistics
     */
    recordQueryStats(stats) {
        this.queryStats.push(stats);
        // Limit stats size
        if (this.queryStats.length > this.maxQueryStatsSize) {
            this.queryStats.shift();
        }
    }
    /**
     * Truncate long queries for logging
     */
    truncateQuery(query, maxLength = 200) {
        if (query.length <= maxLength) {
            return query;
        }
        return query.substring(0, maxLength) + '...';
    }
    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        setInterval(async () => {
            try {
                const health = await this.getHealth();
                if (!health.healthy) {
                    logger.warn({ health }, 'Neo4j connection pool unhealthy');
                }
                if (health.slowQueries > 10) {
                    logger.warn({ slowQueries: health.slowQueries, avgTime: health.averageQueryTime }, 'High number of slow Neo4j queries detected');
                }
            }
            catch (error) {
                logger.error({ error }, 'Health check failed');
            }
        }, 30000); // Every 30 seconds
    }
    /**
     * Start connection leak detection
     */
    startLeakDetection() {
        setInterval(() => {
            const now = Date.now();
            for (const [queryId, info] of this.activeSessionTracking.entries()) {
                const age = now - info.created.getTime();
                if (age > this.connectionLeakDetectionTimeout) {
                    logger.error({
                        queryId,
                        age,
                        query: info.query,
                    }, 'Possible Neo4j session leak detected');
                }
            }
        }, 60000); // Every minute
    }
}
exports.Neo4jConnectionManager = Neo4jConnectionManager;
// Singleton instance
let connectionManager = null;
function initializeNeo4jConnectionManager(config) {
    if (connectionManager) {
        logger.warn('Neo4j connection manager already initialized');
        return connectionManager;
    }
    connectionManager = new Neo4jConnectionManager(config);
    return connectionManager;
}
function getNeo4jConnectionManager() {
    if (!connectionManager) {
        const password = process.env.NEO4J_PASSWORD;
        if (process.env.NODE_ENV === 'production') {
            if (!password) {
                throw new Error('NEO4J_PASSWORD environment variable is required in production');
            }
            if (password === 'devpassword') {
                throw new Error('Security Error: NEO4J_PASSWORD cannot be "devpassword" in production');
            }
        }
        // Initialize with defaults from environment
        connectionManager = new Neo4jConnectionManager({
            uri: process.env.NEO4J_URI || 'bolt://neo4j:7687',
            username: process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j',
            password: password || 'devpassword',
            maxConnectionPoolSize: parseInt(process.env.NEO4J_MAX_POOL_SIZE || '50', 10),
        });
    }
    return connectionManager;
}
async function closeNeo4jConnectionManager() {
    if (connectionManager) {
        await connectionManager.close();
        connectionManager = null;
    }
}
