import { CacheService } from './cacheService';

describe('CacheService (memory fallback)', () => {
  let cache: CacheService;

  beforeEach(() => {
    delete (process.env as any).REDIS_URL;
    cache = new CacheService();
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

  it('expires by ttl', async () => {
    await cache.set('k2', 'x', 0.001); // ~1ms
    // Wait a tick
    await new Promise((r) => setTimeout(r, 10));
    const v = await cache.get('k2');
    expect(v).toBeNull();
  });

  it('delete clears a key', async () => {
    await cache.set('k3', 'y', 5);
    await cache.delete('k3');
    const v = await cache.get('k3');
    expect(v).toBeNull();
  });
});
