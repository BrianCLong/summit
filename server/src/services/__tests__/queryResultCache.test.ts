import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { QueryResultCache } from '../queryResultCache.js';

describe('QueryResultCache', () => {
  it('builds stable signatures using parameter hashes', () => {
    const cache = new QueryResultCache(null);
    const signatureA = cache.buildSignature('cypher', 'MATCH (n) RETURN n', {
      b: 2,
      a: 1,
      nested: { y: 2, z: 3 },
    });
    const signatureB = cache.buildSignature('cypher', 'MATCH (n) RETURN n', {
      nested: { z: 3, y: 2 },
      a: 1,
      b: 2,
    });
    const signatureDifferent = cache.buildSignature('cypher', 'MATCH (n) RETURN n', {
      nested: { z: 4, y: 2 },
      a: 1,
      b: 2,
    });

    expect(signatureA).toBe(signatureB);
    expect(signatureA).not.toBe(signatureDifferent);
  });

  it('uses read-through caching and records hit ratios', async () => {
    const cache = new QueryResultCache(null, { ttlSeconds: 10 });
    const signature = cache.buildSignature('sql', 'SELECT 1', { tenantId: 't1' });
    const loader = jest.fn(async () => ({
      rows: [{ id: 1 }],
      warnings: ['fresh'],
      executionTimeMs: 5,
    }));

    const miss = await cache.readThrough(signature, 't1', loader);
    expect(miss.fromCache).toBe(false);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.getStats().result.misses).toBe(1);

    const hit = await cache.readThrough(signature, 't1', loader);
    expect(hit.fromCache).toBe(true);
    expect(hit.payload.rows).toEqual([{ id: 1 }]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.getStats().result.hits).toBe(1);
    expect(cache.getStats().result.hitRate).toBeCloseTo(0.5);
  });

  it('evicts least frequently used entries when capacity is exceeded', async () => {
    const cache = new QueryResultCache(null, { ttlSeconds: 50, maxEntries: 2 });
    const buildPayload = (label: string) => ({
      rows: [{ label }],
      warnings: [],
      executionTimeMs: 1,
    });

    const signatureA = cache.buildSignature('cypher', 'RETURN 1', { id: 'a' });
    const signatureB = cache.buildSignature('cypher', 'RETURN 1', { id: 'b' });
    const signatureC = cache.buildSignature('cypher', 'RETURN 1', { id: 'c' });

    await cache.setResult(signatureA, buildPayload('a'));
    await cache.setResult(signatureB, buildPayload('b'));
    await cache.getResult(signatureA); // Increase frequency for A

    await cache.setResult(signatureC, buildPayload('c')); // Should evict B (least frequently used)

    const resultB = await cache.getResult(signatureB);
    const resultA = await cache.getResult(signatureA);
    const resultC = await cache.getResult(signatureC);

    expect(resultB).toBeUndefined();
    expect(resultA?.rows).toEqual([{ label: 'a' }]);
    expect(resultC?.rows).toEqual([{ label: 'c' }]);
  });

  it('stores streaming partials with short TTL for progressive rendering', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const cache = new QueryResultCache(null, {
      streamingTtlSeconds: 1,
      streamingMaxEntries: 5,
      partialLimit: 2,
    });
    const signature = cache.buildSignature('cypher', 'MATCH (n) RETURN n', {});

    await cache.setStreamingPartial(signature, [1, 2, 3]);
    const cached = await cache.getStreamingPartial(signature);
    expect(cached?.rows).toEqual([1, 2]);

    jest.advanceTimersByTime(1100);

    const expired = await cache.getStreamingPartial(signature);
    expect(expired).toBeUndefined();

    jest.useRealTimers();
  });
});
