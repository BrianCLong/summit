import { cached, cacheQueryResult, flushLocalCache, getLocalCacheStats } from '../responseCache.js';
import { emitInvalidation } from '../invalidation.js';
import {
  registerCacheWarmer,
  runWarmers,
  resetWarmersForTesting,
  getWarmerStats,
} from '../warmers.js';

describe('advanced cache layer', () => {
  beforeEach(() => {
    process.env.REDIS_DISABLE = '1';
    flushLocalCache();
    resetWarmersForTesting();
  });

  it('caches values, supports query caching, and invalidates by prefix', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { value: calls };
    };
    const keyParts = ['counts', 'tenantA'];

    const first = await cached(
      keyParts,
      { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 },
      fetcher,
    );
    const second = await cached(
      keyParts,
      { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 },
      fetcher,
    );

    expect(first).toEqual(second);
    expect(calls).toBe(1);

    const queryResult = await cacheQueryResult(
      'select 1',
      { id: 1 },
      async () => 'ok',
      { tenant: 'tenantA', ttlSec: 30 },
    );
    expect(queryResult).toBe('ok');

    await emitInvalidation(['counts:*']);
    const third = await cached(
      keyParts,
      { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 },
      fetcher,
    );
    expect(third.value).toBe(2);
    expect(getLocalCacheStats().size).toBeGreaterThan(0);
  });

  it('runs warmers and records results', async () => {
    let warmed = 0;
    registerCacheWarmer({
      name: 'test-warmer',
      keyParts: ['test', 'anon'],
      ttlSec: 10,
      tags: ['test'],
      fetcher: async () => {
        warmed += 1;
        return { warmed };
      },
    });

    const results = await runWarmers('manual');
    const stats = getWarmerStats();

    expect(results[0]?.ok).toBe(true);
    expect(stats.lastResults.length).toBe(1);
    expect(warmed).toBe(1);
  });
});
