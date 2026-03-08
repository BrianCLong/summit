"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapState = exports.ListState = exports.ValueState = exports.StateManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({ name: 'state-manager' });
/**
 * State manager for stateful stream operations
 */
class StateManager {
    backend = types_js_1.StateBackend.MEMORY;
    memoryStore = new Map();
    redis = null;
    ttlTimers = new Map();
    constructor(backend, redisUrl) {
        if (backend) {
            this.backend = backend;
        }
        if (backend === types_js_1.StateBackend.REDIS && redisUrl) {
            this.redis = new ioredis_1.default(redisUrl);
            logger.info('Redis state backend initialized');
        }
    }
    /**
     * Get state value
     */
    async get(descriptor, key) {
        const stateKey = this.buildKey(descriptor.name, key);
        switch (this.backend) {
            case types_js_1.StateBackend.MEMORY:
                return this.memoryStore.get(stateKey) ?? descriptor.defaultValue;
            case types_js_1.StateBackend.REDIS:
                if (!this.redis) {
                    throw new Error('Redis not initialized');
                }
                const value = await this.redis.get(stateKey);
                if (value === null) {
                    return descriptor.defaultValue;
                }
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value;
                }
            default:
                throw new Error(`Unsupported state backend: ${this.backend}`);
        }
    }
    /**
     * Update state value
     */
    async update(descriptor, key, value) {
        const stateKey = this.buildKey(descriptor.name, key);
        switch (this.backend) {
            case types_js_1.StateBackend.MEMORY:
                this.memoryStore.set(stateKey, value);
                // Set TTL timer if specified
                if (descriptor.ttl) {
                    this.setTTL(stateKey, descriptor.ttl);
                }
                break;
            case types_js_1.StateBackend.REDIS:
                if (!this.redis) {
                    throw new Error('Redis not initialized');
                }
                const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                if (descriptor.ttl) {
                    await this.redis.setex(stateKey, Math.floor(descriptor.ttl / 1000), serialized);
                }
                else {
                    await this.redis.set(stateKey, serialized);
                }
                break;
            default:
                throw new Error(`Unsupported state backend: ${this.backend}`);
        }
        logger.debug({ key: stateKey }, 'State updated');
    }
    /**
     * Delete state
     */
    async delete(descriptor, key) {
        const stateKey = this.buildKey(descriptor.name, key);
        switch (this.backend) {
            case types_js_1.StateBackend.MEMORY:
                this.memoryStore.delete(stateKey);
                this.clearTTL(stateKey);
                break;
            case types_js_1.StateBackend.REDIS:
                if (!this.redis) {
                    throw new Error('Redis not initialized');
                }
                await this.redis.del(stateKey);
                break;
            default:
                throw new Error(`Unsupported state backend: ${this.backend}`);
        }
        logger.debug({ key: stateKey }, 'State deleted');
    }
    /**
     * Clear all state
     */
    async clear(descriptorName) {
        switch (this.backend) {
            case types_js_1.StateBackend.MEMORY:
                const prefix = `${descriptorName}:`;
                for (const key of this.memoryStore.keys()) {
                    if (key.startsWith(prefix)) {
                        this.memoryStore.delete(key);
                        this.clearTTL(key);
                    }
                }
                break;
            case types_js_1.StateBackend.REDIS:
                if (!this.redis) {
                    throw new Error('Redis not initialized');
                }
                const pattern = `${descriptorName}:*`;
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
                break;
            default:
                throw new Error(`Unsupported state backend: ${this.backend}`);
        }
        logger.info({ descriptorName }, 'State cleared');
    }
    /**
     * Build state key
     */
    buildKey(descriptorName, key) {
        return `${descriptorName}:${key}`;
    }
    /**
     * Set TTL for in-memory state
     */
    setTTL(key, ttl) {
        // Clear existing timer
        this.clearTTL(key);
        // Set new timer
        const timer = setTimeout(() => {
            this.memoryStore.delete(key);
            this.ttlTimers.delete(key);
            logger.debug({ key }, 'State expired');
        }, ttl);
        this.ttlTimers.set(key, timer);
    }
    /**
     * Clear TTL timer
     */
    clearTTL(key) {
        const timer = this.ttlTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.ttlTimers.delete(key);
        }
    }
    /**
     * Disconnect from backend
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
        }
        // Clear all TTL timers
        for (const timer of this.ttlTimers.values()) {
            clearTimeout(timer);
        }
        this.ttlTimers.clear();
        logger.info('State manager disconnected');
    }
}
exports.StateManager = StateManager;
/**
 * Value state for storing single values
 */
class ValueState {
    stateManager;
    descriptor;
    key;
    constructor(stateManager, descriptor, key) {
        this.stateManager = stateManager;
        this.descriptor = descriptor;
        this.key = key;
    }
    async value() {
        return this.stateManager.get(this.descriptor, this.key);
    }
    async update(value) {
        await this.stateManager.update(this.descriptor, this.key, value);
    }
    async clear() {
        await this.stateManager.delete(this.descriptor, this.key);
    }
}
exports.ValueState = ValueState;
/**
 * List state for storing lists
 */
class ListState {
    stateManager;
    descriptor;
    key;
    constructor(stateManager, descriptor, key) {
        this.stateManager = stateManager;
        this.descriptor = descriptor;
        this.key = key;
    }
    async get() {
        const value = await this.stateManager.get(this.descriptor, this.key);
        return value || [];
    }
    async add(value) {
        const list = await this.get();
        list.push(value);
        await this.stateManager.update(this.descriptor, this.key, list);
    }
    async addAll(values) {
        const list = await this.get();
        list.push(...values);
        await this.stateManager.update(this.descriptor, this.key, list);
    }
    async clear() {
        await this.stateManager.delete(this.descriptor, this.key);
    }
}
exports.ListState = ListState;
/**
 * Map state for storing key-value pairs
 */
class MapState {
    stateManager;
    descriptor;
    key;
    constructor(stateManager, descriptor, key) {
        this.stateManager = stateManager;
        this.descriptor = descriptor;
        this.key = key;
    }
    async get(mapKey) {
        const map = await this.getAll();
        return map.get(mapKey);
    }
    async put(mapKey, value) {
        const map = await this.getAll();
        map.set(mapKey, value);
        await this.stateManager.update(this.descriptor, this.key, map);
    }
    async getAll() {
        const value = await this.stateManager.get(this.descriptor, this.key);
        return value || new Map();
    }
    async remove(mapKey) {
        const map = await this.getAll();
        map.delete(mapKey);
        await this.stateManager.update(this.descriptor, this.key, map);
    }
    async clear() {
        await this.stateManager.delete(this.descriptor, this.key);
    }
}
exports.MapState = MapState;
