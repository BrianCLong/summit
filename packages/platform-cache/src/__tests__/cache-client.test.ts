import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheClient } from '../cache-client.js';
import type { CacheConfig, CacheMetrics, CacheProvider } from '../types.js';

function createMockProvider(name: string): CacheProvider {
  const store = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockImplementation(async <T>(key: string): Promise<T | null> => {
      const entry = store.get(key);
      if (!entry || entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    }),
    set: vi.fn().mockImplementation(async <T>(key: string, value: T, ttl?: number): Promise<void> => {
      const expiresAt = Date.now() + (ttl ?? 300) * 1000;
      store.set(key, { value, expiresAt });
    }),
    delete: vi.fn().mockImplementation(async (key: string): Promise<boolean> => {
      return store.delete(key);
    }),
    exists: vi.fn().mockImplementation(async (key: string): Promise<boolean> => {
      const entry = store.get(key);
      return entry !== undefined && entry.expiresAt > Date.now();
    }),
    deletePattern: vi.fn().mockImplementation(async (pattern: string): Promise<number> => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      let count = 0;
      for (const key of store.keys()) {
        if (regex.test(key)) {
          store.delete(key);
          count++;
        }
      }
      return count;
    }),
    mget: vi.fn().mockImplementation(async <T>(keys: string[]): Promise<(T | null)[]> => {
      return Promise.all(keys.map(async (key) => {
        const entry = store.get(key);
        if (!entry || entry.expiresAt < Date.now()) {
          return null;
        }
        return entry.value as T;
      }));
    }),
    mset: vi.fn().mockImplementation(async <T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> => {
      for (const entry of entries) {
        const expiresAt = Date.now() + (entry.ttl ?? 300) * 1000;
        store.set(entry.key, { value: entry.value, expiresAt });
      }
    }),
    ttl: vi.fn().mockImplementation(async (key: string): Promise<number> => {
      const entry = store.get(key);
      if (!entry) return -2;
      const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -1;
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMetrics(): CacheMetrics {
  return {
    recordHit: vi.fn(),
    recordMiss: vi.fn(),
    recordGetLatency: vi.fn(),
    recordSetLatency: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      hitRate: 0,
      localHits: 0,
      redisHits: 0,
      localSize: 0,
      redisKeys: 0,
      avgGetLatency: 0,
      avgSetLatency: 0,
    }),
    reset: vi.fn(),
  };
}

describe('CacheClient', () => {
  let localProvider: CacheProvider;
  let redisProvider: CacheProvider;
  let metrics: CacheMetrics;
  let config: CacheConfig;
  let client: CacheClient;

  beforeEach(() => {
    localProvider = createMockProvider('local');
    redisProvider = createMockProvider('redis');
    metrics = createMockMetrics();
    config = {
      namespace: 'test',
      defaultTtl: 300,
      maxTtl: 3600,
      enableMetrics: true,
      local: {
        enabled: true,
        maxSize: 100,
        ttl: 60,
      },
      redis: {
        enabled: true,
        host: 'localhost',
        port: 6379,
        db: 0,
        keyPrefix: 'cache:',
        maxRetriesPerRequest: 3,
      },
    };
    client = new CacheClient(config, localProvider, redisProvider, metrics);
  });

  describe('get', () => {
    it('should return null for non-existent keys', async () => {
      const result = await client.get('non-existent');
      expect(result).toBeNull();
      expect(metrics.recordMiss).toHaveBeenCalled();
    });

    it('should return value from local cache first', async () => {
      const testValue = { data: 'test' };
      const entry = {
        value: testValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'local' as const,
      };

      vi.mocked(localProvider.get).mockResolvedValueOnce(entry);

      const result = await client.get('test-key');
      expect(result).not.toBeNull();
      expect(result?.value).toEqual(testValue);
      expect(result?.source).toBe('local');
      expect(metrics.recordHit).toHaveBeenCalledWith('local');
    });

    it('should fallback to Redis when local cache misses', async () => {
      const testValue = { data: 'from-redis' };
      const entry = {
        value: testValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'redis' as const,
      };

      vi.mocked(localProvider.get).mockResolvedValueOnce(null);
      vi.mocked(redisProvider.get).mockResolvedValueOnce(entry);

      const result = await client.get('test-key');
      expect(result).not.toBeNull();
      expect(result?.value).toEqual(testValue);
      expect(result?.source).toBe('redis');
      expect(metrics.recordHit).toHaveBeenCalledWith('redis');
    });

    it('should skip local cache when option is set', async () => {
      const testValue = { data: 'from-redis' };
      const entry = {
        value: testValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'redis' as const,
      };

      vi.mocked(redisProvider.get).mockResolvedValueOnce(entry);

      const result = await client.get('test-key', { skipLocal: true });
      expect(result).not.toBeNull();
      expect(localProvider.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in both caches', async () => {
      const testValue = { data: 'test' };
      await client.set('test-key', testValue);

      expect(localProvider.set).toHaveBeenCalled();
      expect(redisProvider.set).toHaveBeenCalled();
      expect(metrics.recordSetLatency).toHaveBeenCalled();
    });

    it('should respect TTL option', async () => {
      const testValue = { data: 'test' };
      await client.set('test-key', testValue, { ttl: 600 });

      expect(redisProvider.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: testValue }),
        600
      );
    });

    it('should cap TTL to maxTtl', async () => {
      const testValue = { data: 'test' };
      await client.set('test-key', testValue, { ttl: 99999 });

      expect(redisProvider.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: testValue }),
        3600 // maxTtl
      );
    });

    it('should skip local cache when option is set', async () => {
      const testValue = { data: 'test' };
      await client.set('test-key', testValue, { skipLocal: true });

      expect(localProvider.set).not.toHaveBeenCalled();
      expect(redisProvider.set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete from both caches', async () => {
      vi.mocked(localProvider.delete).mockResolvedValueOnce(true);
      vi.mocked(redisProvider.delete).mockResolvedValueOnce(true);

      const result = await client.delete('test-key');
      expect(result).toBe(true);
      expect(localProvider.delete).toHaveBeenCalled();
      expect(redisProvider.delete).toHaveBeenCalled();
    });

    it('should return true if any cache had the key', async () => {
      vi.mocked(localProvider.delete).mockResolvedValueOnce(false);
      vi.mocked(redisProvider.delete).mockResolvedValueOnce(true);

      const result = await client.delete('test-key');
      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should check local cache first', async () => {
      vi.mocked(localProvider.exists).mockResolvedValueOnce(true);

      const result = await client.exists('test-key');
      expect(result).toBe(true);
      expect(redisProvider.exists).not.toHaveBeenCalled();
    });

    it('should fallback to Redis when not in local', async () => {
      vi.mocked(localProvider.exists).mockResolvedValueOnce(false);
      vi.mocked(redisProvider.exists).mockResolvedValueOnce(true);

      const result = await client.exists('test-key');
      expect(result).toBe(true);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when exists', async () => {
      const cachedValue = { data: 'cached' };
      const entry = {
        value: cachedValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        source: 'local' as const,
      };

      vi.mocked(localProvider.get).mockResolvedValueOnce(entry);

      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const result = await client.getOrSet('test-key', fetchFn);

      expect(result.value).toEqual(cachedValue);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache when not exists', async () => {
      vi.mocked(localProvider.get).mockResolvedValueOnce(null);
      vi.mocked(redisProvider.get).mockResolvedValueOnce(null);

      const freshValue = { data: 'fresh' };
      const fetchFn = vi.fn().mockResolvedValue(freshValue);

      const result = await client.getOrSet('test-key', fetchFn);

      expect(result.value).toEqual(freshValue);
      expect(result.source).toBe('origin');
      expect(fetchFn).toHaveBeenCalled();
      expect(localProvider.set).toHaveBeenCalled();
      expect(redisProvider.set).toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete matching keys', async () => {
      vi.mocked(redisProvider.deletePattern).mockResolvedValueOnce(5);

      const count = await client.invalidatePattern('user:*');
      expect(count).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return metrics stats', () => {
      const stats = client.getStats();
      expect(metrics.getStats).toHaveBeenCalled();
      expect(stats).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close Redis provider', async () => {
      await client.close();
      expect(redisProvider.close).toHaveBeenCalled();
    });
  });
});
