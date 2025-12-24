import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CacheService } from '../../src/services/cacheService.js';

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
};

const cacheLocalGauge = { set: jest.fn() };

jest.mock('../../src/config/database.js', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../src/config.js', () => ({
  cfg: {
    CACHE_TTL_DEFAULT: 300,
    CACHE_ENABLED: true,
  },
}));

jest.mock('../../src/metrics/cacheMetrics.js', () => ({
  recHit: jest.fn(),
  recMiss: jest.fn(),
  recSet: jest.fn(),
  cacheLocalSize: {
    labels: jest.fn(() => cacheLocalGauge),
  },
}));

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CacheService();
    mockRedis.get.mockResolvedValue(null);
  });

  it('returns memory hits without touching redis', async () => {
    await cache.set('test', { from: 'memory' }, 60);
    mockRedis.get.mockResolvedValue(JSON.stringify({ from: 'redis' }));

    const result = await cache.get<{ from: string }>('test');

    expect(result).toEqual({ from: 'memory' });
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it('falls back to redis and seeds memory cache', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ payload: true }));

    const result = await cache.get<{ payload: boolean }>('redis-key');

    expect(result).toEqual({ payload: true });
    expect(mockRedis.get).toHaveBeenCalledWith('cache:redis-key');
    const memoryHit = await cache.get('redis-key');
    expect(memoryHit).toEqual({ payload: true });
  });

  it('writes to redis and memory on set', async () => {
    await cache.set('write-key', { foo: 'bar' }, 45);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:write-key',
      45,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(cacheLocalGauge.set).toHaveBeenCalledWith(1);
  });

  it('getOrSet returns cached value and skips factory', async () => {
    await cache.set('hydrate', { cached: true });
    const factory = jest.fn();

    const result = await cache.getOrSet('hydrate', factory);

    expect(result).toEqual({ cached: true });
    expect(factory).not.toHaveBeenCalled();
  });

  it('getOrSet populates cache when missing', async () => {
    const factory = jest.fn().mockResolvedValue({ fresh: true });

    const result = await cache.getOrSet('hydrate', factory, 25);

    expect(result).toEqual({ fresh: true });
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:hydrate',
      25,
      JSON.stringify({ fresh: true }),
    );
  });

  it('delete clears both layers', async () => {
    await cache.set('temp', { value: 1 });
    await cache.delete('temp');

    expect(mockRedis.del).toHaveBeenCalledWith('cache:temp');
    const result = await cache.get('temp');
    expect(result).toBeNull();
  });
});
