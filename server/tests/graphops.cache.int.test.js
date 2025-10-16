let GenericContainer;
try {
  ({ GenericContainer } = require('testcontainers'));
} catch (_) {
  /* Intentionally empty */
}
const Redis = require('ioredis');

const maybe = GenericContainer ? describe : describe.skip;

maybe('GraphOps cache integration (Redis)', () => {
  let container, port, redisUrl, redis;
  let resolvers;
  let expandMock;

  beforeAll(async () => {
    // Start Redis test container
    container = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();
    port = container.getMappedPort(6379);
    redisUrl = `redis://localhost:${port}/3`;
    redis = new Redis(redisUrl);

    // Mock getRedisClient to use containerized Redis
    jest.resetModules();
    jest.doMock('../src/config/database', () => {
      const actual = jest.requireActual('../src/config/database');
      return {
        ...actual,
        getRedisClient: () => redis,
      };
    });

    // Mock GraphOpsService to count calls
    expandMock = jest
      .fn()
      .mockResolvedValue({
        nodes: [{ id: 'n1', label: 'N1', type: 'Entity', tags: [] }],
        edges: [],
      });
    jest.doMock('../src/services/GraphOpsService', () => ({
      expandNeighborhood: expandMock,
    }));

    // Import resolvers after mocks
    ({
      graphResolvers: resolvers,
    } = require('../src/graphql/resolvers.graphops.js'));
  });

  afterAll(async () => {
    if (redis) await redis.quit();
    if (container) await container.stop();
  });

  it('warms cache on miss and hits cache on subsequent call', async () => {
    const ctx = {
      user: { id: 'u1', role: 'ANALYST', tenantId: 't1' },
      logger: { error: () => {}, info: () => {} },
    };
    const args = { entityId: 'e1', radius: 1, investigationId: 'inv1' };

    // ensure empty
    await redis.flushdb();

    // first call -> miss
    const r1 = await resolvers.Mutation.expandNeighborhood(null, args, ctx);
    expect(r1.nodes.length).toBe(1);
    expect(expandMock).toHaveBeenCalledTimes(1);

    // second call -> hit
    const r2 = await resolvers.Mutation.expandNeighborhood(null, args, ctx);
    expect(r2.nodes.length).toBe(1);
    expect(expandMock).toHaveBeenCalledTimes(1); // unchanged => cache hit

    // verify a cache key exists
    const keys = await redis.keys('nbhd:*');
    expect(keys.length).toBeGreaterThan(0);
  });
});
