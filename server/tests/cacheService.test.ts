import { CacheService } from '../src/services/CacheService.js';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getCacheManager, _resetCacheManagerForTesting } from '../src/cache/factory.js';

// Mock dependencies
jest.mock('../src/config/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../src/utils/metrics.js', () => ({
  PrometheusMetrics: class {
    createCounter() {}
    incrementCounter() {}
  }
}));

// We need to mock getRedisClient called by factory
jest.mock('../src/config/database.js', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    pipeline: jest.fn(() => ({
        setex: jest.fn(),
        del: jest.fn(),
        exec: jest.fn(),
    })),
  })),
}));

// Mock AdvancedCachingStrategy
jest.mock('../src/cache/AdvancedCachingStrategy.js', () => {
    return {
        default: class MockCacheManager {
            private storage = new Map<string, any>();
            constructor() {}

            async get(key: string) {
                return this.storage.get(key) || null;
            }
            async set(key: string, value: any, options?: any) {
                this.storage.set(key, value);
            }
            async delete(key: string) {
                this.storage.delete(key);
            }
            async invalidateByPattern(pattern: string) {
                // simple mock pattern match (contains)
                const p = pattern.replace('*', '');
                for (const key of this.storage.keys()) {
                    if (key.includes(p)) {
                        this.storage.delete(key);
                    }
                }
            }
            async getOrSet(key: string, factory: any, options: any) {
                if (this.storage.has(key)) return this.storage.get(key);
                const val = await factory();
                this.storage.set(key, val);
                return val;
            }
        }
    }
});

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    _resetCacheManagerForTesting();
    cache = new CacheService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null on miss', async () => {
    const v = await cache.get('missing');
    expect(v).toBeNull();
  });

  it('sets and gets a value', async () => {
    await cache.set('k1', { a: 1 }, 1);
    const v = await cache.get<{ a: number }>('k1');
    expect(v).toEqual({ a: 1 });
  });

  it('delete clears a key', async () => {
    await cache.set('k3', 'y', 5);
    await cache.del('k3');
    const v = await cache.get('k3');
    expect(v).toBeNull();
  });

  it('getOrSet returns value', async () => {
      const val = await cache.getOrSet('k4', async () => 'computed');
      expect(val).toBe('computed');
      const val2 = await cache.get('k4');
      expect(val2).toBe('computed');
  });
});
