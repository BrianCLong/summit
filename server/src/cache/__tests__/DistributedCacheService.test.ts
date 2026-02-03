import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { DistributedCacheService } from '../DistributedCacheService.js';
import { Redis } from 'ioredis';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  duplicate: jest.fn(() => ({
    subscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    unsubscribe: jest.fn(),
  })),
  pipeline: jest.fn(() => ({
    setex: jest.fn(),
    exec: jest.fn(),
  })),
  publish: jest.fn(),
} as unknown as Redis;

describe('DistributedCacheService', () => {
  let cache: DistributedCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new DistributedCacheService(mockRedis, {
      defaultTTLSeconds: 60,
      enableInvalidation: false
    });
  });

  afterEach(async () => {
    await cache.shutdown();
  });

  describe('get', () => {
    it('should return L1 cache hit if available', async () => {
      // Seed L1
      await cache.set('foo', 'bar');
      (mockRedis.get as jest.Mock).mockClear(); // Clear any calls from set()

      const result = await cache.get('foo');

      expect(result.data).toBe('bar');
      expect(result.provenance.source).toContain('L1');
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should fetch from L2 if L1 miss', async () => {
      const entry = {
        value: 'baz',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        tags: [],
        compressed: false
      };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(entry));

      const result = await cache.get('foo');

      expect(result.data).toBe('baz');
      expect(result.provenance.source).toContain('L2');
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should return null if miss in both', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await cache.get('missing');

      expect(result.data).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in L1 and L2', async () => {
      const result = await cache.set('key', 'value');

      expect(result.data).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();

      // Verify L1
      const l1Result = await cache.get('key');
      expect(l1Result.provenance.source).toContain('L1');
    });
  });
});
