"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxRegistry = void 0;
const logger_js_1 = require("./logger.js");
const logger = (0, logger_js_1.createLogger)('SandboxRegistry');
/**
 * Redis-backed sandbox registry for distributed state management
 */
class SandboxRegistry {
    redis;
    keyPrefix = 'sandbox:';
    ttlSeconds = 86400; // 24 hours default
    constructor(redisUrl) {
        this.redis = new ioredis_1.Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.redis.on('error', (err) => {
            logger.error('Redis connection error', { error: err.message });
        });
        this.redis.on('connect', () => {
            logger.info('Connected to Redis');
        });
    }
    async connect() {
        await this.redis.connect();
    }
    async disconnect() {
        await this.redis.quit();
    }
    /**
     * Store sandbox configuration
     */
    async set(config) {
        const key = this.keyPrefix + config.id;
        const ttl = config.expiresAt
            ? Math.floor((config.expiresAt.getTime() - Date.now()) / 1000)
            : this.ttlSeconds;
        await this.redis.setex(key, Math.max(ttl, 60), // Minimum 60 seconds
        JSON.stringify({
            ...config,
            createdAt: config.createdAt.toISOString(),
            expiresAt: config.expiresAt?.toISOString(),
        }));
        // Add to tenant index
        await this.redis.sadd(`tenant:${config.tenantId}:sandboxes`, config.id);
        logger.debug('Sandbox stored', { id: config.id, ttl });
    }
    /**
     * Retrieve sandbox configuration
     */
    async get(id) {
        const data = await this.redis.get(this.keyPrefix + id);
        if (!data) {
            return null;
        }
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        };
    }
    /**
     * Delete sandbox configuration
     */
    async delete(id) {
        const config = await this.get(id);
        if (!config) {
            return false;
        }
        await this.redis.del(this.keyPrefix + id);
        await this.redis.srem(`tenant:${config.tenantId}:sandboxes`, id);
        logger.debug('Sandbox deleted', { id });
        return true;
    }
    /**
     * List sandboxes for a tenant
     */
    async listByTenant(tenantId) {
        return this.redis.smembers(`tenant:${tenantId}:sandboxes`);
    }
    /**
     * Store execution result
     */
    async storeExecution(result) {
        const key = `execution:${result.sandboxId}:${result.executionId}`;
        await this.redis.setex(key, 3600, // 1 hour retention
        JSON.stringify({
            ...result,
            timestamp: result.timestamp.toISOString(),
        }));
        // Add to sandbox execution history (keep last 100)
        const historyKey = `sandbox:${result.sandboxId}:executions`;
        await this.redis.lpush(historyKey, result.executionId);
        await this.redis.ltrim(historyKey, 0, 99);
    }
    /**
     * Get execution history for sandbox
     */
    async getExecutionHistory(sandboxId, limit = 10) {
        return this.redis.lrange(`sandbox:${sandboxId}:executions`, 0, limit - 1);
    }
    /**
     * Get execution result
     */
    async getExecution(sandboxId, executionId) {
        const data = await this.redis.get(`execution:${sandboxId}:${executionId}`);
        if (!data) {
            return null;
        }
        const parsed = JSON.parse(data);
        return {
            ...parsed,
            timestamp: new Date(parsed.timestamp),
        };
    }
    /**
     * Check if sandbox exists
     */
    async exists(id) {
        return (await this.redis.exists(this.keyPrefix + id)) === 1;
    }
    /**
     * Extend sandbox TTL
     */
    async extendTTL(id, additionalSeconds) {
        const ttl = await this.redis.ttl(this.keyPrefix + id);
        if (ttl < 0) {
            return false;
        }
        await this.redis.expire(this.keyPrefix + id, ttl + additionalSeconds);
        return true;
    }
    /**
     * Get registry stats
     */
    async getStats() {
        const keys = await this.redis.keys(`${this.keyPrefix}*`);
        const execKeys = await this.redis.keys('execution:*');
        return {
            activeSandboxes: keys.length,
            totalExecutions: execKeys.length,
        };
    }
}
exports.SandboxRegistry = SandboxRegistry;
