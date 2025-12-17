import { describe, it, expect, beforeEach } from 'vitest';
import { GraphStorage } from '@intelgraph/graph-database';
import { PathFinding } from '../pathfinding/PathFinding.js';
import { CentralityMetrics } from '../centrality/CentralityMetrics.js';
import { CommunityDetection } from '../community/CommunityDetection.js';

describe('Graph Algorithms', () => {
  let storage: GraphStorage;

  beforeEach(() => {
    storage = new GraphStorage();
  });

  describe('PathFinding', () => {
    it('should find shortest path with Dijkstra', () => {
      const a = storage.addNode('Node', { name: 'A' });
      const b = storage.addNode('Node', { name: 'B' });
      const c = storage.addNode('Node', { name: 'C' });

      storage.addEdge(a.id, b.id, 'CONNECTS', { weight: 1 });
      storage.addEdge(b.id, c.id, 'CONNECTS', { weight: 1 });
      storage.addEdge(a.id, c.id, 'CONNECTS', { weight: 5 });

      const pathFinding = new PathFinding(storage);
      const result = pathFinding.dijkstra(a.id, c.id);

      expect(result.path.length).toBe(3);
      expect(result.distance).toBe(2);
    });

    it('should find all paths between nodes', () => {
      const a = storage.addNode('Node', { name: 'A' });
      const b = storage.addNode('Node', { name: 'B' });
      const c = storage.addNode('Node', { name: 'C' });

      storage.addEdge(a.id, b.id, 'CONNECTS');
      storage.addEdge(b.id, c.id, 'CONNECTS');
      storage.addEdge(a.id, c.id, 'CONNECTS');

      const pathFinding = new PathFinding(storage);
      const paths = pathFinding.findAllPaths(a.id, c.id, 3);

      expect(paths.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Centrality Metrics', () => {
    it('should calculate degree centrality', () => {
      const hub = storage.addNode('Node', { name: 'Hub' });
      const n1 = storage.addNode('Node', { name: 'N1' });
      const n2 = storage.addNode('Node', { name: 'N2' });
      const n3 = storage.addNode('Node', { name: 'N3' });

      storage.addEdge(hub.id, n1.id, 'CONNECTS');
      storage.addEdge(hub.id, n2.id, 'CONNECTS');
      storage.addEdge(hub.id, n3.id, 'CONNECTS');

      const centrality = new CentralityMetrics(storage);
      const degrees = centrality.degreeCentrality();

      expect(degrees.get(hub.id)).toBeGreaterThan(degrees.get(n1.id) || 0);
    });

    it('should calculate PageRank', () => {
      const a = storage.addNode('Node', { name: 'A' });
      const b = storage.addNode('Node', { name: 'B' });
      const c = storage.addNode('Node', { name: 'C' });

      storage.addEdge(a.id, b.id, 'LINKS');
      storage.addEdge(c.id, b.id, 'LINKS');

      const centrality = new CentralityMetrics(storage);
      const pageRank = centrality.pageRank();

      // B should have highest PageRank (most inbound links)
      expect(pageRank.get(b.id)).toBeGreaterThan(pageRank.get(a.id) || 0);
    });
  });

  describe('Community Detection', () => {
    it('should detect communities with Label Propagation', () => {
      // Create two clusters
      const a1 = storage.addNode('Node', { cluster: 1 });
      const a2 = storage.addNode('Node', { cluster: 1 });
      const a3 = storage.addNode('Node', { cluster: 1 });

      const b1 = storage.addNode('Node', { cluster: 2 });
      const b2 = storage.addNode('Node', { cluster: 2 });
      const b3 = storage.addNode('Node', { cluster: 2 });

      // Dense connections within clusters
      storage.addEdge(a1.id, a2.id, 'CONNECTS');
      storage.addEdge(a2.id, a3.id, 'CONNECTS');
      storage.addEdge(a1.id, a3.id, 'CONNECTS');

      storage.addEdge(b1.id, b2.id, 'CONNECTS');
      storage.addEdge(b2.id, b3.id, 'CONNECTS');
      storage.addEdge(b1.id, b3.id, 'CONNECTS');

      // Single connection between clusters
      storage.addEdge(a1.id, b1.id, 'CONNECTS');

      const community = new CommunityDetection(storage);
      const communities = community.labelPropagation();

      expect(communities.size).toBeGreaterThan(0);
    });
  });
});
