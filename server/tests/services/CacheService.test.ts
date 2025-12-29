import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Create mock cache manager
const mockCacheManager = {
  get: jest.fn<(key: string) => Promise<any>>(),
  set: jest.fn<(key: string, value: any, options?: any) => Promise<void>>(),
  delete: jest.fn<(key: string) => Promise<void>>(),
  invalidateByPattern: jest.fn<(pattern: string) => Promise<void>>(),
  getOrSet: jest.fn<(key: string, factory: () => Promise<any>, options?: any) => Promise<any>>(),
};

jest.mock('../../src/cache/factory.js', () => ({
  getCacheManager: () => mockCacheManager,
  _resetCacheManagerForTesting: jest.fn(),
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

jest.mock('../../src/utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter() {}
    incrementCounter() {}
  },
}));

// Import after mocks are set up
import { CacheService } from '../../src/services/CacheService.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    cache = new CacheService();
  });

  it('returns null when key not in cache', async () => {
    mockCacheManager.get.mockResolvedValue(null);

    const result = await cache.get<{ from: string }>('test');

    expect(result).toBeNull();
    expect(mockCacheManager.get).toHaveBeenCalledWith('cache:test');
  });

  it('returns value from cache manager', async () => {
    mockCacheManager.get.mockResolvedValue({ payload: true });

    const result = await cache.get<{ payload: boolean }>('redis-key');

    expect(result).toEqual({ payload: true });
    expect(mockCacheManager.get).toHaveBeenCalledWith('cache:redis-key');
  });

  it('writes to cache manager on set', async () => {
    await cache.set('write-key', { foo: 'bar' }, 45);

    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'cache:write-key',
      { foo: 'bar' },
      { ttl: 45 },
    );
  });

  it('uses default TTL when not specified', async () => {
    await cache.set('default-ttl-key', { data: 123 });

    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'cache:default-ttl-key',
      { data: 123 },
      { ttl: 300 }, // default TTL from config
    );
  });

  it('getOrSet returns cached value and skips factory', async () => {
    mockCacheManager.getOrSet.mockResolvedValue({ cached: true });
    const factory = jest.fn<() => Promise<{ cached: boolean }>>();

    const result = await cache.getOrSet('hydrate', factory);

    expect(result).toEqual({ cached: true });
    expect(mockCacheManager.getOrSet).toHaveBeenCalledWith(
      'cache:hydrate',
      factory,
      { ttl: 300 },
    );
  });

  it('getOrSet calls cache manager with custom TTL', async () => {
    mockCacheManager.getOrSet.mockResolvedValue({ fresh: true });
    const factory = jest.fn<() => Promise<{ fresh: boolean }>>().mockResolvedValue({ fresh: true });

    const result = await cache.getOrSet('hydrate', factory, 25);

    expect(result).toEqual({ fresh: true });
    expect(mockCacheManager.getOrSet).toHaveBeenCalledWith(
      'cache:hydrate',
      factory,
      { ttl: 25 },
    );
  });

  it('del removes key via cache manager', async () => {
    await cache.del('temp');

    expect(mockCacheManager.delete).toHaveBeenCalledWith('cache:temp');
  });
});
