"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCached = setCached;
// @ts-nocheck
const cache_1 = require("@packages/cache");
const answersCache = (0, cache_1.createCacheClient)({
    namespace: 'answers',
    cacheClass: 'critical_path',
    redisUrl: process.env.REDIS_URL,
    defaultTTLSeconds: 60,
});
function cacheKey(tenant, input) {
    return `ans:${tenant}:${Buffer.from(input).toString('base64url')}`;
}
async function getCached(tenant, input) {
    return answersCache.get(cacheKey(tenant, input));
}
async function setCached(tenant, input, text, ttl = 60) {
    await answersCache.set(cacheKey(tenant, input), text, { ttlSeconds: ttl });
}
