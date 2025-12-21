import { jest } from '@jest/globals';
import { mockEsmModule } from '../../../tests/utils/esmMock.js';

describe('cache invalidation', () => {
  it('supports tag-based invalidation across tiers', async () => {
    const store = new Map<string, string>();
    const sets = new Map<string, Set<string>>();
    const redisMock = {
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
    } as any;

    await mockEsmModule('../../config/database.js', () => ({ getRedisClient: () => redisMock }));

    const { setCachedJson } = await import('../responseCache.js');
    const { invalidateTags } = await import('../invalidation.js');

    const cacheKey = 'ns:abc';
    await setCachedJson(cacheKey, { ok: true }, { indexPrefixes: ['alpha'], tenant: 'tenantA' });

    expect(store.has(cacheKey)).toBe(true);
    expect(await redisMock.sMembers('idx:tag:alpha')).toContain(cacheKey);
    expect(await redisMock.sMembers('idx:tag:alpha:tenantA')).toContain(cacheKey);

    await invalidateTags(['alpha'], 'tenantA');

    expect(store.has(cacheKey)).toBe(false);
  });
});
