import { Neo4jGraphService } from '../GraphService';
import { runCypher } from '../../graph/neo4j';
import { Entity, Edge } from '../../graph/types';

jest.mock('../../graph/neo4j', () => ({
  runCypher: jest.fn(),
  getDriver: jest.fn(),
}));

describe('Neo4jGraphService', () => {
  const service = Neo4jGraphService.getInstance();
  const tenantId = 'test-tenant';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntity', () => {
    it('should return entity if found', async () => {
      const mockEntity: Entity = {
        id: 'e1',
        tenantId,
        type: 'person',
        label: 'Alice',
        attributes: {},
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (runCypher as jest.Mock).mockResolvedValue([{ entity: mockEntity }]);

      const result = await service.getEntity(tenantId, 'e1');
      expect(result).toEqual(mockEntity);
      expect(runCypher).toHaveBeenCalledWith(expect.stringContaining('MATCH (n:Entity {id: $id, tenantId: $tenantId})'), { id: 'e1', tenantId });
    });

    it('should return null if not found', async () => {
      (runCypher as jest.Mock).mockResolvedValue([]);
      const result = await service.getEntity(tenantId, 'e1');
      expect(result).toBeNull();
    });
  });

  describe('findEntities', () => {
    it('should search by ids', async () => {
       const mockEntity = { id: 'e1' };
       (runCypher as jest.Mock).mockResolvedValue([{ entity: mockEntity }]);

       await service.findEntities(tenantId, { ids: ['e1'] });
       expect(runCypher).toHaveBeenCalledWith(expect.stringContaining('n.id IN $ids'), expect.objectContaining({ ids: ['e1'] }));
    });
  });

  describe('upsertEntity', () => {
      it('should upsert entity', async () => {
          const input = { id: 'e1', type: 'person', label: 'Bob' };
          const output = { ...input, tenantId, attributes: {}, metadata: {} };

          (runCypher as jest.Mock).mockResolvedValue([{ entity: output }]);

          const result = await service.upsertEntity(tenantId, input);
          expect(result).toEqual(output);
          expect(runCypher).toHaveBeenCalledWith(expect.stringContaining('MERGE (n:Entity'), expect.anything());
      });
  });
});
