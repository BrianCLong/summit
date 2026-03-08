"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMCache = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SimpleLRU {
    cache;
    max;
    ttl;
    timestamps;
    constructor(options) {
        this.cache = new Map();
        this.timestamps = new Map();
        this.max = options.max;
        this.ttl = options.ttl;
    }
    get(key) {
        const item = this.cache.get(key);
        if (item) {
            const timestamp = this.timestamps.get(key);
            if (timestamp && Date.now() - timestamp > this.ttl) {
                this.cache.delete(key);
                this.timestamps.delete(key);
                return undefined;
            }
            // Refresh
            this.cache.delete(key);
            this.cache.set(key, item);
            return item;
        }
        return undefined;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.max) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) { // Check to ensure firstKey is not undefined
                this.cache.delete(firstKey);
                this.timestamps.delete(firstKey);
            }
        }
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
    }
}
class LLMCache {
    cache;
    constructor(ttlMs = 1000 * 60 * 60) {
        this.cache = new SimpleLRU({
            max: 1000,
            ttl: ttlMs,
        });
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value) {
        // Clone to mark as cached
        const cachedValue = { ...value, cached: true };
        this.cache.set(key, cachedValue);
    }
    generateKey(request) {
        const relevant = {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            tools: request.tools,
            palette: request.palette
        };
        return crypto_1.default.createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
    }
}
exports.LLMCache = LLMCache;
