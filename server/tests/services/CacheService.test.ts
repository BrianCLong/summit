import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CacheService } from '../../src/services/CacheService';

// Mock deps
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scanStream: jest.fn(),
};

jest.mock('../../src/config/database.js', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../src/config.js', () => ({
    cfg: {
        CACHE_TTL_DEFAULT: 300,
        CACHE_ENABLED: true
    }
}));

jest.mock('../../src/utils/metrics.js', () => ({
  PrometheusMetrics: class MockMetrics {
      createCounter = jest.fn();
      incrementCounter = jest.fn();
  }
}));

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CacheService();
  });

  it('should get value from cache', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

    const result = await cache.get('test-key');

    expect(result).toEqual({ foo: 'bar' });
    expect(mockRedis.get).toHaveBeenCalledWith('cache:test-key');
  });

  it('should return null on miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });

  it('should set value', async () => {
    await cache.set('test-key', { foo: 'bar' }, 60);

    expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:test-key',
        60,
        JSON.stringify({ foo: 'bar' })
    );
  });

  it('getOrSet should return cached value if present', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ cached: true }));
    const factory = jest.fn();

    const result = await cache.getOrSet('key', factory);

    expect(result).toEqual({ cached: true });
    expect(factory).not.toHaveBeenCalled();
  });

  it('getOrSet should fetch and cache if missing', async () => {
    mockRedis.get.mockResolvedValue(null);
    const factory = jest.fn().mockResolvedValue({ fresh: true });

    const result = await cache.getOrSet('key', factory);

    expect(result).toEqual({ fresh: true });
    expect(factory).toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalled();
  });
});
