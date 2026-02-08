
import { describe, expect, it, beforeEach, beforeAll, jest } from '@jest/globals';

// Mock runCypher
jest.unstable_mockModule(
  new URL('../../../graph/neo4j.ts', import.meta.url).pathname,
  () => ({
    runCypher: jest.fn(),
  }),
);

describe('Neo4jCaseGraphRepository', () => {
  let Neo4jCaseGraphRepository: typeof import('../repositories/CaseGraphRepository.js').Neo4jCaseGraphRepository;
  let repo: InstanceType<typeof Neo4jCaseGraphRepository>;
  let mockRunCypher: jest.Mock;

  beforeAll(async () => {
    ({ Neo4jCaseGraphRepository } = await import('../repositories/CaseGraphRepository.js'));
    const { runCypher } = await import('../../../graph/neo4j.ts');
    mockRunCypher = runCypher as jest.Mock;
  });

  beforeEach(() => {
    repo = new Neo4jCaseGraphRepository();
    mockRunCypher.mockClear();
  });

  describe('getSubgraphByCypher', () => {
    it('should reject queries without $caseId scope', async () => {
      const unsafeCypher = 'MATCH (n) RETURN n';
      await expect(repo.getSubgraphByCypher('case-123', unsafeCypher))
        .rejects
        .toThrow('Security Violation: Cypher query must be scoped to the active Case ID.');
    });

    it('should execute valid scoped queries', async () => {
      const validCypher = 'MATCH (c:Case {id: $caseId})-->(n) RETURN n';

      // Mock result
      mockRunCypher.mockResolvedValue([
        { n: { identity: 1, labels: ['Person'], properties: { id: 'p1', name: 'Alice' } } }
      ]);

      const result = await repo.getSubgraphByCypher('case-123', validCypher);

      expect(mockRunCypher).toHaveBeenCalledWith(validCypher, expect.objectContaining({ caseId: 'case-123' }));
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('p1');
    });

    it('should handle complex paths', async () => {
        const validCypher = 'MATCH (c:Case {id: $caseId})-[*]-(n) RETURN n';

        // Mock result with a path segment
        mockRunCypher.mockResolvedValue([
          {
              path: {
                  segments: [{
                      start: { identity: 1, labels: ['Case'], properties: { id: 'c1' } },
                      end: { identity: 2, labels: ['Person'], properties: { id: 'p1', name: 'Bob' } },
                      relationship: { identity: 10, type: 'RELATED_TO', properties: {} }
                  }]
              }
          }
        ]);

        const result = await repo.getSubgraphByCypher('case-123', validCypher);

        expect(result.nodes).toHaveLength(2); // Case and Person
        expect(result.edges).toHaveLength(1);
      });
  });
});
