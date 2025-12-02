import { jest } from '@jest/globals';
import { mockEsmModule } from '../../../tests/utils/esmMock.js';

describe('responseCache', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores and retrieves values with TTL enforcement and index prefixing', async () => {
    const redisStore = new Map<string, string>();
    await mockEsmModule('../../db/redis.js', () => ({
      getRedisClient: () => ({
        get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
        set: jest.fn(async (key: string, value: string) => {
          redisStore.set(key, value);
          return 'OK';
        }),
        sAdd: jest.fn(),
        del: jest.fn(async (key: string) => {
          return redisStore.delete(key) ? 1 : 0;
        }),
        __isMock: false,
      }),
      isRedisMock: () => false,
    }));

    const {
      buildCacheKey,
      getCachedJson,
      setCachedJson,
      flushLocalCache,
    } = await import('../responseCache.js');

    flushLocalCache();
    const key = buildCacheKey('ns', 'item');
    const payload = { ok: true };

    await setCachedJson(key, payload, { ttlSeconds: 1, indexPrefixes: ['ns'] });
    const cachedValue = await getCachedJson<typeof payload>(key, { ttlSeconds: 1 });
    expect(cachedValue).toEqual(payload);

    jest.advanceTimersByTime(1500);
    const expired = await getCachedJson<typeof payload>(key, { ttlSeconds: 1 });
    expect(expired).toBeNull();
  });
});
