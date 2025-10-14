import GraphAnalyticsService = require('../src/services/GraphAnalyticsService');

describe('GraphAnalyticsService caching', () => {
  const createRedisStub = () => {
    const store = new Map<string, string>();
    return {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
    };
  };

  it('returns cached PageRank results on subsequent calls', async () => {
    const redis = createRedisStub();
    const service = new GraphAnalyticsService({
      driver: { session: jest.fn() } as any,
      redis,
      cacheTtl: 10,
    });

    jest.spyOn(service as any, 'ensureGraphProjection').mockResolvedValue(undefined);
    const execute = jest.spyOn(service as any, 'executePageRank').mockResolvedValue([
      { nodeId: 'n1', label: 'Node', score: 0.5 },
    ]);

    const first = await service.calculatePageRank({ investigationId: 'inv-1', limit: 5 });
    const second = await service.calculatePageRank({ investigationId: 'inv-1', limit: 5 });

    expect(first).toEqual(second);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it('bypasses the cache when forceRefresh is true', async () => {
    const redis = createRedisStub();
    const service = new GraphAnalyticsService({ driver: { session: jest.fn() } as any, redis });

    jest.spyOn(service as any, 'ensureGraphProjection').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'dropGraphProjection').mockResolvedValue(undefined);
    const execute = jest.spyOn(service as any, 'executePageRank').mockResolvedValue([
      { nodeId: 'n1', label: 'Node', score: 0.5 },
    ]);

    await service.calculatePageRank({ investigationId: 'inv-2', limit: 10, forceRefresh: true });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalled();
  });
});
