import { describe, test, expect } from '@jest/globals';

// Mock config before any imports to prevent process.exit
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

// Mock database before imports
const mockTx = {
  run: jest.fn().mockResolvedValue({
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
  }),
  commit: jest.fn(),
  rollback: jest.fn(),
};
const mockSession = { beginTransaction: () => mockTx, close: jest.fn() };
const mockPgClient = {
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn(),
};
const mockRedisClient = {
  smembers: jest.fn().mockResolvedValue([]),
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  sadd: jest.fn(),
};

jest.mock('../src/config/database', () => ({
  getNeo4jDriver: () => ({ session: () => mockSession }),
  getPostgresPool: () => ({ connect: () => mockPgClient }),
  getRedisClient: () => mockRedisClient,
}));

const {
  crudResolvers: resolvers,
} = require('../src/graphql/resolvers/crudResolvers');

describe('Bulk mutations', () => {
  const user = { id: 'u1', tenantId: 't1' };

  test('createEntities returns array', async () => {
    const inputs = [{ type: 'PERSON', label: 'E1', investigationId: 'inv1' }];
    const res = await resolvers.Mutation.createEntities(
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
    const res = await resolvers.Mutation.createRelationships(
      null,
      { inputs },
      { user },
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
  });
});
