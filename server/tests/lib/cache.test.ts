
import { jest } from '@jest/globals';
import { CacheManager } from '../../src/cache/AdvancedCachingStrategy.js';
import { RedisClientInterface } from '../../src/cache/AdvancedCachingStrategy.js';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockRedisClient: jest.Mocked<RedisClientInterface>;

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      scan: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      pipeline: jest.fn(),
      quit: jest.fn(),
    } as unknown as jest.Mocked<RedisClientInterface>;

    cacheManager = new CacheManager(mockRedisClient, {
      defaultTtl: 60,
      enableMetrics: false
    });
  });

  afterEach(async () => {
    await cacheManager.shutdown();
  });

  it('should use L1 cache for repeated gets', async () => {
    const key = 'test-key';
    const value = { data: 'test-value' };

    // First get - should miss L1 and go to L2 (mocked to return null for now)
    (mockRedisClient.get as jest.Mock).mockResolvedValue(null);
    const result1 = await cacheManager.get(key);
    expect(result1).toBeNull();
    expect(mockRedisClient.get).toHaveBeenCalledTimes(1);

    // Set value
    await cacheManager.set(key, value);

    // Second get - should hit L1
    const result2 = await cacheManager.get(key);
    expect(result2).toEqual(value);
    // Redis get should not be called again
    expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
  });

  it('should fallback to L2 if L1 misses', async () => {
    const key = 'l2-key';
    const value = { foo: 'bar' };
    const cacheEntry = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      accessCount: 1,
      lastAccessedAt: Date.now(),
      tags: [],
      version: 1
    };

    (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

    const result = await cacheManager.get(key);
    expect(result).toEqual(value);
    expect(mockRedisClient.get).toHaveBeenCalled();
  });

  it('should handle circuit breaker on repeated redis errors', async () => {
    const key = 'error-key';
    (mockRedisClient.get as jest.Mock).mockRejectedValue(new Error('Redis down'));

    // Trigger failures
    for (let i = 0; i < 6; i++) {
        try {
            await cacheManager.get(key);
        } catch (e) {
            // expected
        }
    }

    // Now circuit should be open, so it shouldn't call redis
    (mockRedisClient.get as jest.Mock).mockClear();
    const result = await cacheManager.get(key);
    expect(result).toBeNull(); // Default behavior when L2 skipped/failed
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });
});
