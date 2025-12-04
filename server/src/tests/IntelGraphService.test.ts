import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IntelGraphService } from '../services/IntelGraphService.js';
import * as neo4j from '../graph/neo4j.js';

// Mock neo4j
jest.mock('../graph/neo4j.js');

describe('IntelGraphService', () => {
  let service: IntelGraphService;
  const mockRunCypher = neo4j.runCypher as jest.MockedFunction<typeof neo4j.runCypher>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = IntelGraphService.getInstance();
  });

  describe('ensureNode (Canonical Upsert)', () => {
    it('should use MERGE when natural keys are present', async () => {
      const tenantId = 'tenant-123';
      const personProps = { fullName: 'Jane Doe', email: 'jane@example.com' };

      const expectedNode = {
        properties: {
          ...personProps,
          id: 'mock-uuid',
          tenantId,
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01',
          label: 'Person'
        }
      };

      mockRunCypher.mockImplementation(async (cypher: string, params: Record<string, any> = {}) => {
        return [{ n: expectedNode.properties }] as any[];
      });

      const result = await service.ensureNode(tenantId, 'Person', personProps);

      expect(result).toEqual(expectedNode.properties);
      expect(mockRunCypher).toHaveBeenCalledTimes(1);
      const callArgs = mockRunCypher.mock.calls[0];

      // Verify MERGE is used
      expect(callArgs[0]).toContain('MERGE (n:Person { tenantId: $tenantId, email: $email })');
      expect(callArgs[0]).toContain('ON CREATE SET');
      expect(callArgs[0]).toContain('ON MATCH SET');

      // Verify params
      expect(callArgs[1]).toHaveProperty('email', 'jane@example.com');
      expect(callArgs[1]).toHaveProperty('tenantId', tenantId);
    });
  });

  describe('createEdge', () => {
      it('should use MERGE for edges to prevent duplicates', async () => {
          const tenantId = 't1';
          mockRunCypher.mockResolvedValue([{ r: { type: 'RELATED_TO' } }] as any[]);

          await service.createEdge(tenantId, 'a', 'b', 'RELATED_TO');

          expect(mockRunCypher).toHaveBeenCalledTimes(1);
          const cypher = mockRunCypher.mock.calls[0][0];
          expect(cypher).toContain('MERGE (a)-[r:RELATED_TO]->(b)');
      });
  });

  describe('Validation', () => {
      it('should reject invalid labels', async () => {
          await expect(service.ensureNode('t1', 'Hacker' as any, {})).rejects.toThrow('Invalid node label');
      });

      it('should reject invalid property keys in search', async () => {
          await expect(service.searchNodes('t1', 'Person', { 'bad-key!': 'val' })).rejects.toThrow('Invalid property key');
      });
  });
});
