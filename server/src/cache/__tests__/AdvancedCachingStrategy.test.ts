
import { CacheManager, CacheEntry, RedisClientInterface } from '../AdvancedCachingStrategy.ts';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Redis Client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  scan: jest.fn(),
  publish: jest.fn(),
  on: jest.fn(),
  pipeline: jest.fn(() => ({
    setex: jest.fn(),
    exec: jest.fn(),
  })),
  quit: jest.fn(),
} as unknown as RedisClientInterface;

describe('AdvancedCachingStrategy', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager(mockRedisClient, {
      defaultTtl: 60,
      maxL1Entries: 10,
    });
  });

  afterEach(async () => {
    await cacheManager.shutdown();
  });

  describe('L1 Cache (In-Memory)', () => {
    it('should store and retrieve values from L1 cache', async () => {
      await cacheManager.set('key1', 'value1', { skipL2: true });
      const value = await cacheManager.get('key1', { skipL2: true });
      expect(value).toBe('value1');
    });

    it('should respect TTL in L1 cache', async () => {
      // Set with short TTL
      await cacheManager.set('key1', 'value1', { ttl: 0.1, skipL2: true }); // 100ms

      // Immediate retrieval
      let value = await cacheManager.get('key1', { skipL2: true });
      expect(value).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      value = await cacheManager.get('key1', { skipL2: true });
      expect(value).toBeNull();
    });

    it('should evict items when L1 is full (LRU)', async () => {
      // Initialize with small size
      cacheManager = new CacheManager(mockRedisClient, {
        maxL1Entries: 2,
        l1EvictionPolicy: 'lru'
      });

      await cacheManager.set('k1', 'v1', { skipL2: true });
      await cacheManager.set('k2', 'v2', { skipL2: true });

      // Access k1 to make k2 the LRU
      await cacheManager.get('k1', { skipL2: true });

      // Add k3, which should evict k2
      await cacheManager.set('k3', 'v3', { skipL2: true });

      expect(await cacheManager.get('k1', { skipL2: true })).toBe('v1');
      expect(await cacheManager.get('k3', { skipL2: true })).toBe('v3');
      expect(await cacheManager.get('k2', { skipL2: true })).toBeNull();
    });
  });

  describe('L2 Cache (Redis)', () => {
    it('should fallback to L2 if L1 misses', async () => {
      const entry: CacheEntry<string> = {
        value: 'redis-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        accessCount: 0,
        lastAccessedAt: Date.now(),
        tags: [],
        version: 1,
      };

      (mockRedisClient.get as any).mockResolvedValue(JSON.stringify(entry));

      const value = await cacheManager.get('missing-in-l1');
      expect(value).toBe('redis-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('ig:cache:missing-in-l1');
    });

    it('should populate L1 after L2 hit', async () => {
      const entry: CacheEntry<string> = {
        value: 'redis-value',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        accessCount: 0,
        lastAccessedAt: Date.now(),
        tags: [],
        version: 1,
      };

      (mockRedisClient.get as any).mockResolvedValue(JSON.stringify(entry));

      await cacheManager.get('key1');

      // Second call should hit L1 (no redis call)
      (mockRedisClient.get as any).mockClear();
      const value = await cacheManager.get('key1');

      expect(value).toBe('redis-value');
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should write to both L1 and L2 on set', async () => {
      await cacheManager.set('key1', 'value1');

      // Check L1
      const l1Value = await cacheManager.get('key1', { skipL2: true });
      expect(l1Value).toBe('value1');

      // Check L2
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should delete from both L1 and L2', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.delete('key1');

      expect(await cacheManager.get('key1', { skipL2: true })).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('ig:cache:key1');
    });
  });
});
