
import { jest } from '@jest/globals';
import { DistributedCacheService } from '../DistributedCacheService';
import zlib from 'zlib';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(() => ({
    setex: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
  })),
  duplicate: jest.fn(() => ({
    subscribe: jest.fn(),
    on: jest.fn(),
  })),
};

describe('DistributedCacheService Compression', () => {
  let service: DistributedCacheService;

  beforeEach(() => {
    service = new DistributedCacheService(mockRedis as any, {
      compressionThreshold: 10, // Low threshold to force compression
    });
    jest.clearAllMocks();
  });

  it('should compress large values using zlib (async)', async () => {
    const largeValue = { data: 'a'.repeat(100) };

    await service.set('test-key', largeValue);

    expect(mockRedis.setex).toHaveBeenCalled();
    const args = (mockRedis.setex as jest.Mock).mock.calls[0];
    const storedValue = JSON.parse(args[2] as string);

    expect(storedValue.compressed).toBe(true);
    expect(typeof storedValue.value).toBe('string');

    // Verify it is zlib compressed
    const buffer = Buffer.from(storedValue.value, 'base64');
    const decompressed = zlib.gunzipSync(buffer);
    const original = JSON.parse(decompressed.toString('utf-8'));

    expect(original).toEqual(largeValue);
  });

  it('should decompress values on get', async () => {
    const largeValue = { data: 'b'.repeat(100) };
    const buffer = Buffer.from(JSON.stringify(largeValue), 'utf-8');
    const compressedValue = zlib.gzipSync(buffer).toString('base64');

    const storedEntry = {
      value: compressedValue,
      compressed: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      tags: [],
    };

    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(storedEntry));

    const result = await service.get('test-key');

    expect(result.data).toEqual(largeValue);
  });

  it('should decompress legacy (uncompressed base64) values on get', async () => {
    const legacyValue = { data: 'legacy' };
    // Simulate legacy format: simple base64 of JSON string
    const buffer = Buffer.from(JSON.stringify(legacyValue), 'utf-8');
    const legacyCompressedValue = buffer.toString('base64');

    const storedEntry = {
      value: legacyCompressedValue,
      compressed: true, // Legacy code set this to true
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      tags: [],
    };

    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(storedEntry));

    const result = await service.get('test-legacy-key');

    expect(result.data).toEqual(legacyValue);
  });
});
