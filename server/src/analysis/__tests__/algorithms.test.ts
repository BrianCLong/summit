import { describe, it, expect } from '@jest/globals';
import { shortestPath } from '../algorithms/shortestPath.js';
import { degreeCentrality } from '../algorithms/centrality.js';
import { connectedComponents } from '../algorithms/community.js';
import { kHopNeighborhood } from '../algorithms/traversal.js';
import { Graph } from '../graphTypes.js';

const testGraph: Graph = {
  nodes: [
    { id: 'A', type: 'person', tenantId: 't1', properties: {} },
    { id: 'B', type: 'person', tenantId: 't1', properties: {} },
    { id: 'C', type: 'person', tenantId: 't1', properties: {} },
    { id: 'D', type: 'person', tenantId: 't1', properties: {} },
    { id: 'E', type: 'person', tenantId: 't1', properties: {} } // Isolated
  ],
  edges: [
    { id: 'e1', source: 'A', target: 'B', type: 'knows', tenantId: 't1', properties: {} },
    { id: 'e2', source: 'B', target: 'C', type: 'knows', tenantId: 't1', properties: {} },
    { id: 'e3', source: 'C', target: 'A', type: 'knows', tenantId: 't1', properties: {} }, // Cycle A-B-C-A
    { id: 'e4', source: 'C', target: 'D', type: 'knows', tenantId: 't1', properties: {} }
  ]
};

describe('Graph Algorithms', () => {
  describe('Shortest Path', () => {
    it('finds path from A to D', () => {
      const result = shortestPath(testGraph, 'A', 'D');
      expect(result.distance).toBe(3);
      expect(result.path).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns null for unreachable nodes', () => {
      const result = shortestPath(testGraph, 'A', 'E');
      expect(result.path).toBeNull();
    });
  });

  describe('Degree Centrality', () => {
    it('calculates degree centrality correctly', () => {
      const result = degreeCentrality(testGraph, 'both');
      // A: out 1 (e1), in 1 (e3) = 2
      // B: out 1 (e2), in 1 (e1) = 2
      // C: out 2 (e3, e4), in 1 (e2) = 3
      // D: out 0, in 1 (e4) = 1
      // E: 0
      expect(result.scores['C']).toBe(3);
      expect(result.scores['E']).toBe(0);
      expect(result.sortedNodes[0].id).toBe('C');
    });
  });

  describe('Connected Components', () => {
    it('identifies components correctly', () => {
      const result = connectedComponents(testGraph);
      expect(result.componentCount).toBe(2); // {A,B,C,D} and {E}
      const componentSizes = result.components.map(c => c.length).sort((a,b) => b-a);
      expect(componentSizes).toEqual([4, 1]);
    });
  });

  describe('k-Hop Neighborhood', () => {
    it('finds 1-hop neighborhood of B', () => {
      const result = kHopNeighborhood(testGraph, 'B', 1, 'out');
      // B -> C
      expect(result.nodes.map(n => n.id)).toContain('C');
      expect(result.nodes.length).toBe(2); // B, C
    });

    it('finds 2-hop neighborhood of A', () => {
      const result = kHopNeighborhood(testGraph, 'A', 2, 'out');
      // A->B->C
      expect(result.nodes.map(n => n.id).sort()).toEqual(['A', 'B', 'C']);
    });
  });
});
