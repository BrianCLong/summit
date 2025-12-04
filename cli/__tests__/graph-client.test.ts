/**
 * Graph Client Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock neo4j-driver
jest.mock('neo4j-driver', () => ({
  default: {
    driver: jest.fn(() => ({
      verifyConnectivity: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      session: jest.fn(() => ({
        run: jest.fn().mockResolvedValue({
          records: [
            {
              keys: ['n'],
              get: jest.fn((key) => ({
                elementId: '4:test:123',
                labels: ['Person'],
                properties: { name: 'Test' },
              })),
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
        }),
        close: jest.fn().mockResolvedValue(undefined),
      })),
      getServerInfo: jest.fn().mockResolvedValue({
        protocolVersion: 5.0,
      }),
    })),
    auth: {
      basic: jest.fn((user, pass) => ({ scheme: 'basic', principal: user })),
    },
    session: {
      READ: 'READ',
      WRITE: 'WRITE',
    },
    int: jest.fn((n) => ({ toNumber: () => n })),
    isInt: jest.fn(() => false),
    isNode: jest.fn((val) => val && 'labels' in val),
    isRelationship: jest.fn((val) => val && 'type' in val && 'startNodeElementId' in val),
    isPath: jest.fn(() => false),
  },
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
