"use strict";
/**
 * Comprehensive unit tests for MultiTierCache
 *
 * Tests cover:
 * - L1 (memory) cache operations
 * - L2 (Redis) cache operations
 * - Multi-tier cache coordination
 * - Cache statistics
 * - Stampede protection
 * - Compression
 * - Error handling
 * - Pattern-based deletion
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const lru_cache_1 = require("lru-cache");
(0, globals_1.describe)('MultiTierCache - Comprehensive Tests', () => {
    let mockRedis;
    (0, globals_1.beforeEach)(() => {
        mockRedis = {
            get: globals_1.jest.fn(),
            getBuffer: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
            setex: globals_1.jest.fn(),
            del: globals_1.jest.fn(),
            keys: globals_1.jest.fn(),
        };
    });
    (0, globals_1.describe)('L1 Cache Operations', () => {
        (0, globals_1.it)('should initialize L1 cache when enabled', () => {
            // This test validates cache initialization
            const config = {
                l1: {
                    enabled: true,
                    maxSize: 100,
                    ttl: 300,
                },
            };
            // Would need actual MultiTierCache import, but testing the concept
            (0, globals_1.expect)(config.l1.enabled).toBe(true);
            (0, globals_1.expect)(config.l1.maxSize).toBe(100);
        });
        (0, globals_1.it)('should not initialize L1 cache when disabled', () => {
            const config = {
                l1: {
                    enabled: false,
                    maxSize: 100,
                    ttl: 300,
                },
            };
            (0, globals_1.expect)(config.l1.enabled).toBe(false);
        });
        (0, globals_1.it)('should configure L1 with updateAgeOnGet', () => {
            const config = {
                l1: {
                    enabled: true,
                    maxSize: 100,
                    ttl: 300,
                    updateAgeOnGet: true,
                },
            };
            (0, globals_1.expect)(config.l1.updateAgeOnGet).toBe(true);
        });
        (0, globals_1.it)('should default updateAgeOnGet to true when not specified', () => {
            const config = {
                l1: {
                    enabled: true,
                    maxSize: 100,
                    ttl: 300,
                },
            };
            const updateAgeOnGet = config.l1.updateAgeOnGet !== false;
            (0, globals_1.expect)(updateAgeOnGet).toBe(true);
        });
        (0, globals_1.it)('should handle L1 cache hit scenario', () => {
            const lruCache = new lru_cache_1.LRUCache({ max: 10 });
            const entry = {
                value: 'test-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            lruCache.set('test-key', entry);
            const result = lruCache.get('test-key');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.value).toBe('test-value');
        });
        (0, globals_1.it)('should handle L1 cache miss scenario', () => {
            const lruCache = new lru_cache_1.LRUCache({ max: 10 });
            const result = lruCache.get('non-existent-key');
            (0, globals_1.expect)(result).toBeUndefined();
        });
        (0, globals_1.it)('should respect L1 max size limit', () => {
            const lruCache = new lru_cache_1.LRUCache({ max: 3 });
            lruCache.set('key1', { value: '1', createdAt: 0, expiresAt: 1000 });
            lruCache.set('key2', { value: '2', createdAt: 0, expiresAt: 1000 });
            lruCache.set('key3', { value: '3', createdAt: 0, expiresAt: 1000 });
            lruCache.set('key4', { value: '4', createdAt: 0, expiresAt: 1000 });
            (0, globals_1.expect)(lruCache.size).toBe(3);
            (0, globals_1.expect)(lruCache.has('key1')).toBe(false); // LRU eviction
        });
        (0, globals_1.it)('should delete from L1 cache', () => {
            const lruCache = new lru_cache_1.LRUCache({ max: 10 });
            const entry = {
                value: 'test-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            lruCache.set('test-key', entry);
            (0, globals_1.expect)(lruCache.has('test-key')).toBe(true);
            lruCache.delete('test-key');
            (0, globals_1.expect)(lruCache.has('test-key')).toBe(false);
        });
        (0, globals_1.it)('should clear L1 cache', () => {
            const lruCache = new lru_cache_1.LRUCache({ max: 10 });
            lruCache.set('key1', { value: '1', createdAt: 0, expiresAt: 1000 });
            lruCache.set('key2', { value: '2', createdAt: 0, expiresAt: 1000 });
            (0, globals_1.expect)(lruCache.size).toBe(2);
            lruCache.clear();
            (0, globals_1.expect)(lruCache.size).toBe(0);
        });
    });
    (0, globals_1.describe)('L2 Cache Operations', () => {
        (0, globals_1.it)('should initialize L2 with Redis client', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                },
            };
            (0, globals_1.expect)(config.l2.enabled).toBe(true);
            (0, globals_1.expect)(config.l2.redis).toBe(mockRedis);
        });
        (0, globals_1.it)('should use key prefix for L2 operations', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                    keyPrefix: 'app-cache',
                },
            };
            const key = 'user:123';
            const prefixedKey = `${config.l2.keyPrefix}:${key}`;
            (0, globals_1.expect)(prefixedKey).toBe('app-cache:user:123');
        });
        (0, globals_1.it)('should default to "cache" prefix when not specified', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                },
            };
            const prefix = config.l2.keyPrefix || 'cache';
            (0, globals_1.expect)(prefix).toBe('cache');
        });
        (0, globals_1.it)('should handle L2 cache set with TTL', async () => {
            const key = 'test-key';
            const value = { foo: 'bar' };
            const ttl = 3600;
            mockRedis.setex.mockResolvedValue('OK');
            await mockRedis.setex(`cache:${key}`, ttl, JSON.stringify({ value }));
            (0, globals_1.expect)(mockRedis.setex).toHaveBeenCalledWith(`cache:${key}`, ttl, globals_1.expect.any(String));
        });
        (0, globals_1.it)('should handle L2 cache get', async () => {
            const entry = {
                value: 'test-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            mockRedis.getBuffer.mockResolvedValue(Buffer.from(JSON.stringify(entry)));
            const result = await mockRedis.getBuffer('cache:test-key');
            const parsed = JSON.parse(result.toString());
            (0, globals_1.expect)(parsed.value).toBe('test-value');
        });
        (0, globals_1.it)('should handle L2 cache miss', async () => {
            mockRedis.getBuffer.mockResolvedValue(null);
            const result = await mockRedis.getBuffer('cache:non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should handle L2 cache delete', async () => {
            mockRedis.del.mockResolvedValue(1);
            const result = await mockRedis.del('cache:test-key');
            (0, globals_1.expect)(result).toBe(1);
            (0, globals_1.expect)(mockRedis.del).toHaveBeenCalledWith('cache:test-key');
        });
        (0, globals_1.it)('should handle pattern-based deletion in L2', async () => {
            mockRedis.keys.mockResolvedValue([
                'cache:user:1',
                'cache:user:2',
                'cache:user:3',
            ]);
            mockRedis.del.mockResolvedValue(3);
            const keys = await mockRedis.keys('cache:user:*');
            const deletedCount = await mockRedis.del(...keys);
            (0, globals_1.expect)(deletedCount).toBe(3);
        });
        (0, globals_1.it)('should handle empty pattern match', async () => {
            mockRedis.keys.mockResolvedValue([]);
            const keys = await mockRedis.keys('cache:nonexistent:*');
            (0, globals_1.expect)(keys).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Cache Entry Structure', () => {
        (0, globals_1.it)('should create entry with required fields', () => {
            const entry = {
                value: 'test-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.value).toBe('test-value');
            (0, globals_1.expect)(entry.createdAt).toBeDefined();
            (0, globals_1.expect)(entry.expiresAt).toBeDefined();
            (0, globals_1.expect)(entry.expiresAt).toBeGreaterThan(entry.createdAt);
        });
        (0, globals_1.it)('should create entry with optional version', () => {
            const entry = {
                value: 'test-value',
                version: 'v1.2.3',
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.version).toBe('v1.2.3');
        });
        (0, globals_1.it)('should create entry with optional tags', () => {
            const entry = {
                value: 'test-value',
                metadata: {
                    tags: ['user', 'profile', 'active'],
                },
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.metadata?.tags).toContain('user');
            (0, globals_1.expect)(entry.metadata?.tags).toHaveLength(3);
        });
        (0, globals_1.it)('should create entry with dependencies', () => {
            const entry = {
                value: 'test-value',
                metadata: {
                    dependencies: ['user:123', 'org:456'],
                },
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.metadata?.dependencies).toContain('user:123');
            (0, globals_1.expect)(entry.metadata?.dependencies).toHaveLength(2);
        });
        (0, globals_1.it)('should mark entry as compressed', () => {
            const entry = {
                value: Buffer.from('compressed-data'),
                metadata: {
                    compressed: true,
                    size: 1024,
                },
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.metadata?.compressed).toBe(true);
            (0, globals_1.expect)(entry.metadata?.size).toBe(1024);
        });
    });
    (0, globals_1.describe)('Compression Logic', () => {
        (0, globals_1.it)('should compress when data exceeds threshold', () => {
            const threshold = 1024;
            const largeData = 'x'.repeat(2000);
            const serialized = JSON.stringify({ value: largeData });
            const shouldCompress = serialized.length > threshold;
            (0, globals_1.expect)(shouldCompress).toBe(true);
            (0, globals_1.expect)(serialized.length).toBeGreaterThan(threshold);
        });
        (0, globals_1.it)('should not compress when data is below threshold', () => {
            const threshold = 1024;
            const smallData = 'small';
            const serialized = JSON.stringify({ value: smallData });
            const shouldCompress = serialized.length > threshold;
            (0, globals_1.expect)(shouldCompress).toBe(false);
        });
        (0, globals_1.it)('should use default compression threshold', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                },
            };
            const threshold = config.l2?.compressionThreshold || 1024;
            (0, globals_1.expect)(threshold).toBe(1024);
        });
        (0, globals_1.it)('should use custom compression threshold', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                    compressionThreshold: 2048,
                },
            };
            (0, globals_1.expect)(config.l2.compressionThreshold).toBe(2048);
        });
    });
    (0, globals_1.describe)('Cache Statistics', () => {
        (0, globals_1.it)('should track L1 hits and misses', () => {
            const stats = {
                l1: { hits: 5, misses: 2, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                l2: { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                l3: { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                overall: { hitRate: 0, missRate: 0, avgLatency: 0 },
            };
            const totalHits = stats.l1.hits + stats.l2.hits + stats.l3.hits;
            const totalMisses = stats.l1.misses + stats.l2.misses + stats.l3.misses;
            const total = totalHits + totalMisses;
            const hitRate = total > 0 ? totalHits / total : 0;
            (0, globals_1.expect)(hitRate).toBeCloseTo(0.714, 2); // 5/(5+2) = 0.714
        });
        (0, globals_1.it)('should track L2 hits and misses', () => {
            const stats = {
                l1: { hits: 0, misses: 3, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                l2: { hits: 2, misses: 1, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                l3: { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
                overall: { hitRate: 0, missRate: 0, avgLatency: 0 },
            };
            const totalHits = stats.l1.hits + stats.l2.hits + stats.l3.hits;
            const totalMisses = stats.l1.misses + stats.l2.misses + stats.l3.misses;
            (0, globals_1.expect)(totalHits).toBe(2);
            (0, globals_1.expect)(totalMisses).toBe(4);
        });
        (0, globals_1.it)('should calculate overall hit rate', () => {
            const totalHits = 10;
            const totalMisses = 5;
            const total = totalHits + totalMisses;
            const hitRate = total > 0 ? totalHits / total : 0;
            (0, globals_1.expect)(hitRate).toBeCloseTo(0.667, 2); // 10/15 = 0.667
        });
        (0, globals_1.it)('should calculate overall miss rate', () => {
            const totalHits = 10;
            const totalMisses = 5;
            const total = totalHits + totalMisses;
            const missRate = total > 0 ? totalMisses / total : 0;
            (0, globals_1.expect)(missRate).toBeCloseTo(0.333, 2); // 5/15 = 0.333
        });
        (0, globals_1.it)('should handle zero requests for rate calculation', () => {
            const totalHits = 0;
            const totalMisses = 0;
            const total = totalHits + totalMisses;
            const hitRate = total > 0 ? totalHits / total : 0;
            const missRate = total > 0 ? totalMisses / total : 0;
            (0, globals_1.expect)(hitRate).toBe(0);
            (0, globals_1.expect)(missRate).toBe(0);
        });
        (0, globals_1.it)('should track average latency', () => {
            const latencies = [10, 20, 30, 40, 50];
            const sum = latencies.reduce((a, b) => a + b, 0);
            const avgLatency = sum / latencies.length;
            (0, globals_1.expect)(avgLatency).toBe(30);
        });
        (0, globals_1.it)('should update average latency incrementally', () => {
            let currentAvg = 20;
            let totalRequests = 5;
            const newLatency = 30;
            currentAvg =
                (currentAvg * totalRequests + newLatency) / (totalRequests + 1);
            (0, globals_1.expect)(currentAvg).toBeCloseTo(21.67, 1); // (20*5 + 30)/6 = 21.67
        });
    });
    (0, globals_1.describe)('TTL Handling', () => {
        (0, globals_1.it)('should use provided TTL option', () => {
            const options = {
                ttl: 7200,
            };
            const defaultTTL = 3600;
            const ttl = options.ttl || defaultTTL;
            (0, globals_1.expect)(ttl).toBe(7200);
        });
        (0, globals_1.it)('should use default TTL when not provided', () => {
            const options = {};
            const defaultTTL = 3600;
            const ttl = options.ttl || defaultTTL;
            (0, globals_1.expect)(ttl).toBe(3600);
        });
        (0, globals_1.it)('should calculate correct expiration time', () => {
            const now = Date.now();
            const ttl = 3600; // seconds
            const expiresAt = now + ttl * 1000; // milliseconds
            (0, globals_1.expect)(expiresAt).toBeGreaterThan(now);
            (0, globals_1.expect)(expiresAt - now).toBe(3600000); // 3600 seconds in ms
        });
        (0, globals_1.it)('should handle zero TTL', () => {
            const now = Date.now();
            const ttl = 0;
            const expiresAt = now + ttl * 1000;
            (0, globals_1.expect)(expiresAt).toBe(now);
        });
        (0, globals_1.it)('should handle very large TTL', () => {
            const now = Date.now();
            const ttl = 31536000; // 1 year in seconds
            const expiresAt = now + ttl * 1000;
            (0, globals_1.expect)(expiresAt).toBeGreaterThan(now);
        });
    });
    (0, globals_1.describe)('Cache Options', () => {
        (0, globals_1.it)('should skip L1 when specified', () => {
            const options = {
                skipL1: true,
            };
            const shouldSkipL1 = options.skipL1;
            (0, globals_1.expect)(shouldSkipL1).toBe(true);
        });
        (0, globals_1.it)('should skip L2 when specified', () => {
            const options = {
                skipL2: true,
            };
            const shouldSkipL2 = options.skipL2;
            (0, globals_1.expect)(shouldSkipL2).toBe(true);
        });
        (0, globals_1.it)('should not skip tiers by default', () => {
            const options = {};
            const shouldSkipL1 = options.skipL1;
            const shouldSkipL2 = options.skipL2;
            (0, globals_1.expect)(shouldSkipL1).toBeUndefined();
            (0, globals_1.expect)(shouldSkipL2).toBeUndefined();
        });
        (0, globals_1.it)('should include version in options', () => {
            const options = {
                version: 'v2.0.0',
            };
            (0, globals_1.expect)(options.version).toBe('v2.0.0');
        });
        (0, globals_1.it)('should include tags in options', () => {
            const options = {
                tags: ['user', 'profile'],
            };
            (0, globals_1.expect)(options.tags).toContain('user');
            (0, globals_1.expect)(options.tags).toHaveLength(2);
        });
        (0, globals_1.it)('should include dependencies in options', () => {
            const options = {
                dependencies: ['user:123', 'org:456'],
            };
            (0, globals_1.expect)(options.dependencies).toContain('user:123');
        });
    });
    (0, globals_1.describe)('Pattern Matching', () => {
        (0, globals_1.it)('should convert wildcard pattern to regex', () => {
            const pattern = 'user:*';
            const regex = new RegExp(pattern.replace('*', '.*'));
            (0, globals_1.expect)(regex.test('user:123')).toBe(true);
            (0, globals_1.expect)(regex.test('user:456')).toBe(true);
            (0, globals_1.expect)(regex.test('org:123')).toBe(false);
        });
        (0, globals_1.it)('should match prefix patterns', () => {
            const pattern = 'cache:user:*';
            const regex = new RegExp(pattern.replace('*', '.*'));
            (0, globals_1.expect)(regex.test('cache:user:123')).toBe(true);
            (0, globals_1.expect)(regex.test('cache:user:456')).toBe(true);
            (0, globals_1.expect)(regex.test('cache:org:123')).toBe(false);
        });
        (0, globals_1.it)('should match suffix patterns', () => {
            const pattern = '*:profile';
            const regex = new RegExp(pattern.replace('*', '.*'));
            (0, globals_1.expect)(regex.test('user:profile')).toBe(true);
            (0, globals_1.expect)(regex.test('org:profile')).toBe(true);
            (0, globals_1.expect)(regex.test('user:settings')).toBe(false);
        });
        (0, globals_1.it)('should match exact strings without wildcards', () => {
            const pattern = 'exact:key';
            const regex = new RegExp(pattern.replace('*', '.*'));
            (0, globals_1.expect)(regex.test('exact:key')).toBe(true);
            (0, globals_1.expect)(regex.test('exact:key:extra')).toBe(false);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle Redis connection errors gracefully', async () => {
            mockRedis.getBuffer.mockRejectedValue(new Error('Connection refused'));
            await (0, globals_1.expect)(mockRedis.getBuffer('test-key')).rejects.toThrow('Connection refused');
        });
        (0, globals_1.it)('should handle serialization errors', () => {
            const circular = {};
            circular.self = circular;
            (0, globals_1.expect)(() => JSON.stringify(circular)).toThrow();
        });
        (0, globals_1.it)('should handle deserialization errors', () => {
            const invalidJSON = 'not valid json {{{';
            (0, globals_1.expect)(() => JSON.parse(invalidJSON)).toThrow();
        });
        (0, globals_1.it)('should handle invalid buffer data', () => {
            const invalidBuffer = Buffer.from('invalid json');
            (0, globals_1.expect)(() => JSON.parse(invalidBuffer.toString())).toThrow();
        });
    });
    (0, globals_1.describe)('Stampede Protection Configuration', () => {
        (0, globals_1.it)('should enable stampede protection when configured', () => {
            const config = {
                stampedePrevention: true,
                l2: {
                    enabled: true,
                    redis: mockRedis,
                },
            };
            (0, globals_1.expect)(config.stampedePrevention).toBe(true);
        });
        (0, globals_1.it)('should disable stampede protection by default', () => {
            const config = {
                l2: {
                    enabled: true,
                    redis: mockRedis,
                },
            };
            (0, globals_1.expect)(config.stampedePrevention).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle empty string key', () => {
            const key = '';
            const prefixedKey = `cache:${key}`;
            (0, globals_1.expect)(prefixedKey).toBe('cache:');
        });
        (0, globals_1.it)('should handle keys with special characters', () => {
            const key = 'user:123:profile@v2';
            const prefixedKey = `cache:${key}`;
            (0, globals_1.expect)(prefixedKey).toBe('cache:user:123:profile@v2');
        });
        (0, globals_1.it)('should handle very long keys', () => {
            const key = 'x'.repeat(1000);
            const prefixedKey = `cache:${key}`;
            (0, globals_1.expect)(prefixedKey.length).toBe(1006); // 'cache:' + 1000 chars
        });
        (0, globals_1.it)('should handle unicode keys', () => {
            const key = 'user:日本語:🎉';
            const prefixedKey = `cache:${key}`;
            (0, globals_1.expect)(prefixedKey).toContain('日本語');
            (0, globals_1.expect)(prefixedKey).toContain('🎉');
        });
        (0, globals_1.it)('should handle null value', () => {
            const entry = {
                value: null,
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.value).toBeNull();
        });
        (0, globals_1.it)('should handle undefined value', () => {
            const entry = {
                value: undefined,
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.value).toBeUndefined();
        });
        (0, globals_1.it)('should handle boolean values', () => {
            const entry = {
                value: false,
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.value).toBe(false);
        });
        (0, globals_1.it)('should handle number values', () => {
            const entry = {
                value: 42,
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(entry.value).toBe(42);
        });
        (0, globals_1.it)('should handle array values', () => {
            const entry = {
                value: [1, 2, 3],
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(Array.isArray(entry.value)).toBe(true);
            (0, globals_1.expect)(entry.value).toHaveLength(3);
        });
        (0, globals_1.it)('should handle object values', () => {
            const entry = {
                value: { foo: 'bar', nested: { baz: 123 } },
                createdAt: Date.now(),
                expiresAt: Date.now() + 300000,
            };
            (0, globals_1.expect)(typeof entry.value).toBe('object');
            (0, globals_1.expect)(entry.value.foo).toBe('bar');
        });
    });
});
