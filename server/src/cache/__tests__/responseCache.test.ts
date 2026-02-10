import { jest } from '@jest/globals';

describe('responseCache', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores and retrieves values with TTL enforcement and index prefixing', async () => {
    const {
      buildCacheKey,
      getCachedJson,
      setCachedJson,
      flushLocalCache,
    } = await import('../responseCache.ts');

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
