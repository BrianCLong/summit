import { jest } from '@jest/globals';
import { mockEsmModule } from '../../../tests/utils/esmMock.js';

const buildRedisMock = () => {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    store,
    sets,
    client: {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      ttl: jest.fn(async () => 60),
      sAdd: jest.fn(async (key: string, value: string) => {
        const set = sets.get(key) ?? new Set<string>();
        set.add(value);
        sets.set(key, set);
      }),
      sMembers: jest.fn(async (key: string) => Array.from(sets.get(key) ?? [])),
      sRem: jest.fn(async (key: string, members: string[]) => {
        const set = sets.get(key);
        if (!set) return 0;
        let removed = 0;
        members.forEach((m) => {
          if (set.delete(m)) removed += 1;
        });
        sets.set(key, set);
        return removed;
      }),
      del: jest.fn(async (...keys: string[]) => {
        let removed = 0;
        keys.forEach((key) => {
          if (store.delete(key)) removed += 1;
        });
        return removed;
      }),
      publish: jest.fn(),
      expire: jest.fn(),
    },
  };
};

describe('responseCache', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.REDIS_DISABLE;
  });

  it('stores and retrieves values with TTL enforcement and index prefixing', async () => {
    const redisMock = buildRedisMock();
    await mockEsmModule('../../config/database.js', () => ({
      getRedisClient: () => redisMock.client,
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

    await setCachedJson(key, payload, { ttlSeconds: 1, indexPrefixes: ['ns'], tenant: 't1' });
    const cachedValue = await getCachedJson<typeof payload>(key, { ttlSeconds: 1, tenant: 't1' });
    expect(cachedValue).toEqual(payload);

    jest.advanceTimersByTime(1500);
    const expired = await getCachedJson<typeof payload>(key, { ttlSeconds: 1 });
    expect(expired).toBeNull();

    expect(redisMock.client.sAdd).toHaveBeenCalledWith('idx:ns', key);
    expect(redisMock.client.sAdd).toHaveBeenCalledWith('idx:tag:ns', key);
  });

  it('serves stale-while-revalidate and refreshes in the background', async () => {
    process.env.REDIS_DISABLE = '1';
    const fetcher = jest.fn(async () => ({ ts: Date.now() }));
    const { cached, flushLocalCache } = await import('../responseCache.js');

    flushLocalCache();
    const first = await cached(['counts', 'tenantA'], { ttlSec: 1, swrSec: 5, op: 'test' }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const firstValue = first.ts;

    jest.advanceTimersByTime(1500);
    const second = await cached(['counts', 'tenantA'], { ttlSec: 1, swrSec: 5, op: 'test' }, fetcher);
    expect(second.ts).toBe(firstValue);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    const third = await cached(['counts', 'tenantA'], { ttlSec: 1, swrSec: 5, op: 'test' }, fetcher);
    expect(third.ts).not.toBe(firstValue);
  });
});
