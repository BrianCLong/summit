"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCache = void 0;
class ResponseCache {
    cache = new Map();
    // Example TTL: 60s
    set(queryHash, result, ttl = 60000) {
        this.cache.set(queryHash, { result, timestamp: Date.now() + ttl });
    }
    get(queryHash) {
        const entry = this.cache.get(queryHash);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp) {
            this.cache.delete(queryHash);
            return null;
        }
        return entry.result;
    }
}
exports.ResponseCache = ResponseCache;
