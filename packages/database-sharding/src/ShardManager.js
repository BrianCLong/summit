"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardManager = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const ShardConnectionPool_1 = require("./ShardConnectionPool");
const logger = (0, pino_1.default)({ name: 'ShardManager' });
const tracer = api_1.trace.getTracer('database-sharding');
/**
 * Manages database shards, connection pools, and health monitoring
 */
class ShardManager {
    config;
    shards = new Map();
    connectionPools = new Map();
    metrics = new Map();
    healthCheckInterval;
    constructor(config) {
        this.config = config;
        this.initializeShards();
        this.startHealthChecks();
    }
    initializeShards() {
        const span = tracer.startSpan('ShardManager.initializeShards');
        try {
            for (const shard of this.config.shards) {
                this.shards.set(shard.id, shard);
                const pool = new ShardConnectionPool_1.ShardConnectionPool(shard);
                this.connectionPools.set(shard.id, pool);
                this.metrics.set(shard.id, {
                    shardId: shard.id,
                    queryCount: 0,
                    errorCount: 0,
                    avgLatency: 0,
                    p95Latency: 0,
                    p99Latency: 0,
                    activeConnections: 0,
                    queuedQueries: 0,
                });
                logger.info({ shardId: shard.id, name: shard.name }, 'Shard initialized');
            }
            span.setAttributes({
                'shard.count': this.shards.size,
                'strategy': this.config.strategy,
            });
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Get shard configuration by ID
     */
    getShard(shardId) {
        return this.shards.get(shardId);
    }
    /**
     * Get all shards
     */
    getAllShards() {
        return Array.from(this.shards.values());
    }
    /**
     * Get connection pool for a shard
     */
    getConnectionPool(shardId) {
        return this.connectionPools.get(shardId);
    }
    /**
     * Get metrics for a shard
     */
    getMetrics(shardId) {
        return this.metrics.get(shardId);
    }
    /**
     * Get metrics for all shards
     */
    getAllMetrics() {
        return Array.from(this.metrics.values());
    }
    /**
     * Update metrics for a shard
     */
    updateMetrics(shardId, updates) {
        const current = this.metrics.get(shardId);
        if (current) {
            this.metrics.set(shardId, { ...current, ...updates });
        }
    }
    /**
     * Add a new shard dynamically
     */
    async addShard(shard) {
        const span = tracer.startSpan('ShardManager.addShard');
        try {
            if (this.shards.has(shard.id)) {
                throw new Error(`Shard ${shard.id} already exists`);
            }
            this.shards.set(shard.id, shard);
            const pool = new ShardConnectionPool_1.ShardConnectionPool(shard);
            await pool.initialize();
            this.connectionPools.set(shard.id, pool);
            this.metrics.set(shard.id, {
                shardId: shard.id,
                queryCount: 0,
                errorCount: 0,
                avgLatency: 0,
                p95Latency: 0,
                p99Latency: 0,
                activeConnections: 0,
                queuedQueries: 0,
            });
            logger.info({ shardId: shard.id, name: shard.name }, 'Shard added dynamically');
            span.setAttributes({ 'shard.id': shard.id });
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Remove a shard (drain connections first)
     */
    async removeShard(shardId) {
        const span = tracer.startSpan('ShardManager.removeShard');
        try {
            const pool = this.connectionPools.get(shardId);
            if (pool) {
                await pool.drain();
                this.connectionPools.delete(shardId);
            }
            this.shards.delete(shardId);
            this.metrics.delete(shardId);
            logger.info({ shardId }, 'Shard removed');
            span.setAttributes({ 'shard.id': shardId });
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Health check for all shards
     */
    async checkHealth() {
        const checks = Array.from(this.connectionPools.entries()).map(async ([shardId, pool]) => {
            try {
                const isHealthy = await pool.healthCheck();
                if (!isHealthy) {
                    logger.warn({ shardId }, 'Shard health check failed');
                }
                return { shardId, healthy: isHealthy };
            }
            catch (error) {
                logger.error({ shardId, error }, 'Health check error');
                return { shardId, healthy: false };
            }
        });
        await Promise.all(checks);
    }
    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth().catch((error) => {
                logger.error({ error }, 'Health check interval error');
            });
        }, 30000); // Every 30 seconds
    }
    /**
     * Stop health checks and close all connections
     */
    async shutdown() {
        const span = tracer.startSpan('ShardManager.shutdown');
        try {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }
            const drainPromises = Array.from(this.connectionPools.values()).map((pool) => pool.drain());
            await Promise.all(drainPromises);
            logger.info('ShardManager shutdown complete');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Rebalance data across shards (for range-based sharding)
     */
    async rebalance() {
        const span = tracer.startSpan('ShardManager.rebalance');
        try {
            // Implementation would depend on strategy
            // This is a placeholder for rebalancing logic
            logger.info('Starting shard rebalancing');
            // For hash-based: add consistent hashing virtual nodes
            // For range-based: split ranges and migrate data
            // For geographic: redistribute based on load
            logger.info('Shard rebalancing complete');
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
}
exports.ShardManager = ShardManager;
