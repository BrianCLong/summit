/**
 * Graph Client Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Use jest.unstable_mockModule for ESM
const mockQueryResult = {
  records: [
    {
      keys: ['n'],
      get: () => ({
        elementId: '4:test:123',
        labels: ['Person'],
        properties: { name: 'Test' },
      }),
    },
  ],
  summary: {
    resultAvailableAfter: { toNumber: () => 10 },
    resultConsumedAfter: { toNumber: () => 15 },
    counters: {
      updates: () => ({
        nodesCreated: 0,
        nodesDeleted: 0,
        relationshipsCreated: 0,
        relationshipsDeleted: 0,
        propertiesSet: 0,
        labelsAdded: 0,
        labelsRemoved: 0,
      }),
    },
    queryType: 'r',
  },
};

const mockSession = {
  run: async () => mockQueryResult,
  close: async () => undefined,
};

const mockDriverInstance = {
  verifyConnectivity: async () => undefined,
  close: async () => undefined,
  session: () => mockSession,
  getServerInfo: async () => ({ protocolVersion: 5.0 }),
};

const mockNeo4j = {
  driver: () => mockDriverInstance,
  auth: {
    basic: (user: string) => ({ scheme: 'basic', principal: user }),
  },
  session: {
    READ: 'READ',
    WRITE: 'WRITE',
  },
  int: (n: number) => ({ toNumber: () => n }),
  isInt: () => false,
  isNode: (val: unknown) => val && typeof val === 'object' && val !== null && 'labels' in val,
  isRelationship: (val: unknown) => val && typeof val === 'object' && val !== null && 'type' in val && 'startNodeElementId' in val,
  isPath: () => false,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: mockNeo4j,
  ...mockNeo4j,
}));

import { GraphClient } from '../src/lib/graph-client.js';

describe('GraphClient', () => {
  let client: GraphClient;

  beforeEach(() => {
    client = new GraphClient({
      uri: 'bolt://localhost:7687',
      user: 'neo4j',
      password: 'password',
      database: 'neo4j',
      encrypted: false,
    });
  });

  afterEach(async () => {
    await client.disconnect();
  });

  describe('connect', () => {
    it('should connect to Neo4j', async () => {
      await expect(client.connect()).resolves.not.toThrow();
    });

    it('should not reconnect if already connected', async () => {
      await client.connect();
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    it('should execute a Cypher query', async () => {
      const result = await client.query('MATCH (n) RETURN n LIMIT 1');

      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('totalRows');
    });

    it('should return query statistics', async () => {
      const result = await client.query('MATCH (n) RETURN n LIMIT 1');

      expect(result.summary).toHaveProperty('resultAvailableAfter');
      expect(result.summary).toHaveProperty('resultConsumedAfter');
      expect(result.summary).toHaveProperty('counters');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await client.healthCheck();

      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latencyMs');
      expect(typeof health.connected).toBe('boolean');
      expect(typeof health.latencyMs).toBe('number');
    });
  });
});
