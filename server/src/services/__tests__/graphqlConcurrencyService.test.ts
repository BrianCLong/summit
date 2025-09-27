import { GraphQLConcurrencyService } from '../graphqlConcurrencyService.js';

class InMemoryRedis {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const next = (Number.parseInt(this.store.get(key) ?? '0', 10) || 0) + 1;
    this.store.set(key, next.toString());
    return next;
  }

  async decr(key: string): Promise<number> {
    const next = (Number.parseInt(this.store.get(key) ?? '0', 10) || 0) - 1;
    this.store.set(key, next.toString());
    return next;
  }

  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }
}

describe('GraphQLConcurrencyService', () => {
  let redis: InMemoryRedis;
  let service: GraphQLConcurrencyService;

  beforeEach(() => {
    redis = new InMemoryRedis();
    service = new GraphQLConcurrencyService({ redis: redis as any, defaultLimit: 2, ttlSeconds: 60 });
  });

  it('enforces limits and releases slots', async () => {
    const first = await service.acquire('user-1');
    expect(first).toEqual({ allowed: true, limit: 2, active: 1 });

    const second = await service.acquire('user-1');
    expect(second).toEqual({ allowed: true, limit: 2, active: 2 });

    const third = await service.acquire('user-1');
    expect(third.allowed).toBe(false);
    expect(third.limit).toBe(2);

    await service.release('user-1');
    const afterRelease = await service.acquire('user-1');
    expect(afterRelease.allowed).toBe(true);
    expect(afterRelease.active).toBe(2);
  });

  it('tracks overrides and defaults', async () => {
    expect(await service.getDefaultLimit()).toBe(2);

    await service.setDefaultLimit(5);
    expect(await service.getDefaultLimit()).toBe(5);

    await service.setUserLimit('user-2', 3);
    expect(await service.getUserLimitOverride('user-2')).toBe(3);
    expect(await service.getEffectiveLimit('user-2')).toBe(3);

    await service.clearUserLimit('user-2');
    expect(await service.getUserLimitOverride('user-2')).toBeNull();
    expect(await service.getEffectiveLimit('user-2')).toBe(5);
  });

  it('returns active count', async () => {
    expect(await service.getActiveCount('user-1')).toBe(0);
    await service.acquire('user-1');
    await service.acquire('user-1');
    expect(await service.getActiveCount('user-1')).toBe(2);
    await service.release('user-1');
    expect(await service.getActiveCount('user-1')).toBe(1);
  });
});
