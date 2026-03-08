"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCacheInvalidationListener = startCacheInvalidationListener;
exports.emitInvalidation = emitInvalidation;
const database_js_1 = require("../config/database.js");
const responseCache_js_1 = require("./responseCache.js");
const warmers_js_1 = require("./warmers.js");
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const INVALIDATION_CHANNEL = 'cache:invalidation';
let subscriberStarted = false;
async function broadcastInvalidation(patterns) {
    const redis = (0, database_js_1.getRedisClient)();
    if (!redis)
        return;
    try {
        await redis.publish(INVALIDATION_CHANNEL, JSON.stringify({ patterns }));
    }
    catch { }
}
async function performInvalidation(redis, patterns) {
    if (!redis) {
        (0, responseCache_js_1.flushLocalCache)();
        return;
    }
    const toDelete = new Set();
    for (const pat of patterns || []) {
        const [prefix, rest] = String(pat).split(':');
        const idxKey = prefix === 'tag'
            ? `idx:tag:${rest}`
            : rest && rest !== '*' ? `idx:${prefix}:${rest}` : `idx:${prefix}`;
        try {
            const members = await redis.sMembers(idxKey);
            for (const k of members || [])
                toDelete.add(k);
            if (members?.length)
                await redis.sRem(idxKey, members);
        }
        catch { }
    }
    if (toDelete.size > 0)
        await redis.del(...Array.from(toDelete));
}
async function startCacheInvalidationListener() {
    if (subscriberStarted)
        return;
    const base = (0, database_js_1.getRedisClient)();
    if (!base || typeof base.duplicate !== 'function')
        return;
    try {
        const sub = base.duplicate();
        if (!sub)
            return;
        subscriberStarted = true;
        if (typeof sub.connect === 'function')
            await sub.connect();
        sub.on('message', async (_channel, payload) => {
            try {
                const parsed = JSON.parse(payload || '{}');
                if (Array.isArray(parsed?.patterns)) {
                    await performInvalidation((0, database_js_1.getRedisClient)(), parsed.patterns);
                    parsed.patterns.forEach((p) => (0, cacheMetrics_js_1.recInvalidation)(p));
                }
            }
            catch { }
            (0, responseCache_js_1.flushLocalCache)();
        });
        await sub.subscribe(INVALIDATION_CHANNEL);
    }
    catch {
        subscriberStarted = false;
    }
}
/**
 * Invalidate cached keys by index patterns like 'counts:*' or 'investigations:*' or 'investigations:tenant1'
 * Requires responseCache to have written index sets: idx:<prefix> and idx:<prefix>:<tenant>
 */
async function emitInvalidation(patterns, tenant) {
    const redis = (0, database_js_1.getRedisClient)();
    try {
        await performInvalidation(redis, patterns);
        patterns.forEach((p) => (0, cacheMetrics_js_1.recInvalidation)(p, tenant));
        await broadcastInvalidation(patterns);
        (0, warmers_js_1.scheduleWarmersAfterInvalidation)(patterns);
    }
    finally {
        (0, responseCache_js_1.flushLocalCache)(); // ensure local fallback cache is cleared as well
    }
}
