"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCacheWarmer = registerCacheWarmer;
exports.resetWarmersForTesting = resetWarmersForTesting;
exports.getWarmerStats = getWarmerStats;
exports.runWarmers = runWarmers;
exports.scheduleWarmersAfterInvalidation = scheduleWarmersAfterInvalidation;
exports.initializeCacheWarmers = initializeCacheWarmers;
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_js_1 = require("../config/database.js");
const index_js_1 = __importDefault(require("../config/index.js"));
const responseCache_js_1 = require("./responseCache.js");
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const warmers = [];
let initialized = false;
let lastRun = null;
let lastResults = [];
let warmInterval = null;
const defaultCacheConfig = {
    warmersEnabled: true,
    warmerIntervalSeconds: 60,
    staleWhileRevalidateSeconds: 30,
    defaultTtlSeconds: 60,
};
function getCacheConfig() {
    return index_js_1.default.cache ?? defaultCacheConfig;
}
function shouldRunWarmer(warmer, patterns) {
    if (!patterns.length)
        return true;
    if (!warmer.patterns || !warmer.patterns.length)
        return true;
    return warmer.patterns.some((p) => patterns.includes(p) || p === '*');
}
async function acquireLock(redis, ttlMs, lockKey, lockId) {
    if (!redis)
        return true;
    try {
        const res = await redis.set(lockKey, lockId, { PX: ttlMs, NX: true });
        return res === 'OK';
    }
    catch {
        return true;
    }
}
async function releaseLock(redis, lockKey, lockId) {
    if (!redis)
        return;
    try {
        const existing = await redis.get(lockKey);
        if (existing === lockId)
            await redis.del(lockKey);
    }
    catch { }
}
function registerCacheWarmer(warmer) {
    warmers.push(warmer);
}
function resetWarmersForTesting() {
    warmers.length = 0;
    lastResults = [];
    lastRun = null;
    if (warmInterval) {
        clearInterval(warmInterval);
        warmInterval = null;
    }
    initialized = false;
}
function getWarmerStats() {
    return {
        registered: warmers.length,
        lastRun,
        lastResults,
    };
}
async function runWarmers(reason = 'manual', patterns = []) {
    const redis = process.env.REDIS_DISABLE === '1' ? null : (0, database_js_1.getRedisClient)();
    const lockKey = 'cache:warm:lock';
    const lockId = node_crypto_1.default.randomUUID();
    const cacheConfig = getCacheConfig();
    const lockTtlMs = cacheConfig.warmerIntervalSeconds * 1000;
    const lockAcquired = await acquireLock(redis, lockTtlMs, lockKey, lockId);
    if (!lockAcquired)
        return [];
    const results = [];
    try {
        for (const warmer of warmers) {
            if (!shouldRunWarmer(warmer, patterns))
                continue;
            try {
                await (0, responseCache_js_1.cached)(warmer.keyParts, {
                    ttlSec: warmer.ttlSec,
                    tags: warmer.tags,
                    op: `${reason}:${warmer.name}`,
                    swrSec: cacheConfig.staleWhileRevalidateSeconds,
                }, warmer.fetcher);
                results.push({ name: warmer.name, ok: true, reason });
                cacheMetrics_js_1.cacheHits.labels('warm', warmer.name, 'system').inc();
                cacheMetrics_js_1.cacheSets.labels('warm', warmer.name, 'system').inc();
            }
            catch (error) {
                logger_js_1.default.warn({ err: error, warmer: warmer.name }, 'Cache warmer failed');
                results.push({
                    name: warmer.name,
                    ok: false,
                    reason,
                    error: error.message,
                });
                cacheMetrics_js_1.cacheMisses.labels('warm', warmer.name, 'system').inc();
            }
        }
    }
    finally {
        lastRun = Date.now();
        lastResults = results;
        await releaseLock(redis, lockKey, lockId);
    }
    return results;
}
function scheduleWarmersAfterInvalidation(patterns) {
    const cacheConfig = getCacheConfig();
    if (!cacheConfig.warmersEnabled)
        return;
    setTimeout(() => {
        runWarmers('invalidation', patterns).catch(() => { });
    }, 200);
}
async function initializeCacheWarmers() {
    const cacheConfig = getCacheConfig();
    if (initialized || !cacheConfig.warmersEnabled)
        return;
    initialized = true;
    registerCacheWarmer({
        name: 'counts-default-tenant',
        keyParts: ['counts', 'anon'],
        ttlSec: cacheConfig.defaultTtlSeconds,
        tags: ['counts'],
        patterns: ['counts:*'],
        fetcher: async () => {
            const pool = (0, database_js_1.getPostgresPool)();
            const sql = `SELECT status, COUNT(*)::int AS c FROM investigations WHERE tenant_id=$1 GROUP BY status`;
            const r = await pool.query(sql, ['anon']);
            const list = Array.isArray(r?.rows) ? r.rows : [];
            const byStatus = {};
            let total = 0;
            for (const row of list) {
                const k = String(row?.status ?? 'UNKNOWN');
                const v = Number(row?.c ?? row?.count ?? 0);
                byStatus[k] = (byStatus[k] || 0) + v;
                total += v;
            }
            return { byStatus, total };
        },
    });
    registerCacheWarmer({
        name: 'summary-default-tenant',
        keyParts: ['summary', 'anon'],
        ttlSec: cacheConfig.defaultTtlSeconds,
        tags: ['summary'],
        patterns: ['summary:*'],
        fetcher: async () => {
            const pool = (0, database_js_1.getPostgresPool)();
            const r1 = await pool.query(`SELECT COUNT(*)::int AS entities FROM entities WHERE tenant_id = $1`, ['anon']);
            const r2 = await pool.query(`SELECT COUNT(*)::int AS relationships FROM relationships WHERE tenant_id = $1`, ['anon']);
            const r3 = await pool.query(`SELECT COUNT(*)::int AS investigations FROM investigations WHERE tenant_id = $1`, ['anon']);
            return {
                entities: r1.rows?.[0]?.entities || 0,
                relationships: r2.rows?.[0]?.relationships || 0,
                investigations: r3.rows?.[0]?.investigations || 0,
            };
        },
    });
    await runWarmers('startup');
    warmInterval = setInterval(() => {
        runWarmers('schedule').catch(() => { });
    }, cacheConfig.warmerIntervalSeconds * 1000);
}
