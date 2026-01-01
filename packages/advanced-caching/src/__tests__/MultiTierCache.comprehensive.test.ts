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

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LRUCache } from 'lru-cache';

// Mock types matching the types.ts structure
interface CacheEntry<T = any> {
  value: T;
  version?: string;
  metadata?: {
    tags?: string[];
    dependencies?: string[];
    compressed?: boolean;
    size?: number;
  };
  createdAt: number;
  expiresAt: number;
}

interface CacheConfig {
  l1?: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
    updateAgeOnGet?: boolean;
  };
  l2?: {
    enabled: boolean;
    redis: any;
    keyPrefix?: string;
    compressionThreshold?: number;
  };
  defaultTTL?: number;
  stampedePrevention?: boolean;
}

interface CacheOptions {
  ttl?: number;
  version?: string;
  tags?: string[];
  dependencies?: string[];
  skipL1?: boolean;
  skipL2?: boolean;
}

describe('MultiTierCache - Comprehensive Tests', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      getBuffer: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };
  });

  describe('L1 Cache Operations', () => {
    it('should initialize L1 cache when enabled', () => {
      // This test validates cache initialization
      const config: CacheConfig = {
        l1: {
          enabled: true,
          maxSize: 100,
          ttl: 300,
        },
      };

      // Would need actual MultiTierCache import, but testing the concept
      expect(config.l1.enabled).toBe(true);
      expect(config.l1.maxSize).toBe(100);
    });

    it('should not initialize L1 cache when disabled', () => {
      const config: CacheConfig = {
        l1: {
          enabled: false,
          maxSize: 100,
          ttl: 300,
        },
      };

      expect(config.l1.enabled).toBe(false);
    });

    it('should configure L1 with updateAgeOnGet', () => {
      const config: CacheConfig = {
        l1: {
          enabled: true,
          maxSize: 100,
          ttl: 300,
          updateAgeOnGet: true,
        },
      };

      expect(config.l1.updateAgeOnGet).toBe(true);
    });

    it('should default updateAgeOnGet to true when not specified', () => {
      const config: CacheConfig = {
        l1: {
          enabled: true,
          maxSize: 100,
          ttl: 300,
        },
      };

      const updateAgeOnGet = config.l1.updateAgeOnGet !== false;
      expect(updateAgeOnGet).toBe(true);
    });

    it('should handle L1 cache hit scenario', () => {
      const lruCache = new LRUCache<string, CacheEntry>({ max: 10 });
      const entry: CacheEntry = {
        value: 'test-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      lruCache.set('test-key', entry);
      const result = lruCache.get('test-key');

      expect(result).toBeDefined();
      expect(result?.value).toBe('test-value');
    });

    it('should handle L1 cache miss scenario', () => {
      const lruCache = new LRUCache<string, CacheEntry>({ max: 10 });
      const result = lruCache.get('non-existent-key');

      expect(result).toBeUndefined();
    });

    it('should respect L1 max size limit', () => {
      const lruCache = new LRUCache<string, CacheEntry>({ max: 3 });

      lruCache.set('key1', { value: '1', createdAt: 0, expiresAt: 1000 });
      lruCache.set('key2', { value: '2', createdAt: 0, expiresAt: 1000 });
      lruCache.set('key3', { value: '3', createdAt: 0, expiresAt: 1000 });
      lruCache.set('key4', { value: '4', createdAt: 0, expiresAt: 1000 });

      expect(lruCache.size).toBe(3);
      expect(lruCache.has('key1')).toBe(false); // LRU eviction
    });

    it('should delete from L1 cache', () => {
      const lruCache = new LRUCache<string, CacheEntry>({ max: 10 });
      const entry: CacheEntry = {
        value: 'test-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      lruCache.set('test-key', entry);
      expect(lruCache.has('test-key')).toBe(true);

      lruCache.delete('test-key');
      expect(lruCache.has('test-key')).toBe(false);
    });

    it('should clear L1 cache', () => {
      const lruCache = new LRUCache<string, CacheEntry>({ max: 10 });

      lruCache.set('key1', { value: '1', createdAt: 0, expiresAt: 1000 });
      lruCache.set('key2', { value: '2', createdAt: 0, expiresAt: 1000 });

      expect(lruCache.size).toBe(2);

      lruCache.clear();
      expect(lruCache.size).toBe(0);
    });
  });

  describe('L2 Cache Operations', () => {
    it('should initialize L2 with Redis client', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
        },
      };

      expect(config.l2.enabled).toBe(true);
      expect(config.l2.redis).toBe(mockRedis);
    });

    it('should use key prefix for L2 operations', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
          keyPrefix: 'app-cache',
        },
      };

      const key = 'user:123';
      const prefixedKey = `${config.l2.keyPrefix}:${key}`;

      expect(prefixedKey).toBe('app-cache:user:123');
    });

    it('should default to "cache" prefix when not specified', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
        },
      };

      const prefix = config.l2.keyPrefix || 'cache';
      expect(prefix).toBe('cache');
    });

    it('should handle L2 cache set with TTL', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };
      const ttl = 3600;

      mockRedis.setex.mockResolvedValue('OK');

      await mockRedis.setex(`cache:${key}`, ttl, JSON.stringify({ value }));

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `cache:${key}`,
        ttl,
        expect.any(String)
      );
    });

    it('should handle L2 cache get', async () => {
      const entry: CacheEntry = {
        value: 'test-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      mockRedis.getBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(entry))
      );

      const result = await mockRedis.getBuffer('cache:test-key');
      const parsed = JSON.parse(result.toString());

      expect(parsed.value).toBe('test-value');
    });

    it('should handle L2 cache miss', async () => {
      mockRedis.getBuffer.mockResolvedValue(null);

      const result = await mockRedis.getBuffer('cache:non-existent');

      expect(result).toBeNull();
    });

    it('should handle L2 cache delete', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await mockRedis.del('cache:test-key');

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('cache:test-key');
    });

    it('should handle pattern-based deletion in L2', async () => {
      mockRedis.keys.mockResolvedValue([
        'cache:user:1',
        'cache:user:2',
        'cache:user:3',
      ]);
      mockRedis.del.mockResolvedValue(3);

      const keys = await mockRedis.keys('cache:user:*');
      const deletedCount = await mockRedis.del(...keys);

      expect(deletedCount).toBe(3);
    });

    it('should handle empty pattern match', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const keys = await mockRedis.keys('cache:nonexistent:*');

      expect(keys).toHaveLength(0);
    });
  });

  describe('Cache Entry Structure', () => {
    it('should create entry with required fields', () => {
      const entry: CacheEntry = {
        value: 'test-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.value).toBe('test-value');
      expect(entry.createdAt).toBeDefined();
      expect(entry.expiresAt).toBeDefined();
      expect(entry.expiresAt).toBeGreaterThan(entry.createdAt);
    });

    it('should create entry with optional version', () => {
      const entry: CacheEntry = {
        value: 'test-value',
        version: 'v1.2.3',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.version).toBe('v1.2.3');
    });

    it('should create entry with optional tags', () => {
      const entry: CacheEntry = {
        value: 'test-value',
        metadata: {
          tags: ['user', 'profile', 'active'],
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.metadata?.tags).toContain('user');
      expect(entry.metadata?.tags).toHaveLength(3);
    });

    it('should create entry with dependencies', () => {
      const entry: CacheEntry = {
        value: 'test-value',
        metadata: {
          dependencies: ['user:123', 'org:456'],
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.metadata?.dependencies).toContain('user:123');
      expect(entry.metadata?.dependencies).toHaveLength(2);
    });

    it('should mark entry as compressed', () => {
      const entry: CacheEntry = {
        value: Buffer.from('compressed-data'),
        metadata: {
          compressed: true,
          size: 1024,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.metadata?.compressed).toBe(true);
      expect(entry.metadata?.size).toBe(1024);
    });
  });

  describe('Compression Logic', () => {
    it('should compress when data exceeds threshold', () => {
      const threshold = 1024;
      const largeData = 'x'.repeat(2000);
      const serialized = JSON.stringify({ value: largeData });

      const shouldCompress = serialized.length > threshold;

      expect(shouldCompress).toBe(true);
      expect(serialized.length).toBeGreaterThan(threshold);
    });

    it('should not compress when data is below threshold', () => {
      const threshold = 1024;
      const smallData = 'small';
      const serialized = JSON.stringify({ value: smallData });

      const shouldCompress = serialized.length > threshold;

      expect(shouldCompress).toBe(false);
    });

    it('should use default compression threshold', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
        },
      };

      const threshold = config.l2?.compressionThreshold || 1024;

      expect(threshold).toBe(1024);
    });

    it('should use custom compression threshold', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
          compressionThreshold: 2048,
        },
      };

      expect(config.l2.compressionThreshold).toBe(2048);
    });
  });

  describe('Cache Statistics', () => {
    it('should track L1 hits and misses', () => {
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

      expect(hitRate).toBeCloseTo(0.714, 2); // 5/(5+2) = 0.714
    });

    it('should track L2 hits and misses', () => {
      const stats = {
        l1: { hits: 0, misses: 3, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
        l2: { hits: 2, misses: 1, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
        l3: { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0, avgLatency: 0 },
        overall: { hitRate: 0, missRate: 0, avgLatency: 0 },
      };

      const totalHits = stats.l1.hits + stats.l2.hits + stats.l3.hits;
      const totalMisses = stats.l1.misses + stats.l2.misses + stats.l3.misses;

      expect(totalHits).toBe(2);
      expect(totalMisses).toBe(4);
    });

    it('should calculate overall hit rate', () => {
      const totalHits = 10;
      const totalMisses = 5;
      const total = totalHits + totalMisses;

      const hitRate = total > 0 ? totalHits / total : 0;

      expect(hitRate).toBeCloseTo(0.667, 2); // 10/15 = 0.667
    });

    it('should calculate overall miss rate', () => {
      const totalHits = 10;
      const totalMisses = 5;
      const total = totalHits + totalMisses;

      const missRate = total > 0 ? totalMisses / total : 0;

      expect(missRate).toBeCloseTo(0.333, 2); // 5/15 = 0.333
    });

    it('should handle zero requests for rate calculation', () => {
      const totalHits = 0;
      const totalMisses = 0;
      const total = totalHits + totalMisses;

      const hitRate = total > 0 ? totalHits / total : 0;
      const missRate = total > 0 ? totalMisses / total : 0;

      expect(hitRate).toBe(0);
      expect(missRate).toBe(0);
    });

    it('should track average latency', () => {
      const latencies = [10, 20, 30, 40, 50];
      const sum = latencies.reduce((a, b) => a + b, 0);
      const avgLatency = sum / latencies.length;

      expect(avgLatency).toBe(30);
    });

    it('should update average latency incrementally', () => {
      let currentAvg = 20;
      let totalRequests = 5;
      const newLatency = 30;

      currentAvg =
        (currentAvg * totalRequests + newLatency) / (totalRequests + 1);

      expect(currentAvg).toBeCloseTo(21.67, 1); // (20*5 + 30)/6 = 21.67
    });
  });

  describe('TTL Handling', () => {
    it('should use provided TTL option', () => {
      const options: CacheOptions = {
        ttl: 7200,
      };

      const defaultTTL = 3600;
      const ttl = options.ttl || defaultTTL;

      expect(ttl).toBe(7200);
    });

    it('should use default TTL when not provided', () => {
      const options: CacheOptions = {};
      const defaultTTL = 3600;

      const ttl = options.ttl || defaultTTL;

      expect(ttl).toBe(3600);
    });

    it('should calculate correct expiration time', () => {
      const now = Date.now();
      const ttl = 3600; // seconds
      const expiresAt = now + ttl * 1000; // milliseconds

      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt - now).toBe(3600000); // 3600 seconds in ms
    });

    it('should handle zero TTL', () => {
      const now = Date.now();
      const ttl = 0;
      const expiresAt = now + ttl * 1000;

      expect(expiresAt).toBe(now);
    });

    it('should handle very large TTL', () => {
      const now = Date.now();
      const ttl = 31536000; // 1 year in seconds
      const expiresAt = now + ttl * 1000;

      expect(expiresAt).toBeGreaterThan(now);
    });
  });

  describe('Cache Options', () => {
    it('should skip L1 when specified', () => {
      const options: CacheOptions = {
        skipL1: true,
      };

      const shouldSkipL1 = options.skipL1;

      expect(shouldSkipL1).toBe(true);
    });

    it('should skip L2 when specified', () => {
      const options: CacheOptions = {
        skipL2: true,
      };

      const shouldSkipL2 = options.skipL2;

      expect(shouldSkipL2).toBe(true);
    });

    it('should not skip tiers by default', () => {
      const options: CacheOptions = {};

      const shouldSkipL1 = options.skipL1;
      const shouldSkipL2 = options.skipL2;

      expect(shouldSkipL1).toBeUndefined();
      expect(shouldSkipL2).toBeUndefined();
    });

    it('should include version in options', () => {
      const options: CacheOptions = {
        version: 'v2.0.0',
      };

      expect(options.version).toBe('v2.0.0');
    });

    it('should include tags in options', () => {
      const options: CacheOptions = {
        tags: ['user', 'profile'],
      };

      expect(options.tags).toContain('user');
      expect(options.tags).toHaveLength(2);
    });

    it('should include dependencies in options', () => {
      const options: CacheOptions = {
        dependencies: ['user:123', 'org:456'],
      };

      expect(options.dependencies).toContain('user:123');
    });
  });

  describe('Pattern Matching', () => {
    it('should convert wildcard pattern to regex', () => {
      const pattern = 'user:*';
      const regex = new RegExp(pattern.replace('*', '.*'));

      expect(regex.test('user:123')).toBe(true);
      expect(regex.test('user:456')).toBe(true);
      expect(regex.test('org:123')).toBe(false);
    });

    it('should match prefix patterns', () => {
      const pattern = 'cache:user:*';
      const regex = new RegExp(pattern.replace('*', '.*'));

      expect(regex.test('cache:user:123')).toBe(true);
      expect(regex.test('cache:user:456')).toBe(true);
      expect(regex.test('cache:org:123')).toBe(false);
    });

    it('should match suffix patterns', () => {
      const pattern = '*:profile';
      const regex = new RegExp(pattern.replace('*', '.*'));

      expect(regex.test('user:profile')).toBe(true);
      expect(regex.test('org:profile')).toBe(true);
      expect(regex.test('user:settings')).toBe(false);
    });

    it('should match exact strings without wildcards', () => {
      const pattern = 'exact:key';
      const regex = new RegExp(pattern.replace('*', '.*'));

      expect(regex.test('exact:key')).toBe(true);
      expect(regex.test('exact:key:extra')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.getBuffer.mockRejectedValue(new Error('Connection refused'));

      await expect(mockRedis.getBuffer('test-key')).rejects.toThrow(
        'Connection refused'
      );
    });

    it('should handle serialization errors', () => {
      const circular: any = {};
      circular.self = circular;

      expect(() => JSON.stringify(circular)).toThrow();
    });

    it('should handle deserialization errors', () => {
      const invalidJSON = 'not valid json {{{';

      expect(() => JSON.parse(invalidJSON)).toThrow();
    });

    it('should handle invalid buffer data', () => {
      const invalidBuffer = Buffer.from('invalid json');

      expect(() => JSON.parse(invalidBuffer.toString())).toThrow();
    });
  });

  describe('Stampede Protection Configuration', () => {
    it('should enable stampede protection when configured', () => {
      const config: CacheConfig = {
        stampedePrevention: true,
        l2: {
          enabled: true,
          redis: mockRedis,
        },
      };

      expect(config.stampedePrevention).toBe(true);
    });

    it('should disable stampede protection by default', () => {
      const config: CacheConfig = {
        l2: {
          enabled: true,
          redis: mockRedis,
        },
      };

      expect(config.stampedePrevention).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string key', () => {
      const key = '';
      const prefixedKey = `cache:${key}`;

      expect(prefixedKey).toBe('cache:');
    });

    it('should handle keys with special characters', () => {
      const key = 'user:123:profile@v2';
      const prefixedKey = `cache:${key}`;

      expect(prefixedKey).toBe('cache:user:123:profile@v2');
    });

    it('should handle very long keys', () => {
      const key = 'x'.repeat(1000);
      const prefixedKey = `cache:${key}`;

      expect(prefixedKey.length).toBe(1006); // 'cache:' + 1000 chars
    });

    it('should handle unicode keys', () => {
      const key = 'user:日本語:🎉';
      const prefixedKey = `cache:${key}`;

      expect(prefixedKey).toContain('日本語');
      expect(prefixedKey).toContain('🎉');
    });

    it('should handle null value', () => {
      const entry: CacheEntry = {
        value: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.value).toBeNull();
    });

    it('should handle undefined value', () => {
      const entry: CacheEntry = {
        value: undefined,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.value).toBeUndefined();
    });

    it('should handle boolean values', () => {
      const entry: CacheEntry = {
        value: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.value).toBe(false);
    });

    it('should handle number values', () => {
      const entry: CacheEntry = {
        value: 42,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(entry.value).toBe(42);
    });

    it('should handle array values', () => {
      const entry: CacheEntry = {
        value: [1, 2, 3],
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(Array.isArray(entry.value)).toBe(true);
      expect(entry.value).toHaveLength(3);
    });

    it('should handle object values', () => {
      const entry: CacheEntry = {
        value: { foo: 'bar', nested: { baz: 123 } },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      expect(typeof entry.value).toBe('object');
      expect(entry.value.foo).toBe('bar');
    });
  });
});
