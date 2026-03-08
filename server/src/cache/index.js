"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cached = cached;
exports.cachedSWR = cachedSWR;
// @ts-nocheck
const redis_1 = require("redis");
const safe_json_js_1 = require("../utils/safe-json.js");
// Lazy init
let redisClient = null;
function getRedis() {
    if (!redisClient) {
        redisClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        redisClient.connect().catch(console.error);
    }
    return redisClient;
}
const inflight = new Map();
async function cached(key, ttlSec, fn) {
    const r = getRedis();
    const cachedVal = await r.get(key);
    if (cachedVal)
        return (0, safe_json_js_1.safeJsonParse)(cachedVal);
    // Dogpile protection: check if request is already in flight locally
    if (inflight.has(key))
        return inflight.get(key);
    const p = (async () => {
        const v = await fn();
        await r.setEx(key, ttlSec, (0, safe_json_js_1.safeJsonStringify)(v));
        return v;
    })();
    inflight.set(key, p);
    try {
        return await p;
    }
    finally {
        inflight.delete(key);
    }
}
async function cachedSWR(key, ttl, swr, fn) {
    const r = getRedis();
    const v = await r.get(key);
    if (v) {
        const t = await r.ttl(key);
        // If within stale window (ttl < swr remaining), refresh in background
        if (t > 0 && t < swr) {
            fn()
                .then((n) => r.setEx(key, ttl, JSON.stringify(n)))
                .catch(() => { });
        }
        return JSON.parse(v);
    }
    return cached(key, ttl, fn);
}
