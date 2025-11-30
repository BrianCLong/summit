import { MultiTierCache } from '../multi-tier-cache.js';

interface SharedState {
  kv: Map<string, { value: string; expiresAt?: number }>;
  sets: Map<string, { members: Set<string>; expiresAt?: number }>;
  subscribers: Map<string, Set<(channel: string, message: string) => void>>;
}

class InMemoryRedis {
  private state: SharedState;
  private messageHandler?: (channel: string, message: string) => void;

  constructor(state?: SharedState) {
    this.state =
      state ?? {
        kv: new Map(),
        sets: new Map(),
        subscribers: new Map(),
      };
  }

  duplicate() {
    return new InMemoryRedis(this.state);
  }

  private now() {
    return Date.now();
  }

  private cleanupKey(key: string) {
    const entry = this.state.kv.get(key);
    if (entry && entry.expiresAt && entry.expiresAt <= this.now()) {
      this.state.kv.delete(key);
    }
  }

  private cleanupSet(key: string) {
    const entry = this.state.sets.get(key);
    if (entry && entry.expiresAt && entry.expiresAt <= this.now()) {
      this.state.sets.delete(key);
    }
  }

  async get(key: string) {
    this.cleanupKey(key);
    const entry = this.state.kv.get(key);
    return entry ? entry.value : null;
  }

  async setex(key: string, ttl: number, value: string) {
    this.state.kv.set(key, { value, expiresAt: this.now() + ttl * 1000 });
    return 'OK';
  }

  async del(...keys: string[]) {
    let count = 0;
    keys.forEach((key) => {
      if (this.state.kv.delete(key)) count++;
      if (this.state.sets.delete(key)) count++;
    });
    return count;
  }

  async sadd(key: string, ...members: string[]) {
    this.cleanupSet(key);
    const set = this.state.sets.get(key) ?? {
      members: new Set<string>(),
      expiresAt: undefined,
    };
    let added = 0;
    members.forEach((member) => {
      if (!set.members.has(member)) {
        added++;
        set.members.add(member);
      }
    });
    this.state.sets.set(key, set);
    return added;
  }

  async smembers(key: string) {
    this.cleanupSet(key);
    return Array.from(this.state.sets.get(key)?.members ?? []);
  }

  async srem(key: string, member: string) {
    this.cleanupSet(key);
    const set = this.state.sets.get(key);
    if (!set) return 0;
    const existed = set.members.delete(member);
    if (set.members.size === 0) {
      this.state.sets.delete(key);
    }
    return existed ? 1 : 0;
  }

  async expire(key: string, seconds: number) {
    const expiresAt = this.now() + seconds * 1000;
    const kv = this.state.kv.get(key);
    if (kv) {
      kv.expiresAt = expiresAt;
      return 1;
    }
    const set = this.state.sets.get(key);
    if (set) {
      set.expiresAt = expiresAt;
      return 1;
    }
    return 0;
  }

  async publish(channel: string, message: string) {
    const handlers = this.state.subscribers.get(channel);
    if (!handlers) return 0;
    handlers.forEach((handler) => handler(channel, message));
    return handlers.size;
  }

  on(event: string, handler: (channel: string, message: string) => void) {
    if (event === 'message') {
      this.messageHandler = handler;
    }
    return this;
  }

  async subscribe(channel: string) {
    const handlers = this.state.subscribers.get(channel) ?? new Set();
    if (this.messageHandler) {
      handlers.add(this.messageHandler);
    }
    this.state.subscribers.set(channel, handlers);
    return handlers.size;
  }
}

const createCache = () => {
  const redis = new InMemoryRedis();
  const cache = new MultiTierCache({
    cacheEnabled: true,
    redisClient: redis as any,
    subscriberClient: redis.duplicate() as any,
    defaultTtlSeconds: 5,
    l1FallbackTtlSeconds: 5,
    namespace: 'cache',
    l1MaxBytes: 5 * 1024 * 1024,
  });
  return { cache, redis };
};

describe('MultiTierCache', () => {
  afterEach(async () => {
    jest.useRealTimers();
  });

  it('stores and retrieves values across tiers with ttl enforcement', async () => {
    jest.useFakeTimers();
    const { cache, redis } = createCache();
    const now = Date.now();
    jest.setSystemTime(now);

    await cache.set('user:1', { id: '1' }, { ttlSeconds: 1, tags: ['users'] });

    await expect(cache.get<{ id: string }>('user:1')).resolves.toEqual({ id: '1' });
    jest.setSystemTime(now + 1500);

    await expect(cache.get('user:1')).resolves.toBeNull();
    expect(await redis.get('cache:user:1')).toBeNull();
  });

  it('deduplicates concurrent loaders via wrap and caches result', async () => {
    const { cache } = createCache();
    const loader = jest.fn(async () => ({ value: Math.random() }));

    const [first, second] = await Promise.all([
      cache.wrap('heavy', loader, { ttlSeconds: 2 }),
      cache.wrap('heavy', loader, { ttlSeconds: 2 }),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    await expect(cache.get('heavy')).resolves.toEqual(first);
  });

  it('invalidates individual keys and clears tag indexes', async () => {
    const { cache, redis } = createCache();
    await cache.set('entity:1', { id: 'entity:1' }, { ttlSeconds: 5, tags: ['entities'] });

    await expect(cache.get('entity:1')).resolves.toEqual({ id: 'entity:1' });
    await cache.invalidate('entity:1');

    await expect(cache.get('entity:1')).resolves.toBeNull();
    expect(await redis.smembers('cache:tag:entities')).toHaveLength(0);
  });

  it('invalidates by tag and evicts related cache entries', async () => {
    const { cache } = createCache();
    await cache.set('e:1', { id: '1' }, { ttlSeconds: 5, tags: ['list'] });
    await cache.set('e:2', { id: '2' }, { ttlSeconds: 5, tags: ['list'] });

    await cache.invalidateByTag('list');

    await expect(cache.get('e:1')).resolves.toBeNull();
    await expect(cache.get('e:2')).resolves.toBeNull();
  });

  it('broadcasts invalidations to peer instances', async () => {
    const sharedRedis = new InMemoryRedis();
    const cacheA = new MultiTierCache({
      cacheEnabled: true,
      redisClient: sharedRedis as any,
      subscriberClient: sharedRedis.duplicate() as any,
      defaultTtlSeconds: 5,
      namespace: 'cache',
    });
    const cacheB = new MultiTierCache({
      cacheEnabled: true,
      redisClient: sharedRedis as any,
      subscriberClient: sharedRedis.duplicate() as any,
      defaultTtlSeconds: 5,
      namespace: 'cache',
    });

    await cacheA.set('user:peer', { id: 'peer' }, { ttlSeconds: 5 });
    await cacheB.get('user:peer');

    await cacheA.invalidate('user:peer');
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(cacheB.get('user:peer')).resolves.toBeNull();
  });
});
