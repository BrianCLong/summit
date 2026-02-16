
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DistributedCacheService } from '../DistributedCacheService.js';
import zlib from 'zlib';

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
    sadd: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
  })),
  publish: jest.fn(),
  scanStream: jest.fn(),
  keys: jest.fn(), // Should not be called but mocking just in case
} as unknown as any;

describe('DistributedCacheService Enhancements', () => {
  let cache: DistributedCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Low threshold to force compression
    cache = new DistributedCacheService(mockRedis, {
      keyPrefix: 'test:',
      defaultTTLSeconds: 60,
      enableInvalidation: false,
      compressionThreshold: 10 // Force compression for small objects
    });
  });

  it('should compress values using zlib when threshold exceeded', async () => {
    const value = { data: 'a'.repeat(50) }; // > 10 bytes

    await cache.set('test-key', value);

    expect(mockRedis.setex).toHaveBeenCalled();
    const args = (mockRedis.setex as jest.Mock).mock.calls[0];
    // args: [key, ttl, value]
    const storedValue = JSON.parse(args[2] as string);

    expect(storedValue.compressed).toBe(true);

    // Verify it is zlib compressed
    const buffer = Buffer.from(storedValue.value, 'base64');
    const decompressed = zlib.gunzipSync(buffer).toString();
    expect(JSON.parse(decompressed)).toEqual(value);
  });

  it('should decompress values correctly on get', async () => {
    const value = { data: 'test-decompress' };
    const compressedValue = zlib.gzipSync(JSON.stringify(value)).toString('base64');

    const entry = {
      value: compressedValue,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      tags: [],
      compressed: true
    };

    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(entry));

    // Clear L1 first to force L2 fetch (though new instance should be empty)

    const result = await cache.get('test-key');
    expect(result.data).toEqual(value);
  });

  it('should use scanStream for clearing cache', async () => {
      const keys = ['test:1', 'test:2'];
      const mockStream = {
          [Symbol.asyncIterator]: async function* () {
              yield keys;
          }
      };
      (mockRedis.scanStream as jest.Mock).mockReturnValue(mockStream);

      await cache.clear();

      expect(mockRedis.scanStream).toHaveBeenCalledWith({ match: 'test:*' });
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
  });
});
