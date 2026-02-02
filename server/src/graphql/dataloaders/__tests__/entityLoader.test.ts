/**
 * Tests for Entity DataLoader
 */

import { createEntityLoader } from '../entityLoader.js';
import type { DataLoaderContext } from '../index.js';
import { jest, describe, it, test, expect, beforeEach } from '@jest/globals';

interface MockNeo4jSession {
  run: jest.MockedFunction<(...args: any[]) => Promise<{ records: any[] }>>;
  close: jest.MockedFunction<() => void>;
}

interface MockNeo4jDriver {
  session: jest.Mock;
}

// Mock Neo4j driver
const mockNeo4jSession: MockNeo4jSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockNeo4jDriver: MockNeo4jDriver = {
  session: jest.fn(() => mockNeo4jSession),
};

const mockPgPool = {} as DataLoaderContext['pgPool'];

describe('EntityLoader', () => {
  let context: DataLoaderContext;

  beforeEach(() => {
    context = {
      neo4jDriver: mockNeo4jDriver as unknown as DataLoaderContext['neo4jDriver'],
      pgPool: mockPgPool,
      tenantId: 'test-tenant',
    };

    jest.clearAllMocks();
    mockNeo4jDriver.session.mockReturnValue(mockNeo4jSession as any);
  });

  describe('batch loading', () => {
    it('should batch multiple entity requests into a single query', async () => {
      const loader = createEntityLoader(context);

      // Mock Neo4j response
      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                id: 'entity-1',
                name: 'Entity 1',
                tenantId: 'test-tenant',
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
              },
              labels: ['Entity', 'Person'],
            }),
          },
          {
            get: () => ({
              properties: {
                id: 'entity-2',
                name: 'Entity 2',
                tenantId: 'test-tenant',
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
              },
              labels: ['Entity', 'Organization'],
            }),
          },
        ],
      });

      // Request multiple entities simultaneously
      const [entity1, entity2] = await Promise.all([
        loader.load('entity-1'),
        loader.load('entity-2'),
      ]);

      // Should only call Neo4j once with both IDs
      expect(mockNeo4jSession.run).toHaveBeenCalledTimes(1);
      expect(mockNeo4jSession.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.id IN $ids'),
        expect.objectContaining({
          ids: expect.arrayContaining(['entity-1', 'entity-2']),
          tenantId: 'test-tenant',
        })
      );

      // Should return correct entities
      expect(entity1).toMatchObject({
        id: 'entity-1',
        type: 'Person',
      });
      expect(entity2).toMatchObject({
        id: 'entity-2',
        type: 'Organization',
      });

      // Session should be closed
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should cache loaded entities', async () => {
      const loader = createEntityLoader(context);

      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                id: 'entity-1',
                tenantId: 'test-tenant',
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
              },
              labels: ['Entity', 'Person'],
            }),
          },
        ],
      });

      // Load same entity twice
      const entity1 = await loader.load('entity-1');
      const entity2 = await loader.load('entity-1');

      // Should only query once due to caching
      expect(mockNeo4jSession.run).toHaveBeenCalledTimes(1);
      expect(entity1).toBe(entity2);
    });

    it('should return error for entities not found', async () => {
      const loader = createEntityLoader(context);

      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [], // No entities found
      });

      await expect(loader.load('non-existent')).rejects.toThrow(
        'Entity not found',
      );
    });

    it('should respect maxBatchSize limit', async () => {
      const loader = createEntityLoader(context);

      // Mock response for multiple batches
      mockNeo4jSession.run.mockImplementation((_query: string, params: any) => {
        const ids = params?.ids || [];
        return Promise.resolve({
          records: ids.map((id: string) => ({
            get: () => ({
              properties: {
                id,
                tenantId: 'test-tenant',
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
              },
              labels: ['Entity'],
            }),
          })),
        });
      });

      // Request 150 entities (should be split into 2 batches of 100 and 1 batch of 50)
      const promises = Array.from({ length: 150 }, (_, i) =>
        loader.load(`entity-${i}`)
      );

      await Promise.all(promises);

      // Should be called at least twice due to batch size limit
      expect(mockNeo4jSession.run.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('should handle Neo4j errors gracefully', async () => {
      const loader = createEntityLoader(context);

      mockNeo4jSession.run.mockRejectedValueOnce(new Error('Neo4j error'));

      await expect(loader.load('entity-1')).rejects.toThrow('Neo4j error');
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });
  });

  describe('tenant isolation', () => {
    it('should only load entities for the correct tenant', async () => {
      const loader = createEntityLoader(context);

      mockNeo4jSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                id: 'entity-1',
                tenantId: 'test-tenant',
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
              },
              labels: ['Entity'],
            }),
          },
        ],
      });

      await loader.load('entity-1');

      expect(mockNeo4jSession.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'test-tenant',
        })
      );
    });
  });
});
