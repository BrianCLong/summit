"use strict";
/**
 * Redis Instrumentation
 * Wraps Redis operations with metrics and tracing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstrumentedRedisCache = void 0;
exports.instrumentRedisClient = instrumentRedisClient;
const enhanced_metrics_js_1 = require("./enhanced-metrics.js");
const tracer_js_1 = require("./tracer.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'redis-instrumentation' });
// Track cache hits/misses for ratio calculation
const cacheStats = new Map();
/**
 * Instrument a Redis client with observability
 */
function instrumentRedisClient(client, clientType = 'default') {
    // Track connection status
    client.on('connect', () => {
        enhanced_metrics_js_1.redisConnectionsActive.inc({ client_type: clientType });
        logger.info({ clientType }, 'Redis client connected');
    });
    client.on('close', () => {
        enhanced_metrics_js_1.redisConnectionsActive.dec({ client_type: clientType });
        logger.info({ clientType }, 'Redis client disconnected');
    });
    client.on('error', (error) => {
        logger.error({ clientType, error: error.message }, 'Redis client error');
    });
    // Wrap command execution with metrics
    const originalSendCommand = client.sendCommand.bind(client);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.sendCommand = async function (command, ...args) {
        const commandName = command?.name?.toLowerCase() || 'unknown';
        const startTime = Date.now();
        const tracer = (0, tracer_js_1.getTracer)();
        try {
            // Trace Redis operation
            const result = await tracer.traceCacheOperation(commandName, command?.args?.[0] || 'unknown', async () => {
                return originalSendCommand(command, ...args);
            });
            const duration = (Date.now() - startTime) / 1000;
            // Record metrics
            enhanced_metrics_js_1.redisOperationDuration.observe({ operation: commandName, status: 'success' }, duration);
            enhanced_metrics_js_1.redisCommandsTotal.inc({ command: commandName, status: 'success' });
            // Track cache hits/misses for GET operations
            if (commandName === 'get') {
                const cacheName = 'default';
                const stats = cacheStats.get(cacheName) || { hits: 0, misses: 0 };
                if (result !== null && result !== undefined) {
                    enhanced_metrics_js_1.redisCacheHits.inc({ operation: 'get', cache_name: cacheName });
                    stats.hits++;
                }
                else {
                    enhanced_metrics_js_1.redisCacheMisses.inc({ operation: 'get', cache_name: cacheName });
                    stats.misses++;
                }
                cacheStats.set(cacheName, stats);
                (0, enhanced_metrics_js_1.updateCacheHitRatio)(cacheName, stats.hits, stats.misses);
            }
            return result;
        }
        catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            enhanced_metrics_js_1.redisOperationDuration.observe({ operation: commandName, status: 'error' }, duration);
            enhanced_metrics_js_1.redisCommandsTotal.inc({ command: commandName, status: 'error' });
            logger.error({ commandName, error: error.message }, 'Redis command failed');
            throw error;
        }
    };
    return client;
}
/**
 * Create instrumented Redis wrapper with high-level operations
 */
class InstrumentedRedisCache {
    client;
    cacheName;
    constructor(client, cacheName = 'default') {
        this.client = client;
        this.cacheName = cacheName;
    }
    async get(key) {
        const tracer = (0, tracer_js_1.getTracer)();
        const startTime = Date.now();
        return tracer.traceCacheOperation('get', key, async () => {
            try {
                const value = await this.client.get(key);
                const duration = (Date.now() - startTime) / 1000;
                const stats = cacheStats.get(this.cacheName) || { hits: 0, misses: 0 };
                if (value !== null) {
                    enhanced_metrics_js_1.redisCacheHits.inc({ operation: 'get', cache_name: this.cacheName });
                    stats.hits++;
                }
                else {
                    enhanced_metrics_js_1.redisCacheMisses.inc({ operation: 'get', cache_name: this.cacheName });
                    stats.misses++;
                }
                cacheStats.set(this.cacheName, stats);
                (0, enhanced_metrics_js_1.updateCacheHitRatio)(this.cacheName, stats.hits, stats.misses);
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'get', status: 'success' }, duration);
                return value;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'get', status: 'error' }, duration);
                throw error;
            }
        });
    }
    async set(key, value, ttl) {
        const tracer = (0, tracer_js_1.getTracer)();
        const startTime = Date.now();
        return tracer.traceCacheOperation('set', key, async () => {
            try {
                const result = ttl
                    ? await this.client.set(key, value, 'EX', ttl)
                    : await this.client.set(key, value);
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'set', status: 'success' }, duration);
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'set', status: 'error' }, duration);
                throw error;
            }
        });
    }
    async del(key) {
        const tracer = (0, tracer_js_1.getTracer)();
        const startTime = Date.now();
        return tracer.traceCacheOperation('del', key, async () => {
            try {
                const result = await this.client.del(key);
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'del', status: 'success' }, duration);
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'del', status: 'error' }, duration);
                throw error;
            }
        });
    }
    async exists(key) {
        const tracer = (0, tracer_js_1.getTracer)();
        const startTime = Date.now();
        return tracer.traceCacheOperation('exists', key, async () => {
            try {
                const result = await this.client.exists(key);
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'exists', status: 'success' }, duration);
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.redisOperationDuration.observe({ operation: 'exists', status: 'error' }, duration);
                throw error;
            }
        });
    }
    async ttl(key) {
        const result = await this.client.ttl(key);
        return result;
    }
    /**
     * Get cache statistics for this cache instance
     */
    getCacheStats() {
        const stats = cacheStats.get(this.cacheName) || { hits: 0, misses: 0 };
        const total = stats.hits + stats.misses;
        const hitRatio = total > 0 ? stats.hits / total : 0;
        return {
            hits: stats.hits,
            misses: stats.misses,
            hitRatio,
        };
    }
}
exports.InstrumentedRedisCache = InstrumentedRedisCache;
