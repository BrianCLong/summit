import { SubgraphCache } from '../cache/SubgraphCache';
import { InvalidationBus } from '../events/InvalidationBus';

describe('cache coherency e2e', () => {
  it('invalidates on bus event', async () => {
    const store = new Map<string, string>();
    const cache = new SubgraphCache({
      get: async (k) => store.get(k),
      set: async (k, v) => {
        store.set(k, v);
      },
      del: async (k) => {
        store.delete(k);
      },
    });
    const bus = new InvalidationBus();
    bus.subscribe((key) => {
      store.delete(key);
    });

    const op = 'op';
    const vars = { id: 1 };
    const key = cache.key(op, vars);
    await cache.set(op, vars, { value: 1 }, 60);
    expect(await cache.get(op, vars)).toBe(JSON.stringify({ value: 1 }));
    bus.publish(key);
    await new Promise((r) => setTimeout(r, 0));
    expect(await cache.get(op, vars)).toBeUndefined();
  });
});
