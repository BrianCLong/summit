"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStateStore = exports.InMemoryStateStore = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const Logger_js_1 = require("../Logger.js");
class InMemoryStateStore {
    store = new Map();
    async get(key) {
        return this.store.get(key) || null;
    }
    async set(key, value, ttlSeconds) {
        this.store.set(key, value);
        // InMemory TTL not implemented for brevity
    }
    async increment(key, by = 1) {
        const current = parseInt(this.store.get(key) || '0', 10);
        const newVal = current + by;
        this.store.set(key, newVal.toString());
        return newVal;
    }
}
exports.InMemoryStateStore = InMemoryStateStore;
class RedisStateStore {
    redis;
    logger = new Logger_js_1.Logger('RedisStateStore');
    constructor(redisUrl = 'redis://localhost:6379') {
        this.redis = new ioredis_1.default(redisUrl, {
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
    }
    async connect() {
        try {
            await this.redis.connect();
        }
        catch (e) {
            this.logger.error('Failed to connect to Redis', e);
        }
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async increment(key, by = 1) {
        return this.redis.incrby(key, by);
    }
}
exports.RedisStateStore = RedisStateStore;
