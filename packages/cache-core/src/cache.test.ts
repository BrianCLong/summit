import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache, createCache } from './cache.js';
import { CacheTier } from './types.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({
      namespace: 'test',
      tiers: [CacheTier.L1], // L1 only for unit tests
      defaultTtlSeconds: 60,
      metrics: false,
      l1: { maxBytes: 1024 * 1024 }, // 1MB
    });
  });

  afterEach(async () => {
    await cache.shutdown();
  });

  describe('get/set', () => {
    it('should store and retrieve a value', async () => {
      await cache.set('key1', { name: 'test' });
      const result = await cache.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      vi.useFakeTimers();

      await cache.set('shortTtl', 'value', { ttlSeconds: 1 });

      // Should exist immediately
      let result = await cache.get('shortTtl');
      expect(result).toBe('value');

      // Advance time past TTL
      vi.advanceTimersByTime(2000);

      // Should be expired
      result = await cache.get('shortTtl');
      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it('should handle different value types', async () => {
      await cache.set('string', 'hello');
      await cache.set('number', 42);
      await cache.set('boolean', true);
      await cache.set('array', [1, 2, 3]);
      await cache.set('object', { nested: { value: 'deep' } });

      expect(await cache.get('string')).toBe('hello');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
      expect(await cache.get('array')).toEqual([1, 2, 3]);
      expect(await cache.get('object')).toEqual({ nested: { value: 'deep' } });
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await cache.set('toDelete', 'value');
      expect(await cache.get('toDelete')).toBe('value');

      await cache.delete('toDelete');
      expect(await cache.get('toDelete')).toBeNull();
    });

    it('should not error when deleting nonexistent key', async () => {
      await expect(cache.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('user:1', 'alice');
      await cache.set('user:2', 'bob');
      await cache.set('config:1', 'value');

      const deleted = await cache.deleteByPattern('user:*');
      expect(deleted).toBe(2);

      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('config:1')).toBe('value');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cache.set('existing', 'cached');

      const loader = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrSet('existing', loader);

      expect(result).toBe('cached');
      expect(loader).not.toHaveBeenCalled();
    });

    it('should call loader and cache result if not exists', async () => {
      const loader = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrSet('new', loader);

      expect(result).toBe('fresh');
      expect(loader).toHaveBeenCalledTimes(1);

      // Should be cached now
      const cached = await cache.get('new');
      expect(cached).toBe('fresh');
    });

    it('should prevent stampede (deduplicate concurrent calls)', async () => {
      let callCount = 0;
      const loader = vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return `result-${callCount}`;
      });

      // Start multiple concurrent requests
      const [r1, r2, r3] = await Promise.all([
        cache.getOrSet('stampede', loader),
        cache.getOrSet('stampede', loader),
        cache.getOrSet('stampede', loader),
      ]);

      // Loader should only be called once
      expect(loader).toHaveBeenCalledTimes(1);

      // All should get the same result
      expect(r1).toBe('result-1');
      expect(r2).toBe('result-1');
      expect(r3).toBe('result-1');
    });
  });

  describe('tags', () => {
    it('should support tag-based invalidation', async () => {
      await cache.set('entity:1', { id: 1 }, { tags: ['investigation:100'] });
      await cache.set('entity:2', { id: 2 }, { tags: ['investigation:100'] });
      await cache.set('entity:3', { id: 3 }, { tags: ['investigation:200'] });

      expect(await cache.get('entity:1')).toEqual({ id: 1 });
      expect(await cache.get('entity:2')).toEqual({ id: 2 });
      expect(await cache.get('entity:3')).toEqual({ id: 3 });

      // Invalidate by tag
      await cache.invalidateByTag('investigation:100');

      expect(await cache.get('entity:1')).toBeNull();
      expect(await cache.get('entity:2')).toBeNull();
      expect(await cache.get('entity:3')).toEqual({ id: 3 }); // Still exists
    });
  });

  describe('stats', () => {
    it('should track hits and misses', async () => {
      await cache.set('key', 'value');

      await cache.get('key'); // hit
      await cache.get('key'); // hit
      await cache.get('missing'); // miss

      const stats = cache.getStats();

      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      await cache.clear();

      expect(await cache.get('a')).toBeNull();
      expect(await cache.get('b')).toBeNull();
      expect(await cache.get('c')).toBeNull();
    });
  });

  describe('enable/disable', () => {
    it('should bypass cache when disabled', async () => {
      await cache.set('key', 'value');
      expect(await cache.get('key')).toBe('value');

      cache.disable();

      expect(await cache.get('key')).toBeNull();
      expect(cache.isEnabled()).toBe(false);

      cache.enable();

      expect(await cache.get('key')).toBe('value');
      expect(cache.isEnabled()).toBe(true);
    });
  });
});

describe('createCache', () => {
  it('should create a cache instance', () => {
    const cache = createCache({
      namespace: 'test',
      tiers: [CacheTier.L1],
    });

    expect(cache).toBeDefined();
    expect(cache.isEnabled()).toBe(true);
  });
});
