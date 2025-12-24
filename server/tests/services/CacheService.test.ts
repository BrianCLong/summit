import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CacheService } from '../../src/services/CacheService.js';

const mockRedis = {
  get: jest.fn<(key: string) => Promise<string | null>>(),
  setex: jest.fn<(key: string, ttl: number, value: string) => Promise<void>>(),
  del: jest.fn<(key: string) => Promise<number>>(),
};

jest.mock('../../src/config/database.js', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../src/config.js', () => ({
  cfg: {
    CACHE_TTL_DEFAULT: 300,
    CACHE_ENABLED: true,
  },
}));

jest.mock('../../src/config/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CacheService();
    mockRedis.get.mockResolvedValue(null);
  });

  it('returns null when key not in cache', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await cache.get<{ from: string }>('test');

    expect(result).toBeNull();
    expect(mockRedis.get).toHaveBeenCalledWith('cache:test');
  });

  it('returns parsed value from redis', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ payload: true }));

    const result = await cache.get<{ payload: boolean }>('redis-key');

    expect(result).toEqual({ payload: true });
    expect(mockRedis.get).toHaveBeenCalledWith('cache:redis-key');
  });

  it('writes to redis on set', async () => {
    await cache.set('write-key', { foo: 'bar' }, 45);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:write-key',
      45,
      JSON.stringify({ foo: 'bar' }),
    );
  });

  it('uses default TTL when not specified', async () => {
    await cache.set('default-ttl-key', { data: 123 });

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:default-ttl-key',
      300, // default TTL from config
      JSON.stringify({ data: 123 }),
    );
  });

  it('getOrSet returns cached value and skips factory', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ cached: true }));
    const factory = jest.fn<() => Promise<{ cached: boolean }>>();

    const result = await cache.getOrSet('hydrate', factory);

    expect(result).toEqual({ cached: true });
    expect(factory).not.toHaveBeenCalled();
  });

  it('getOrSet calls factory and populates cache when missing', async () => {
    mockRedis.get.mockResolvedValue(null);
    const factory = jest.fn<() => Promise<{ fresh: boolean }>>().mockResolvedValue({ fresh: true });

    const result = await cache.getOrSet('hydrate', factory, 25);

    expect(result).toEqual({ fresh: true });
    expect(factory).toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:hydrate',
      25,
      JSON.stringify({ fresh: true }),
    );
  });

  it('del removes key from redis', async () => {
    await cache.del('temp');

    expect(mockRedis.del).toHaveBeenCalledWith('cache:temp');
  });
});
