import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Registry } from 'prom-client';
import { CacheClient } from '../index.js';

async function metricValue(registry: Registry, name: string, namespace: string) {
  const metrics = await registry.getMetricsAsJSON();
  const metric = metrics.find((m) => m.name === name);
  const values = metric?.values ?? [];
  return values.find((v) => v.labels?.namespace === namespace)?.value ?? 0;
}

describe('CacheClient', () => {
  const originalDisable = process.env.CACHE_DISABLED;

  beforeEach(() => {
    delete process.env.CACHE_DISABLED;
  });

  afterEach(() => {
    process.env.CACHE_DISABLED = originalDisable;
    vi.useRealTimers();
  });

  it('stores and retrieves values with namespacing and metrics', async () => {
    const registry = new Registry();
    const client = new CacheClient({
      namespace: 'test-service',
      registry,
      cacheClass: 'best_effort',
      env: 'test',
    });

    expect(await client.get<string>('key')).toBeNull();
    await client.set('key', 'value');
    const result = await client.get<string>('key');

    expect(result).toBe('value');

    expect(await metricValue(registry, 'cache_hits_total', 'test-service')).toBe(1);
    expect(await metricValue(registry, 'cache_misses_total', 'test-service')).toBe(1);
  });

  it('respects TTL and records evictions for in-memory entries', async () => {
    vi.useFakeTimers();
    const registry = new Registry();
    const client = new CacheClient({
      namespace: 'ttl-test',
      registry,
      cacheClass: 'critical_path',
      defaultTTLSeconds: 1,
      env: 'test',
    });

    await client.set('expiring', { value: true });
    expect(await client.get('expiring')).toEqual({ value: true });

    vi.advanceTimersByTime(1500);

    expect(await client.get('expiring')).toBeNull();

    expect(await metricValue(registry, 'cache_evictions_total', 'ttl-test')).toBe(1);
  });

  it('can be disabled via env switch', async () => {
    process.env.CACHE_DISABLED = 'true';
    const registry = new Registry();
    const client = new CacheClient({
      namespace: 'disabled',
      registry,
      cacheClass: 'best_effort',
    });

    await client.set('key', 'value');
    const result = await client.get('key');

    expect(result).toBeNull();

    expect(await metricValue(registry, 'cache_misses_total', 'disabled')).toBe(1);
  });

  it('supports hash-based sharding with multiple redis clients', async () => {
    const mockClients = [
      { set: vi.fn(), get: vi.fn(), setex: vi.fn() },
      { set: vi.fn(), get: vi.fn(), setex: vi.fn() },
    ];

    const registry = new Registry();
    const client = new CacheClient({
      namespace: 'shard-test',
      registry,
      cacheClass: 'best_effort',
      // @ts-expect-error Mocking Redis clients for testing
      redisClients: mockClients,
    });

    // We can't easily predict the exact hash without reproducing the hash logic,
    // but we can assert that set() routes to one of the clients.
    // Let's set a few keys and verify both clients receive calls.
    mockClients[0].get.mockResolvedValue(null);
    mockClients[1].get.mockResolvedValue(null);
    mockClients[0].set.mockResolvedValue('OK');
    mockClients[1].set.mockResolvedValue('OK');

    // We will try several keys to ensure we hit different shards
    const keys = ['key1', 'key2', 'key3', 'test', 'another-key', 'foo', 'bar'];
    for (const key of keys) {
      await client.set(key, 'value');
      await client.get(key);
    }

    // Since we are hashing keys, both clients should have been invoked at least once
    // given a sufficient number of distinct keys.
    const client1Calls = mockClients[0].set.mock.calls.length + mockClients[0].setex.mock.calls.length;
    const client2Calls = mockClients[1].set.mock.calls.length + mockClients[1].setex.mock.calls.length;

    expect(client1Calls).toBeGreaterThan(0);
    expect(client2Calls).toBeGreaterThan(0);
    expect(client1Calls + client2Calls).toBe(keys.length);
  });
});
