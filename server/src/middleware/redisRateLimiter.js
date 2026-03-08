"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisRateLimiter = createRedisRateLimiter;
// @ts-nocheck
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_js_1 = require("../config/database.js");
class RedisStore {
    client;
    windowMs;
    prefix;
    fallbackHits = new Map();
    constructor(windowMs, prefix = 'express-rate-limit:') {
        this.windowMs = windowMs;
        this.client = (0, database_js_1.getRedisClient)();
        this.prefix = prefix;
    }
    async increment(key) {
        const redisKey = `${this.prefix}${key}`;
        const resetTime = new Date(Date.now() + this.windowMs);
        if (!this.client) {
            const existing = this.fallbackHits.get(redisKey);
            const nowMs = Date.now();
            if (!existing || existing.reset < nowMs) {
                this.fallbackHits.set(redisKey, { count: 1, reset: nowMs + this.windowMs });
                return { totalHits: 1, resetTime };
            }
            existing.count += 1;
            this.fallbackHits.set(redisKey, existing);
            return { totalHits: existing.count, resetTime: new Date(existing.reset) };
        }
        const multi = this.client.multi();
        multi.incr(redisKey);
        multi.pttl(redisKey);
        const results = (await multi.exec());
        const current = results[0]?.[1] ?? 1;
        const ttl = results[1]?.[1] ?? -1;
        if (ttl === -1) {
            await this.client.pexpire(redisKey, this.windowMs);
        }
        const expiresIn = ttl > 0 ? ttl : this.windowMs;
        const reset = new Date(Date.now() + expiresIn);
        return { totalHits: current, resetTime: reset };
    }
    async decrement(key) {
        if (!this.client) {
            const redisKey = `${this.prefix}${key}`;
            const entry = this.fallbackHits.get(redisKey);
            if (entry) {
                entry.count = Math.max(0, entry.count - 1);
                this.fallbackHits.set(redisKey, entry);
            }
            return;
        }
        const redisKey = `${this.prefix}${key}`;
        await this.client.decr(redisKey);
    }
    async resetKey(key) {
        const redisKey = `${this.prefix}${key}`;
        if (!this.client) {
            this.fallbackHits.delete(redisKey);
            return;
        }
        await this.client.del(redisKey);
    }
    async resetAll() {
        if (!this.client) {
            this.fallbackHits.clear();
            return;
        }
        const keys = await this.client.keys(`${this.prefix}*`);
        if (keys.length)
            await this.client.del(keys);
    }
}
function createRedisRateLimiter(options) {
    const store = new RedisStore(options.windowMs ?? 60000);
    return (0, express_rate_limit_1.default)({
        ...options,
        store,
        standardHeaders: true,
        legacyHeaders: false,
    });
}
