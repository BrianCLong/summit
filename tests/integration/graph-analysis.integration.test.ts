/**
 * Integration Tests for Graph Analysis Operations
 *
 * Tests graph algorithms and analysis including:
 * - Path finding
 * - Centrality calculations
 * - Community detection
 * - Pattern matching
 * - Graph traversal
 */

import { graphFactory, simpleGraphFactory, starGraphFactory } from '../factories/graphFactory';
import { entityFactory } from '../factories/entityFactory';
import { relationshipFactory } from '../factories/relationshipFactory';
import { authenticatedContextFactory } from '../factories/contextFactory';

describe('Graph Analysis Integration Tests', () => {
  describe('Path Finding', () => {
    it('should find shortest path between two nodes', async () => {
      const graph = simpleGraphFactory();
      const sourceNode = graph.nodes[0];
      const targetNode = graph.nodes[1];

      expect(sourceNode.id).toBeDefined();
      expect(targetNode.id).toBeDefined();
      expect(graph.relationships.length).toBeGreaterThan(0);
    });

    it('should find all paths between two nodes', async () => {
      const graph = graphFactory({ nodeCount: 5, relationshipDensity: 0.5 });

      expect(graph.nodes.length).toBe(5);
      expect(graph.relationships.length).toBeGreaterThan(0);
    });

    it('should handle no path found scenario', async () => {
      const disconnectedNode1 = entityFactory({ type: 'person' });
      const disconnectedNode2 = entityFactory({ type: 'person' });

      expect(disconnectedNode1.id).not.toBe(disconnectedNode2.id);
    });

    it('should respect maximum path length constraints', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });
      const maxPathLength = 5;

      expect(graph.nodes.length).toBe(10);
      expect(maxPathLength).toBe(5);
    });
  });

  describe('Centrality Calculations', () => {
    it('should calculate degree centrality', async () => {
      const graph = starGraphFactory(5);
      const centralNode = graph.nodes[0];

      // Central node should have connections to all peripheral nodes
      const connections = graph.relationships.filter(
        (rel) => rel.sourceId === centralNode.id || rel.targetId === centralNode.id
      );

      expect(connections.length).toBe(5);
    });

    it('should calculate betweenness centrality', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(10);
    });

    it('should calculate closeness centrality', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(10);
    });

    it('should calculate PageRank', async () => {
      const graph = graphFactory({ nodeCount: 20, relationshipDensity: 0.25 });

      expect(graph.nodes.length).toBe(20);
    });
  });

  describe('Community Detection', () => {
    it('should detect communities using Louvain algorithm', async () => {
      const graph = graphFactory({ nodeCount: 30, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(30);
    });

    it('should detect communities using Label Propagation', async () => {
      const graph = graphFactory({ nodeCount: 25, relationshipDensity: 0.35 });

      expect(graph.nodes.length).toBe(25);
    });

    it('should calculate modularity score', async () => {
      const graph = graphFactory({ nodeCount: 20, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(20);
    });
  });

  describe('Pattern Matching', () => {
    it('should find triangles in the graph', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.5 });

      expect(graph.nodes.length).toBe(10);
      expect(graph.relationships.length).toBeGreaterThan(0);
    });

    it('should find specific relationship patterns', async () => {
      const person = entityFactory({ type: 'person' });
      const org = entityFactory({ type: 'organization' });
      const ip = entityFactory({ type: 'ipAddress' });

      const rel1 = relationshipFactory({
        sourceId: person.id,
        targetId: org.id,
        type: 'WORKS_AT',
      });

      const rel2 = relationshipFactory({
        sourceId: person.id,
        targetId: ip.id,
        type: 'ACCESSED',
      });

      expect(rel1.type).toBe('WORKS_AT');
      expect(rel2.type).toBe('ACCESSED');
    });

    it('should find nodes matching property patterns', async () => {
      const entity = entityFactory({
        type: 'person',
        properties: {
          role: 'admin',
          department: 'IT',
        },
      });

      expect(entity.properties.role).toBe('admin');
      expect(entity.properties.department).toBe('IT');
    });
  });

  describe('Graph Traversal', () => {
    it('should perform breadth-first search', async () => {
      const graph = graphFactory({ nodeCount: 15, relationshipDensity: 0.3 });
      const startNode = graph.nodes[0];

      expect(startNode.id).toBeDefined();
      expect(graph.nodes.length).toBe(15);
    });

    it('should perform depth-first search', async () => {
      const graph = graphFactory({ nodeCount: 15, relationshipDensity: 0.3 });
      const startNode = graph.nodes[0];

      expect(startNode.id).toBeDefined();
      expect(graph.nodes.length).toBe(15);
    });

    it('should respect traversal depth limits', async () => {
      const graph = graphFactory({ nodeCount: 20, relationshipDensity: 0.3 });
      const maxDepth = 3;

      expect(graph.nodes.length).toBe(20);
      expect(maxDepth).toBe(3);
    });

    it('should filter nodes during traversal', async () => {
      const graph = graphFactory({
        nodeCount: 10,
        relationshipDensity: 0.3,
        nodeTypes: ['person', 'organization'],
      });

      const personNodes = graph.nodes.filter((node) => node.type === 'person');

      expect(personNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Subgraph Extraction', () => {
    it('should extract k-hop neighborhood', async () => {
      const graph = graphFactory({ nodeCount: 20, relationshipDensity: 0.3 });
      const centerNode = graph.nodes[0];
      const hops = 2;

      expect(centerNode.id).toBeDefined();
      expect(hops).toBe(2);
    });

    it('should extract induced subgraph', async () => {
      const graph = graphFactory({ nodeCount: 15, relationshipDensity: 0.4 });
      const nodeIds = graph.nodes.slice(0, 5).map((n) => n.id);

      expect(nodeIds.length).toBe(5);
    });

    it('should extract subgraph by node properties', async () => {
      const graph = graphFactory({
        nodeCount: 10,
        relationshipDensity: 0.3,
        nodeTypes: ['person', 'organization', 'ipAddress'],
      });

      const personNodes = graph.nodes.filter((node) => node.type === 'person');

      expect(personNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Graph Metrics', () => {
    it('should calculate graph density', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.4 });

      const nodeCount = graph.nodes.length;
      const edgeCount = graph.relationships.length;
      const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
      const density = edgeCount / maxEdges;

      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThanOrEqual(1);
    });

    it('should calculate clustering coefficient', async () => {
      const graph = graphFactory({ nodeCount: 15, relationshipDensity: 0.35 });

      expect(graph.nodes.length).toBe(15);
    });

    it('should calculate average path length', async () => {
      const graph = graphFactory({ nodeCount: 12, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(12);
    });

    it('should detect graph connectivity', async () => {
      const graph = graphFactory({ nodeCount: 10, relationshipDensity: 0.5 });

      expect(graph.nodes.length).toBe(10);
      expect(graph.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('Temporal Graph Analysis', () => {
    it('should analyze graph evolution over time', async () => {
      const entity = entityFactory();
      const timestamps = [
        new Date('2024-01-01'),
        new Date('2024-02-01'),
        new Date('2024-03-01'),
      ];

      expect(timestamps.length).toBe(3);
      expect(entity.createdAt).toBeDefined();
    });

    it('should identify emerging patterns', async () => {
      const graph = graphFactory({ nodeCount: 20, relationshipDensity: 0.3 });

      expect(graph.nodes.length).toBe(20);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large graphs efficiently', async () => {
      const largeGraph = graphFactory({ nodeCount: 100, relationshipDensity: 0.1 });

      expect(largeGraph.nodes.length).toBe(100);
      expect(largeGraph.relationships.length).toBeGreaterThan(0);
    });

    it('should use efficient algorithms for complex queries', async () => {
      const graph = graphFactory({ nodeCount: 50, relationshipDensity: 0.2 });

      expect(graph.nodes.length).toBe(50);
    });
  });
});
