
import { jest } from '@jest/globals';
import zlib from 'zlib';

// Mock logger
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock LRUCache
jest.unstable_mockModule('lru-cache', () => ({
  LRUCache: jest.fn(),
}));

const { DistributedCacheService } = await import('../DistributedCacheService.js');
const { LRUCache } = await import('lru-cache');

describe('DistributedCacheService', () => {
  let cacheService: DistributedCacheService;
  let mockRedis: any;
  let mockSubscriber: any;
  let mockL1Cache: any;

  beforeEach(() => {
    // Reset mocks
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      smembers: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
      publish: jest.fn(),
      duplicate: jest.fn(),
      pipeline: jest.fn(),
      quit: jest.fn(),
    };

    mockSubscriber = {
      subscribe: jest.fn(),
      on: jest.fn(),
      unsubscribe: jest.fn(),
      quit: jest.fn(),
    };

    mockRedis.duplicate.mockReturnValue(mockSubscriber);

    // Mock pipeline chain
    const mockPipeline = {
      setex: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    // Mock LRUCache
    mockL1Cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    (LRUCache as unknown as jest.Mock).mockReturnValue(mockL1Cache);

    cacheService = new DistributedCacheService(mockRedis, {
      defaultTTLSeconds: 60,
      enableInvalidation: true,
      compressionThreshold: 20 // Low threshold to force compression
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return value from L1 cache if present', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };

      mockL1Cache.get.mockReturnValue({
        value,
        expiresAt: Date.now() + 10000,
        tags: [],
        compressed: false
      });

      const result = await cacheService.get(key);

      expect(result.data).toEqual(value);
      expect(mockL1Cache.get).toHaveBeenCalledWith(`cache:${key}`);
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should return value from L2 cache if L1 miss', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };
      const cachedEntry = {
        value,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        tags: [],
        compressed: false
      };

      mockL1Cache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedEntry));

      const result = await cacheService.get(key);

      expect(result.data).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalledWith(`cache:${key}`);
      expect(mockL1Cache.set).toHaveBeenCalled();
    });

    it('should decompress value from L2 if compressed', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };
      const compressedValue = zlib.gzipSync(JSON.stringify(value)).toString('base64');

      const cachedEntry = {
        value: compressedValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        tags: [],
        compressed: true
      };

      mockL1Cache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedEntry));

      const result = await cacheService.get(key);

      expect(result.data).toEqual(value);
    });
  });

  describe('set', () => {
    it('should set value in L2 and L1', async () => {
      const key = 'test-key';
      const value = { foo: 'bar' };

      await cacheService.set(key, value);

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockL1Cache.set).toHaveBeenCalled();
    });

    it('should compress value if size exceeds threshold', async () => {
      const key = 'large-key';
      const value = { data: 'x'.repeat(100) }; // Should exceed 20 bytes threshold

      await cacheService.set(key, value);

      const setCall = mockRedis.setex.mock.calls[0];
      const storedData = JSON.parse(setCall[2]);

      expect(storedData.compressed).toBe(true);
      // Verify decompression
      const decompressed = JSON.parse(zlib.gunzipSync(Buffer.from(storedData.value, 'base64')).toString());
      expect(decompressed).toEqual(value);
    });
  });

  describe('delete', () => {
    it('should delete from L1 and L2 and broadcast invalidation', async () => {
      const key = 'test-key';

      await cacheService.delete(key);

      expect(mockL1Cache.delete).toHaveBeenCalledWith(`cache:${key}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`cache:${key}`);
      expect(mockRedis.publish).toHaveBeenCalledWith('cache:invalidation', `cache:${key}`);
    });
  });

  describe('deleteByTag', () => {
    it('should find keys by tag and delete them', async () => {
      const tag = 'user:123';
      const keys = ['cache:key1', 'cache:key2'];

      mockRedis.smembers.mockResolvedValue(keys);

      await cacheService.deleteByTag(tag);

      expect(mockRedis.smembers).toHaveBeenCalledWith(`cache:tag:${tag}`);
      expect(mockL1Cache.delete).toHaveBeenCalledWith('cache:key1');
      expect(mockL1Cache.delete).toHaveBeenCalledWith('cache:key2');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:key1', 'cache:key2', `cache:tag:${tag}`);
    });
  });
});
