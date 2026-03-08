"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInvalidator = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'CacheInvalidator' });
const tracer = api_1.trace.getTracer('advanced-caching');
/**
 * Smart cache invalidation with dependency tracking
 */
class CacheInvalidator {
    cache;
    redis;
    dependencyGraph = new Map();
    tagIndex = new Map();
    constructor(cache, redis) {
        this.cache = cache;
        this.redis = redis;
        if (redis) {
            this.loadDependencyGraph();
        }
    }
    /**
     * Invalidate cache by key
     */
    async invalidate(key, strategy = { type: 'immediate', cascadeToTier: 'all' }) {
        const span = tracer.startSpan('CacheInvalidator.invalidate');
        try {
            if (strategy.type === 'immediate') {
                await this.invalidateImmediate(key);
            }
            else if (strategy.type === 'lazy') {
                await this.invalidateLazy(key, strategy.delay || 60000);
            }
            else if (strategy.type === 'scheduled') {
                await this.scheduleInvalidation(key, strategy.delay || 0);
            }
            // Cascade to dependencies
            const dependents = this.dependencyGraph.get(key);
            if (dependents && dependents.size > 0) {
                await Promise.all(Array.from(dependents).map((dep) => this.invalidate(dep, strategy)));
            }
            span.setAttributes({
                key,
                strategy: strategy.type,
                dependents: dependents?.size || 0,
            });
            logger.debug({ key, strategy: strategy.type }, 'Cache invalidated');
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
     * Invalidate by tag
     */
    async invalidateByTag(tag, strategy) {
        const span = tracer.startSpan('CacheInvalidator.invalidateByTag');
        try {
            const keys = this.tagIndex.get(tag);
            if (!keys || keys.size === 0) {
                return 0;
            }
            await Promise.all(Array.from(keys).map((key) => this.invalidate(key, strategy)));
            span.setAttribute('invalidated.count', keys.size);
            logger.info({ tag, count: keys.size }, 'Invalidated by tag');
            return keys.size;
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
     * Invalidate by pattern
     */
    async invalidateByPattern(pattern) {
        const span = tracer.startSpan('CacheInvalidator.invalidateByPattern');
        try {
            const count = await this.cache.deleteByPattern(pattern);
            span.setAttribute('invalidated.count', count);
            logger.info({ pattern, count }, 'Invalidated by pattern');
            return count;
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
     * Register dependency between cache keys
     */
    registerDependency(key, dependsOn) {
        if (!this.dependencyGraph.has(dependsOn)) {
            this.dependencyGraph.set(dependsOn, new Set());
        }
        this.dependencyGraph.get(dependsOn).add(key);
        // Persist to Redis
        if (this.redis) {
            this.redis.sadd(`cache:deps:${dependsOn}`, key);
        }
        logger.debug({ key, dependsOn }, 'Dependency registered');
    }
    /**
     * Register tag for a cache key
     */
    registerTag(key, tag) {
        if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag).add(key);
        // Persist to Redis
        if (this.redis) {
            this.redis.sadd(`cache:tag:${tag}`, key);
        }
        logger.debug({ key, tag }, 'Tag registered');
    }
    /**
     * Register multiple tags
     */
    registerTags(key, tags) {
        for (const tag of tags) {
            this.registerTag(key, tag);
        }
    }
    /**
     * Get dependencies for a key
     */
    getDependencies(key) {
        const deps = this.dependencyGraph.get(key);
        return deps ? Array.from(deps) : [];
    }
    /**
     * Get keys by tag
     */
    getKeysByTag(tag) {
        const keys = this.tagIndex.get(tag);
        return keys ? Array.from(keys) : [];
    }
    // Private methods
    async invalidateImmediate(key) {
        await this.cache.delete(key);
    }
    async invalidateLazy(key, delay) {
        // Mark for lazy invalidation (will be checked on next access)
        if (this.redis) {
            await this.redis.setex(`cache:lazy:${key}`, Math.ceil(delay / 1000), '1');
        }
    }
    async scheduleInvalidation(key, delay) {
        setTimeout(async () => {
            await this.invalidateImmediate(key);
        }, delay);
    }
    async loadDependencyGraph() {
        if (!this.redis)
            return;
        if (!this.redis) {
            return;
        }
        try {
            // Load dependency graph from Redis
            const depKeys = await this.redis.keys('cache:deps:*');
            for (const depKey of depKeys) {
                const key = depKey.replace('cache:deps:', '');
                const dependents = await this.redis.smembers(depKey);
                this.dependencyGraph.set(key, new Set(dependents));
            }
            // Load tag index
            const tagKeys = await this.redis.keys('cache:tag:*');
            for (const tagKey of tagKeys) {
                const tag = tagKey.replace('cache:tag:', '');
                const keys = await this.redis.smembers(tagKey);
                this.tagIndex.set(tag, new Set(keys));
            }
            logger.info({
                dependencies: this.dependencyGraph.size,
                tags: this.tagIndex.size,
            }, 'Dependency graph loaded');
        }
        catch (error) {
            logger.error({ error }, 'Failed to load dependency graph');
        }
    }
    /**
     * Clear all dependencies and tags
     */
    async clear() {
        this.dependencyGraph.clear();
        this.tagIndex.clear();
        if (this.redis) {
            const depKeys = await this.redis.keys('cache:deps:*');
            const tagKeys = await this.redis.keys('cache:tag:*');
            if (depKeys.length > 0) {
                await this.redis.del(...depKeys);
            }
            if (tagKeys.length > 0) {
                await this.redis.del(...tagKeys);
            }
        }
        logger.info('Dependency graph cleared');
    }
}
exports.CacheInvalidator = CacheInvalidator;
