import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';

jest.mock('../src/config.js', () => ({
  cfg: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ISSUER: 'test',
  },
}));

var tx: any;
var session: any;
var pgClient: any;
var redisClient: any;
let crudResolvers: typeof import('../src/graphql/resolvers/crudResolvers.js').crudResolvers;

jest.mock('../src/config/database.js', () => ({
  getNeo4jDriver: () => ({ session: () => session }),
  getPostgresPool: () => ({ connect: () => pgClient }),
  getRedisClient: () => redisClient,
}));

jest.mock('../src/graphql/subscriptionEngine.js', () => ({
  subscriptionEngine: {
    publish: jest.fn(),
    createFilteredAsyncIterator: jest.fn(),
    createBatchedAsyncIterator: jest.fn(),
  },
}));

describe('Bulk mutations', () => {
  const user = { id: 'u1', tenantId: 't1' };

  beforeAll(async () => {
    redisClient = {
      smembers: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      sadd: jest.fn(),
    };
    ({ crudResolvers } = await import(
      '../src/graphql/resolvers/crudResolvers.js'
    ));
  });

  beforeEach(() => {
    const mockRunResult = {
      records: [
        {
          get: () => ({
            properties: {
              id: 'id1',
              investigationId: 'inv1',
              fromEntity: { id: 'a' },
              toEntity: { id: 'b' },
            },
          }),
        },
      ],
    };

    tx = {
      run: jest.fn<() => Promise<any>>().mockResolvedValue(mockRunResult),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    session = { beginTransaction: () => tx, close: jest.fn() };
    pgClient = {
      query: jest.fn<() => Promise<any>>().mockResolvedValue({}),
      release: jest.fn(),
    };
    redisClient.smembers.mockResolvedValue([]);
  });

  test('createEntities returns array', async () => {
    const inputs = [{ type: 'PERSON', label: 'E1', investigationId: 'inv1' }];
    const res = await crudResolvers.Mutation.createEntities(
      null,
      { inputs },
      { user },
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
  });

  test('createRelationships returns array', async () => {
    const inputs = [
      {
        type: 'CONNECTED_TO',
        fromEntityId: 'a',
        toEntityId: 'b',
        investigationId: 'inv1',
      },
    ];
    const res = await crudResolvers.Mutation.createRelationships(
      null,
      { inputs },
      { user },
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
  });
});
