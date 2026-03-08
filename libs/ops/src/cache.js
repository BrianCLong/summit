"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCache = exports.cacheBust = exports.cacheRemember = exports.CacheManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const metrics_queue_js_1 = require("./metrics-queue.js");
function buildRedisClient() {
    const enabled = process.env.FLAG_SCALE_REDIS === '1';
    if (!enabled) {
        return null;
    }
    const address = process.env.REDIS_ADDR;
    if (!address) {
        console.warn('cache_disabled_no_address');
        return null;
    }
    return new ioredis_1.default(address, { password: process.env.REDIS_PASS });
}
class CacheManager {
    client;
    constructor(client) {
        this.client = client;
    }
    async remember(key, ttlSeconds, factory) {
        if (!this.client) {
            return factory();
        }
        if (ttlSeconds <= 0) {
            throw new Error('cache_ttl_must_be_positive');
        }
        const cached = await this.client.get(key);
        if (cached !== null) {
            try {
                metrics_queue_js_1.cacheHits.inc();
                return JSON.parse(cached);
            }
            catch (err) {
                console.warn('cache_deserialize_failed', err);
                await this.client.del([key]);
            }
        }
        metrics_queue_js_1.cacheMiss.inc();
        const computed = await factory();
        await this.client.setex(key, ttlSeconds, JSON.stringify(computed));
        return computed;
    }
    async bust(prefix) {
        if (!this.client) {
            return;
        }
        const keys = await this.client.keys(`${prefix}:*`);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }
    async shutdown() {
        if (this.client?.quit) {
            await this.client.quit();
        }
    }
}
exports.CacheManager = CacheManager;
const defaultCache = new CacheManager(buildRedisClient());
exports.cacheRemember = defaultCache.remember.bind(defaultCache);
exports.cacheBust = defaultCache.bust.bind(defaultCache);
exports.closeCache = defaultCache.shutdown.bind(defaultCache);
