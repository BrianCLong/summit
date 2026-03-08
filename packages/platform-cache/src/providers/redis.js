"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisProvider = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Redis cache provider
 */
class RedisProvider {
    name = 'redis';
    client;
    keyPrefix;
    partitionStrategy;
    ring = new Map();
    constructor(options = {}) {
        this.keyPrefix = options.keyPrefix ?? '';
        const commonOptions = {
            maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
            connectTimeout: options.connectTimeout ?? 10000,
            enableOfflineQueue: options.enableOfflineQueue ?? true,
            lazyConnect: true,
            password: options.password,
        };
        if (options.tls) {
            commonOptions.tls = options.tls;
        }
        this.partitionStrategy = options.partitionStrategy ?? 'hash';
        if (options.nodes && options.nodes.length > 0) {
            // Use array of Redis clients for partitioning
            this.client = options.nodes.map(url => new ioredis_1.default(url, commonOptions));
            // Initialize ring for consistent hashing if selected
            if (this.partitionStrategy === 'ring') {
                this.initializeRing(options.nodes.length);
            }
            // Handle errors for all clients
            for (const client of this.client) {
                client.on('error', (err) => {
                    console.error('Redis partitioned client error:', err.message);
                });
            }
        }
        else if (options.useCluster) {
            // For cluster mode, we can pass the URL or host/port as a startup node
            const startupNode = options.url || {
                host: options.host ?? 'localhost',
                port: options.port ?? 6379,
            };
            this.client = new ioredis_1.default.Cluster([startupNode], {
                redisOptions: commonOptions,
                dnsLookup: (address, callback) => callback(null, address), // Often needed for AWS ElastiCache
            });
            this.client.on('error', (err) => {
                console.error('Redis error:', err.message);
            });
        }
        else if (options.url) {
            this.client = new ioredis_1.default(options.url, commonOptions);
            this.client.on('error', (err) => {
                console.error('Redis error:', err.message);
            });
        }
        else {
            this.client = new ioredis_1.default({
                host: options.host ?? 'localhost',
                port: options.port ?? 6379,
                db: options.db ?? 0,
                ...commonOptions,
            });
            this.client.on('error', (err) => {
                console.error('Redis error:', err.message);
            });
        }
    }
    initializeRing(nodeCount) {
        const replicas = 100;
        for (let node = 0; node < nodeCount; node++) {
            for (let i = 0; i < replicas; i++) {
                const hash = this.hashString(`${node}-${i}`);
                this.ring.set(hash, node);
            }
        }
        // Sort keys for binary search, but since Map iterates in insertion order,
        // it's better to store an array of sorted keys if we need high performance
        this.ringKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
    }
    ringKeys = [];
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit int
        }
        return hash;
    }
    getClientForKey(key) {
        if (!Array.isArray(this.client)) {
            return this.client;
        }
        if (this.client.length === 1) {
            return this.client[0];
        }
        if (this.partitionStrategy === 'ring') {
            const hash = this.hashString(key);
            // Binary search for the first key >= hash
            let left = 0;
            let right = this.ringKeys.length - 1;
            let idx = 0; // Default to first if hash > all keys (wrap around)
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (this.ringKeys[mid] >= hash) {
                    idx = mid;
                    right = mid - 1;
                }
                else {
                    left = mid + 1;
                }
            }
            const nodeIdx = this.ring.get(this.ringKeys[idx]);
            return this.client[nodeIdx];
        }
        // Default: simple hash partitioning
        const hash = this.hashString(key);
        const index = Math.abs(hash) % this.client.length;
        return this.client[index];
    }
    async isAvailable() {
        try {
            if (Array.isArray(this.client)) {
                // Ping all nodes
                await Promise.all(this.client.map(c => c.ping()));
                return true;
            }
            await this.client.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    async get(key) {
        const client = this.getClientForKey(key);
        const value = await client.get(this.prefixKey(key));
        if (value === null) {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl) {
        const serialized = JSON.stringify(value);
        const prefixedKey = this.prefixKey(key);
        const client = this.getClientForKey(key);
        if (ttl !== undefined && ttl > 0) {
            await client.setex(prefixedKey, ttl, serialized);
        }
        else {
            await client.set(prefixedKey, serialized);
        }
    }
    async delete(key) {
        const client = this.getClientForKey(key);
        const result = await client.del(this.prefixKey(key));
        return result > 0;
    }
    async exists(key) {
        const client = this.getClientForKey(key);
        const result = await client.exists(this.prefixKey(key));
        return result > 0;
    }
    async deletePattern(pattern) {
        const prefixedPattern = this.prefixKey(pattern);
        if (Array.isArray(this.client)) {
            // Must query all nodes for a pattern
            let totalCount = 0;
            for (const client of this.client) {
                let cursor = '0';
                do {
                    const [newCursor, keys] = await client.scan(cursor, 'MATCH', prefixedPattern, 'COUNT', 100);
                    cursor = newCursor;
                    if (keys.length > 0) {
                        const deleted = await client.del(...keys);
                        totalCount += deleted;
                    }
                } while (cursor !== '0');
            }
            return totalCount;
        }
        let cursor = '0';
        let count = 0;
        do {
            const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', prefixedPattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
                const deleted = await this.client.del(...keys);
                count += deleted;
            }
        } while (cursor !== '0');
        return count;
    }
    async mget(keys) {
        if (keys.length === 0) {
            return [];
        }
        if (Array.isArray(this.client)) {
            // Group keys by node
            const keysByNode = new Map();
            keys.forEach((key, i) => {
                const client = this.getClientForKey(key);
                if (!keysByNode.has(client)) {
                    keysByNode.set(client, []);
                }
                keysByNode.get(client).push({ originalIndex: i, key: this.prefixKey(key) });
            });
            const result = new Array(keys.length).fill(null);
            // Fetch from each node in parallel
            const fetchPromises = Array.from(keysByNode.entries()).map(async ([client, nodeKeys]) => {
                const prefixedKeys = nodeKeys.map(k => k.key);
                const values = await client.mget(...prefixedKeys);
                values.forEach((v, i) => {
                    const originalIndex = nodeKeys[i].originalIndex;
                    if (v !== null) {
                        try {
                            result[originalIndex] = JSON.parse(v);
                        }
                        catch {
                            result[originalIndex] = null;
                        }
                    }
                });
            });
            await Promise.all(fetchPromises);
            return result;
        }
        const prefixedKeys = keys.map(k => this.prefixKey(k));
        const values = await this.client.mget(...prefixedKeys);
        return values.map(v => {
            if (v === null)
                return null;
            try {
                return JSON.parse(v);
            }
            catch {
                return null;
            }
        });
    }
    async mset(entries) {
        if (entries.length === 0) {
            return;
        }
        if (Array.isArray(this.client)) {
            // Group entries by node
            const entriesByNode = new Map();
            for (const entry of entries) {
                const client = this.getClientForKey(entry.key);
                if (!entriesByNode.has(client)) {
                    entriesByNode.set(client, []);
                }
                entriesByNode.get(client).push(entry);
            }
            // Execute pipelines on each node in parallel
            const pipelinePromises = Array.from(entriesByNode.entries()).map(async ([client, nodeEntries]) => {
                const pipeline = client.pipeline();
                for (const entry of nodeEntries) {
                    const prefixedKey = this.prefixKey(entry.key);
                    const serialized = JSON.stringify(entry.value);
                    if (entry.ttl !== undefined && entry.ttl > 0) {
                        pipeline.setex(prefixedKey, entry.ttl, serialized);
                    }
                    else {
                        pipeline.set(prefixedKey, serialized);
                    }
                }
                await pipeline.exec();
            });
            await Promise.all(pipelinePromises);
            return;
        }
        const pipeline = this.client.pipeline();
        for (const entry of entries) {
            const prefixedKey = this.prefixKey(entry.key);
            const serialized = JSON.stringify(entry.value);
            if (entry.ttl !== undefined && entry.ttl > 0) {
                pipeline.setex(prefixedKey, entry.ttl, serialized);
            }
            else {
                pipeline.set(prefixedKey, serialized);
            }
        }
        await pipeline.exec();
    }
    async ttl(key) {
        const client = this.getClientForKey(key);
        return client.ttl(this.prefixKey(key));
    }
    /**
     * Backup all keys from the cache.
     * Returns a JSON string containing keys, values, and TTLs.
     * Note: This uses SCAN so it won't block Redis, but could be slow for very large datasets.
     */
    async backup() {
        const backupData = {};
        const clients = Array.isArray(this.client) ? this.client : [this.client];
        for (const client of clients) {
            let cursor = '0';
            do {
                const [newCursor, keys] = await client.scan(cursor, 'MATCH', this.keyPrefix ? `${this.keyPrefix}*` : '*', 'COUNT', 1000);
                cursor = newCursor;
                if (keys.length > 0) {
                    // Fetch values and TTLs in pipeline for better performance
                    const pipeline = client.pipeline();
                    for (const key of keys) {
                        pipeline.get(key);
                        pipeline.ttl(key);
                    }
                    const results = await pipeline.exec();
                    if (results) {
                        for (let i = 0; i < keys.length; i++) {
                            const getValueResult = results[i * 2];
                            const getTtlResult = results[i * 2 + 1];
                            // Only keep successfully fetched keys
                            if (!getValueResult[0] && !getTtlResult[0] && getValueResult[1] !== null) {
                                const key = this.keyPrefix ? keys[i].substring(this.keyPrefix.length) : keys[i];
                                let value;
                                try {
                                    value = JSON.parse(getValueResult[1]);
                                }
                                catch {
                                    // Fallback for non-JSON values if any existed
                                    value = getValueResult[1];
                                }
                                backupData[key] = {
                                    value,
                                    ttl: getTtlResult[1]
                                };
                            }
                        }
                    }
                }
            } while (cursor !== '0');
        }
        return JSON.stringify(backupData);
    }
    /**
     * Restore cache from backup string.
     */
    async restore(backupStr) {
        try {
            const backupData = JSON.parse(backupStr);
            const entries = [];
            for (const [key, data] of Object.entries(backupData)) {
                entries.push({
                    key,
                    value: data.value,
                    ttl: data.ttl > 0 ? data.ttl : undefined
                });
            }
            // We can use the existing mset method which handles partitioning appropriately
            await this.mset(entries);
        }
        catch (error) {
            console.error('Failed to restore Redis backup:', error);
            throw error;
        }
    }
    async close() {
        if (Array.isArray(this.client)) {
            await Promise.all(this.client.map(c => c.quit()));
        }
        else {
            await this.client.quit();
        }
    }
    /**
     * Get underlying Redis client(s)
     */
    getClient() {
        return this.client;
    }
    /**
     * Add prefix to key
     */
    prefixKey(key) {
        return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
    }
}
exports.RedisProvider = RedisProvider;
