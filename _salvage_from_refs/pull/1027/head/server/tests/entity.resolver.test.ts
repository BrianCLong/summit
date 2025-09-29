import entityResolvers from '../src/graphql/resolvers/entity';

jest.mock('../src/utils/cache', () => {
  const store = new Map();
  return {
    makeCacheKey: jest.requireActual('../src/utils/cache').makeCacheKey,
    getCached: async (key: string) => store.get(key) || null,
    setCached: async (key: string, val: any) => {
      store.set(key, val);
    },
  };
});

describe('entity resolver', () => {
  it('caches entity lookups', async () => {
    const load = jest.fn().mockResolvedValue({ id: '1' });
    const context: any = { user: { id: 'u1' }, loaders: { entityLoader: { load } } };
    const res1 = await (entityResolvers as any).Query.entity(null, { id: '1' }, context);
    const res2 = await (entityResolvers as any).Query.entity(null, { id: '1' }, context);
    expect(load).toHaveBeenCalledTimes(1);
    expect(res2).toEqual(res1);
  });
});
