"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cached = void 0;
const redis_js_1 = require("../cache/redis.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
// Simple metrics for cache (Placeholders for now, can be connected to Prom/Telemetry)
const metrics = {
    cacheHit: { inc: () => { } },
    cacheMiss: { inc: () => { } },
    cacheEviction: { inc: () => { } },
};
const cached = (key, ttl, fn) => async () => {
    const redis = redis_js_1.RedisService.getInstance();
    try {
        const hit = await redis.get(key);
        if (hit) {
            metrics.cacheHit.inc();
            return JSON.parse(hit);
        }
    }
    catch (err) {
        logger.warn({ err, key }, 'Redis get failed in cached wrapper');
    }
    const val = await fn();
    try {
        await redis.setex(key, ttl, JSON.stringify(val));
        metrics.cacheMiss.inc();
    }
    catch (err) {
        logger.warn({ err, key }, 'Redis setex failed in cached wrapper');
    }
    return val;
};
exports.cached = cached;
