import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { cacheService } from '../CacheService.js';

const mockRunCypher = jest.fn();

jest.mock('../../graph/neo4j', () => ({
  __esModule: true,
  runCypher: mockRunCypher,
  getDriver: jest.fn(() => ({
      session: jest.fn(() => ({
          close: jest.fn()
      }))
  })),
}));

import { Neo4jGraphAnalyticsService } from '../GraphAnalyticsService.js';

describe('Neo4jGraphAnalyticsService', () => {
  let service: Neo4jGraphAnalyticsService;

  beforeAll(() => {
    service = Neo4jGraphAnalyticsService.getInstance();
    // Spy on cacheService singleton
    jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, factory) => {
      return await factory();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('centrality', () => {
    it.skip('should use cache and return centrality scores', async () => {
      const mockResult = [
        { entityId: 'e1', score: 10 }
      ];
      mockRunCypher.mockResolvedValue(mockResult);

      const results = await service.centrality({
        tenantId: 'test-tenant',
        scope: { investigationId: 'inv1' },
        algorithm: 'degree'
      });

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('e1');
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('graph:centrality:test-tenant:degree:inv1'),
        expect.any(Function),
        expect.any(Number)
      );
    });
  });

  describe('communities', () => {
    it.skip('should use cache and return communities', async () => {
      const mockResult = [
        { id1: 'e1', id2: 'e2', weight: 2 },
        { id1: 'e2', id2: 'e3', weight: 2 }
      ];
      mockRunCypher.mockResolvedValue(mockResult);

      const results = await service.communities({
        tenantId: 'test-tenant',
        scope: { investigationId: 'inv1' },
        algorithm: 'wcc'
      });

      expect(results).toHaveLength(1);
      expect(results[0].entityIds).toHaveLength(3);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('graph:communities:test-tenant:wcc:inv1'),
        expect.any(Function),
        expect.any(Number)
      );
    });
  });

  describe('detectAnomalies', () => {
     it.skip('should detect degree anomalies with caching', async () => {
         const mockResult = [
             { entityId: 'e1', score: 10 }
         ];
         mockRunCypher.mockResolvedValue(mockResult);

         const results = await service.detectAnomalies({
             tenantId: 'test-tenant',
             scope: {},
             kind: 'degree'
         });

         expect(results).toHaveLength(1);
         expect(results[0].entityId).toBe('e1');
         expect(results[0].kind).toBe('degree');
         expect(cacheService.getOrSet).toHaveBeenCalled();
     });
  });
});
