import { TimeScopeResolver } from '../temporal/time_scope_resolver';
import { DynamicSubgraph } from '../temporal/dynamic_subgraph';
import { PPR } from '../temporal/ppr';
import { TGRAGScorer } from '../temporal/scoring';
import { TemporalEdge } from '../temporal/types';

describe('Temporal GraphRAG', () => {
  const resolver = new TimeScopeResolver();

  describe('TimeScopeResolver', () => {
    it('should parse year correctly', async () => {
      const scope = await resolver.resolve("What happened in 2024?");
      expect(scope.start.getFullYear()).toBe(2024);
      expect(scope.end.getFullYear()).toBe(2024);
    });

    it('should parse month correctly', async () => {
      const scope = await resolver.resolve("Events in Oct 2025");
      expect(scope.start.getMonth()).toBe(9); // October is 9
      expect(scope.start.getFullYear()).toBe(2025);
    });

    it('should parse ISO date correctly', async () => {
      const scope = await resolver.resolve("Incident on 2025-10-27");
      expect(scope.start.toISOString().startsWith('2025-10-27')).toBe(true);
    });
  });

  describe('DynamicSubgraph', () => {
    it('should filter edges by time scope', async () => {
      const edges: TemporalEdge[] = [
        { v1: 'A', v2: 'B', rel: 'T1', timestamp: '2024-01-01T00:00:00Z', chunkIds: [] },
        { v1: 'B', v2: 'C', rel: 'T2', timestamp: '2025-01-01T00:00:00Z', chunkIds: [] }
      ];
      const scope = { start: new Date('2025-01-01'), end: new Date('2025-12-31'), raw: '2025' };

      const adj = DynamicSubgraph.build(edges, scope);
      const nodes = DynamicSubgraph.getNodes(adj);

      expect(nodes).toContain('B');
      expect(nodes).toContain('C');
      expect(nodes).not.toContain('A');
    });
  });

  describe('PPR', () => {
    it('should score nodes by salience', async () => {
      const adj = {
        'A': { 'B': 1 },
        'B': { 'C': 1 },
        'C': { 'A': 1 }
      };

      const scores = PPR.calculate(adj, ['A']);

      expect(scores['A']).toBeGreaterThan(scores['C']);
    });
  });

  describe('TGRAGScorer', () => {
    it('should zero out scores for out-of-scope edges', () => {
      const scope = { start: new Date('2025-01-01'), end: new Date('2025-12-31'), raw: '2025' };
      const edge: TemporalEdge = { v1: 'A', v2: 'B', rel: 'T1', timestamp: '2024-01-01T00:00:00Z', chunkIds: [] };
      const nodeScores = { 'A': 0.5, 'B': 0.5 };

      const edgeScore = TGRAGScorer.scoreEdge(edge, nodeScores, scope);
      expect(edgeScore).toBe(0);
    });
  });
});
