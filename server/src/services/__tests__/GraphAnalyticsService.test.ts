import { Neo4jGraphAnalyticsService } from '../GraphAnalyticsService';
import { runCypher, getDriver } from '../../graph/neo4j';
import { Entity, Edge } from '../../graph/types';

jest.mock('../../graph/neo4j', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn(() => ({
      session: jest.fn(() => ({
          run: jest.fn().mockResolvedValue({ records: [] }),
          close: jest.fn()
      }))
  })),
}));

describe('Neo4jGraphAnalyticsService', () => {
  const service = Neo4jGraphAnalyticsService.getInstance();
  const tenantId = 'test-tenant';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAnomalies', () => {
     it('should detect degree anomalies', async () => {
         const mockResult = [
             { entityId: 'e1', score: 10 }
         ];
         (runCypher as jest.Mock).mockResolvedValue(mockResult);

         const results = await service.detectAnomalies({
             tenantId,
             scope: {},
             kind: 'degree'
         });

         expect(results).toHaveLength(1);
         expect(results[0].entityId).toBe('e1');
         expect(results[0].kind).toBe('degree');
     });
  });
});
