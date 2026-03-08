"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCacheInvalidator = exports.RedisCacheInvalidator = void 0;
class RedisCacheInvalidator {
    name = 'redis';
    namespace;
    redis;
    constructor(redis, namespace = 'kpro') {
        this.redis = redis;
        this.namespace = namespace;
    }
    async invalidate(keys) {
        if (!keys.length)
            return;
        const namespaced = keys.map((key) => `${this.namespace}:${key}`);
        await this.redis.del(...namespaced);
    }
}
exports.RedisCacheInvalidator = RedisCacheInvalidator;
class InMemoryCacheInvalidator {
    name = 'in-memory';
    store;
    constructor(store) {
        this.store = store ?? new Map();
    }
    async invalidate(keys) {
        for (const key of keys) {
            this.store.delete(key);
        }
    }
}
exports.InMemoryCacheInvalidator = InMemoryCacheInvalidator;
