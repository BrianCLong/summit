"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryResultCache = void 0;
const crypto_1 = __importDefault(require("crypto"));
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const logger_js_1 = require("../utils/logger.js");
const DEFAULT_CONFIG = {
    ttlSeconds: 600,
    streamingTtlSeconds: 30,
    maxEntries: 500,
    streamingMaxEntries: 250,
    partialLimit: 25,
};
/**
 * Multi-tier cache for Cypher/SQL query signatures.
 * - L1 RAM cache with LFU eviction
 * - L2 Redis (flash) cache for read-through/write-through
 * - Short-lived streaming cache for partial results to support progressive rendering
 */
class QueryResultCache {
    l1 = new Map();
    streamingCache = new Map();
    config;
    redis;
    prefix = 'ig:query-cache:';
    streamingPrefix = 'ig:query-stream:';
    stats = {
        result: { hits: 0, misses: 0 },
        streaming: { hits: 0, misses: 0 },
    };
    constructor(redis, config = {}) {
        this.redis = redis;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    buildSignature(language, query, parameters = {}) {
        const normalisedParams = this.normaliseParams(parameters);
        const paramHash = crypto_1.default.createHash('sha256').update(normalisedParams).digest('hex');
        const queryHash = crypto_1.default.createHash('sha256').update(query.trim()).digest('hex');
        return `${language}:${queryHash}:${paramHash}`;
    }
    getPartialLimit() {
        return this.config.partialLimit;
    }
    getHitRate(operation = 'result') {
        const { hits, misses } = this.stats[operation];
        const total = hits + misses;
        return total === 0 ? 0 : hits / total;
    }
    getStats() {
        return {
            result: { ...this.stats.result, hitRate: this.getHitRate('result') },
            streaming: { ...this.stats.streaming, hitRate: this.getHitRate('streaming') },
            l1Entries: this.l1.size,
            streamingEntries: this.streamingCache.size,
        };
    }
    async getResult(signature, tenantId) {
        const now = Date.now();
        const started = now;
        const l1Entry = this.l1.get(signature);
        if (l1Entry && l1Entry.expiresAt > now) {
            l1Entry.accessCount++;
            l1Entry.lastAccessedAt = now;
            this.recordHit('result', tenantId);
            this.recordLatency('result', 'hit', tenantId, started);
            return { ...l1Entry.value, tier: 'ram' };
        }
        if (l1Entry) {
            this.l1.delete(signature);
            cacheMetrics_js_1.cacheLocalSize?.labels?.('query-signature:result')?.set?.(this.l1.size);
        }
        if (!this.redis) {
            this.recordMiss('result', tenantId);
            this.recordLatency('result', 'miss', tenantId, started);
            return undefined;
        }
        const redisValue = await this.redis.get(this.prefix + signature);
        if (!redisValue) {
            this.recordMiss('result', tenantId);
            this.recordLatency('result', 'miss', tenantId, started);
            return undefined;
        }
        try {
            const parsed = JSON.parse(redisValue);
            this.setL1(signature, parsed, this.config.ttlSeconds);
            this.recordHit('result', tenantId);
            this.recordLatency('result', 'hit', tenantId, started);
            return { ...parsed, tier: 'flash' };
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Failed to parse flash cache entry, treating as miss');
            this.recordMiss('result', tenantId);
            this.recordLatency('result', 'miss', tenantId, started);
            return undefined;
        }
    }
    async setResult(signature, value, tenantId) {
        this.setL1(signature, value, this.config.ttlSeconds);
        cacheMetrics_js_1.cacheLocalSize?.labels?.('query-signature:result')?.set?.(this.l1.size);
        (0, cacheMetrics_js_1.recSet)('query-signature', 'result', tenantId);
        if (!this.redis)
            return;
        try {
            await this.redis.setex(this.prefix + signature, this.config.ttlSeconds, JSON.stringify(value));
            (0, cacheMetrics_js_1.recSet)('query-signature', 'result-flash', tenantId);
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Unable to write query cache entry to flash tier');
        }
    }
    async setStreamingPartial(signature, rows, tenantId) {
        const trimmed = rows.slice(0, this.config.partialLimit);
        this.setStreamingL1(signature, trimmed, this.config.streamingTtlSeconds);
        cacheMetrics_js_1.cacheLocalSize?.labels?.('query-signature:streaming')?.set?.(this.streamingCache.size);
        (0, cacheMetrics_js_1.recSet)('query-signature', 'streaming', tenantId);
        if (!this.redis)
            return;
        try {
            await this.redis.setex(this.streamingPrefix + signature, this.config.streamingTtlSeconds, JSON.stringify(trimmed));
            (0, cacheMetrics_js_1.recSet)('query-signature', 'streaming-flash', tenantId);
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Unable to write streaming cache entry to flash tier');
        }
    }
    async getStreamingPartial(signature, tenantId) {
        const now = Date.now();
        const started = now;
        const l1Entry = this.streamingCache.get(signature);
        if (l1Entry && l1Entry.expiresAt > now) {
            l1Entry.accessCount++;
            l1Entry.lastAccessedAt = now;
            this.recordHit('streaming', tenantId);
            this.recordLatency('streaming', 'hit', tenantId, started);
            return { rows: l1Entry.value, tier: 'ram' };
        }
        if (l1Entry) {
            this.streamingCache.delete(signature);
            cacheMetrics_js_1.cacheLocalSize?.labels?.('query-signature:streaming')?.set?.(this.streamingCache.size);
        }
        if (!this.redis) {
            this.recordMiss('streaming', tenantId);
            this.recordLatency('streaming', 'miss', tenantId, started);
            return undefined;
        }
        const redisValue = await this.redis.get(this.streamingPrefix + signature);
        if (!redisValue) {
            this.recordMiss('streaming', tenantId);
            this.recordLatency('streaming', 'miss', tenantId, started);
            return undefined;
        }
        try {
            const parsed = JSON.parse(redisValue);
            this.setStreamingL1(signature, parsed, this.config.streamingTtlSeconds);
            this.recordHit('streaming', tenantId);
            this.recordLatency('streaming', 'hit', tenantId, started);
            return { rows: parsed, tier: 'flash' };
        }
        catch (error) {
            logger_js_1.logger.warn({ error }, 'Failed to parse streaming cache entry, treating as miss');
            this.recordMiss('streaming', tenantId);
            this.recordLatency('streaming', 'miss', tenantId, started);
            return undefined;
        }
    }
    async readThrough(signature, tenantId, loader, options = {}) {
        const cached = await this.getResult(signature, tenantId);
        if (cached) {
            return { payload: cached, fromCache: true, tier: cached.tier };
        }
        const payload = await loader();
        await this.setResult(signature, payload, tenantId);
        if (options.primeStreaming !== false) {
            await this.setStreamingPartial(signature, payload.rows, tenantId);
        }
        return { payload, fromCache: false };
    }
    setL1(signature, value, ttlSeconds) {
        this.ensureL1Capacity(this.l1, 'result');
        this.l1.set(signature, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
            accessCount: 1,
            lastAccessedAt: Date.now(),
        });
    }
    setStreamingL1(signature, value, ttlSeconds) {
        this.ensureL1Capacity(this.streamingCache, 'streaming');
        this.streamingCache.set(signature, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
            accessCount: 1,
            lastAccessedAt: Date.now(),
        });
    }
    ensureL1Capacity(map, operation) {
        const maxEntries = operation === 'streaming' ? this.config.streamingMaxEntries : this.config.maxEntries;
        if (map.size < maxEntries)
            return;
        let candidate = null;
        for (const [key, entry] of map.entries()) {
            if (!candidate ||
                entry.accessCount < candidate.entry.accessCount ||
                (entry.accessCount === candidate.entry.accessCount &&
                    entry.lastAccessedAt < candidate.entry.lastAccessedAt)) {
                candidate = { key, entry };
            }
        }
        if (candidate) {
            map.delete(candidate.key);
            (0, cacheMetrics_js_1.recEviction)('query-signature', `lfu-${operation}`);
            cacheMetrics_js_1.cacheLocalSize?.labels?.(`query-signature:${operation}`)?.set?.(map.size);
        }
    }
    normaliseParams(params) {
        const stabilise = (value) => {
            if (Array.isArray(value)) {
                return value.map(stabilise);
            }
            if (value && typeof value === 'object') {
                const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
                return entries.reduce((acc, [key, val]) => {
                    acc[key] = stabilise(val);
                    return acc;
                }, {});
            }
            return value;
        };
        return JSON.stringify(stabilise(params));
    }
    recordHit(operation, tenantId) {
        this.stats[operation].hits++;
        (0, cacheMetrics_js_1.recHit)('query-signature', operation, tenantId);
        (0, cacheMetrics_js_1.setHitRatio)('query-signature', operation, this.stats[operation].hits, this.stats[operation].misses);
    }
    recordMiss(operation, tenantId) {
        this.stats[operation].misses++;
        (0, cacheMetrics_js_1.recMiss)('query-signature', operation, tenantId);
        (0, cacheMetrics_js_1.setHitRatio)('query-signature', operation, this.stats[operation].hits, this.stats[operation].misses);
    }
    recordLatency(operation, result, tenantId, startedAt) {
        const durationSeconds = (Date.now() - startedAt) / 1000;
        cacheMetrics_js_1.cacheLatencySeconds
            ?.labels?.(operation, result, tenantId ?? 'unknown')
            ?.observe?.(durationSeconds);
    }
}
exports.QueryResultCache = QueryResultCache;
