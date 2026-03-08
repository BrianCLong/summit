"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StampedeProtection = void 0;
const async_mutex_1 = require("async-mutex");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'StampedeProtection' });
const tracer = api_1.trace.getTracer('advanced-caching');
/**
 * Prevents cache stampede using distributed locks
 */
class StampedeProtection {
    redis;
    config;
    localLocks = new Map();
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
    }
    /**
     * Execute function with stampede protection
     * Only one process/thread will execute the loader, others will wait
     */
    async execute(key, loader) {
        const span = tracer.startSpan('StampedeProtection.execute');
        const lockKey = `lock:${key}`;
        try {
            // Try to acquire distributed lock
            const lockAcquired = await this.acquireLock(lockKey);
            if (lockAcquired) {
                span.setAttribute('lock.acquired', true);
                logger.debug({ key }, 'Lock acquired, executing loader');
                try {
                    // Execute the loader
                    const result = await loader();
                    // Release lock
                    await this.releaseLock(lockKey);
                    return result;
                }
                catch (error) {
                    await this.releaseLock(lockKey);
                    throw error;
                }
            }
            else {
                span.setAttribute('lock.acquired', false);
                logger.debug({ key }, 'Lock not acquired, waiting...');
                // Wait and retry
                return await this.waitForValue(key, loader);
            }
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
     * Acquire distributed lock using Redis
     */
    async acquireLock(lockKey) {
        const result = await this.redis.set(lockKey, '1', 'PX', this.config.lockTTL, 'NX');
        return result === 'OK';
    }
    /**
     * Release distributed lock
     */
    async releaseLock(lockKey) {
        await this.redis.del(lockKey);
    }
    /**
     * Wait for another process to populate the value
     */
    async waitForValue(key, loader) {
        const lockKey = `lock:${key}`;
        for (let i = 0; i < this.config.maxRetries; i++) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, this.config.lockRetryDelay));
            // Check if lock is released
            const lockExists = await this.redis.exists(lockKey);
            if (!lockExists) {
                // Lock released, try to get the value from cache or acquire lock
                const lockAcquired = await this.acquireLock(lockKey);
                if (lockAcquired) {
                    try {
                        const result = await loader();
                        await this.releaseLock(lockKey);
                        return result;
                    }
                    catch (error) {
                        await this.releaseLock(lockKey);
                        throw error;
                    }
                }
            }
        }
        // Timeout: execute anyway (fallback)
        logger.warn({ key }, 'Stampede protection timeout, executing anyway');
        return await loader();
    }
    /**
     * Get local mutex for in-process synchronization
     */
    getLocalMutex(key) {
        if (!this.localLocks.has(key)) {
            this.localLocks.set(key, new async_mutex_1.Mutex());
        }
        return this.localLocks.get(key);
    }
    /**
     * Execute with local mutex (for single-process stampede prevention)
     */
    async executeLocal(key, loader) {
        const mutex = this.getLocalMutex(key);
        const release = await mutex.acquire();
        try {
            return await loader();
        }
        finally {
            release();
        }
    }
    /**
     * Clean up expired local locks
     */
    cleanup() {
        this.localLocks.clear();
    }
}
exports.StampedeProtection = StampedeProtection;
