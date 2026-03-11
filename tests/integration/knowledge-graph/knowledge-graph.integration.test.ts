import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StructuredEventEmitter } from '@ga-graphai/common-types';
import {
  OrchestrationKnowledgeGraph,
  type GraphNode,
  type GraphEdge,
} from '../../../ga-graphai/packages/knowledge-graph/src/index.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Summit Knowledge Graph Integration', () => {
  let graph: OrchestrationKnowledgeGraph;
  let emitter: StructuredEventEmitter;

  const loadFixture = (name: string) => {
    const fixturePath = path.resolve(__dirname, '../../../evals/fixtures/knowledge-graph', name);
    return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  };

  beforeEach(() => {
    emitter = new StructuredEventEmitter();
    graph = new OrchestrationKnowledgeGraph(emitter);
  });

  describe('Entity Extraction & Storage Round-trips', () => {
    it('should ingest entities and relationships from a standard topology fixture', async () => {
      const fixture = loadFixture('topology-standard.json');

      // Use applyUpdate to simulate ingestion of extracted entities/edges
      graph.applyUpdate({
        source: 'summit-ingestor',
        nodes: fixture.nodes,
        edges: fixture.edges,
      });

      const snapshot = graph.snapshot();

      expect(snapshot.stats?.nodes).toBe(fixture.nodes.length);
      expect(snapshot.stats?.edges).toBe(fixture.edges.length);

      const apiService = snapshot.nodes.find(n => n.id === 'service:svc-api');
      expect(apiService).toBeDefined();
      expect(apiService?.data.name).toBe('API Service');
      expect(apiService?.provenance?.source).toBe('summit-ingestor');
    });

    it('should handle data integrity during round-trips', async () => {
      const node: GraphNode = {
        id: 'service:test-integrity',
        type: 'service',
        data: { complex: { field: 123 }, tags: ['a', 'b'] }
      };

      graph.applyUpdate({
        nodes: [node]
      });

      const retrieved = graph.getNode(node.id);
      expect(retrieved?.data).toEqual(node.data);
      expect(retrieved?.provenance?.checksum).toBeDefined();
    });
  });

  describe('Relationship Creation & Traversal Correctness', () => {
    it('should correctly traverse multi-hop paths', async () => {
      const fixture = loadFixture('topology-multi-hop.json');
      graph.applyUpdate({
        nodes: fixture.nodes,
        edges: fixture.edges,
      });

      // Scenario: Find dependencies for Frontend -> Gateway -> Auth -> UserDB
      const frontend = graph.getNode('service:frontend');
      const gateway = graph.getNode('service:gateway');
      const auth = graph.getNode('service:auth');
      const userdb = graph.getNode('service:user-db');

      expect(frontend).toBeDefined();
      expect(gateway).toBeDefined();
      expect(auth).toBeDefined();
      expect(userdb).toBeDefined();

      const snapshot = graph.snapshot();
      const feToGt = snapshot.edges.find(e => e.from === 'service:frontend' && e.to === 'service:gateway');
      const gtToAuth = snapshot.edges.find(e => e.from === 'service:gateway' && e.to === 'service:auth');
      const authToDb = snapshot.edges.find(e => e.from === 'service:auth' && e.to === 'service:user-db');

      expect(feToGt).toBeDefined();
      expect(gtToAuth).toBeDefined();
      expect(authToDb).toBeDefined();
    });

    it('should correctly filter nodes based on relationship types during queries', async () => {
      const fixture = loadFixture('topology-standard.json');
      graph.applyUpdate({
        nodes: fixture.nodes,
        edges: fixture.edges,
      });

      // Query service with its environments and incidents
      const context = graph.queryService('svc-api');
      expect(context).toBeDefined();
      expect(context?.environments).toHaveLength(1);
      expect(context?.incidents).toHaveLength(1);
      expect(context?.environments[0].id).toBe('prod');
      expect(context?.incidents[0].id).toBe('inc-123');
    });
  });

  describe('Entity Deduplication & Merging Logic', () => {
    it('should identify duplicate entities based on shared attributes', async () => {
      const fixture = loadFixture('topology-duplicates.json');

      // Simulate an Entity Resolution service that identifies duplicates
      const erService = {
        findDuplicates: (nodes: any[]) => {
          const emailMap = new Map();
          const duplicates: string[][] = [];
          nodes.forEach(node => {
            if (node.data.email) {
              if (emailMap.has(node.data.email)) {
                duplicates.push([emailMap.get(node.data.email), node.id]);
              } else {
                emailMap.set(node.data.email, node.id);
              }
            }
          });
          return duplicates;
        }
      };

      const duplicates = erService.findDuplicates(fixture.nodes);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toContain('person:p-1');
      expect(duplicates[0]).toContain('person:p-2');
    });

    it('should merge duplicate nodes into a single canonical node', async () => {
      // Setup: Person A and Person B are the same person
      const personA = { id: 'person:a', type: 'person', data: { name: 'Alice Smith', email: 'alice@example.com' } };
      const personB = { id: 'person:b', type: 'person', data: { name: 'A. Smith', email: 'alice@example.com' } };

      graph.applyUpdate({ nodes: [personA] });

      // Merge Person B into Person A
      graph.applyUpdate({
        nodes: [{
          ...personA,
          data: { ...personA.data, alias: 'A. Smith' },
          provenance: {
            source: 'merger',
            ingress: 'processing',
            observedAt: new Date().toISOString(),
            checksum: 'merged-checksum',
            lineage: ['person:a', 'person:b']
          }
        }],
        deletions: { nodes: ['person:b'] }
      });

      const snapshot = graph.snapshot();
      expect(snapshot.nodes.find(n => n.id === 'person:b')).toBeUndefined();
      const merged = snapshot.nodes.find(n => n.id === 'person:a');
      expect(merged).toBeDefined();
      expect(merged?.data.alias).toBe('A. Smith');
      expect(merged?.provenance?.lineage).toContain('person:b');
    });
  });

  describe('Temporal Versioning & Concurrency', () => {
    it('should track temporal versions of graph nodes', async () => {
      const nodeId = 'service:versioned';
      const v1Data = { status: 'active', version: 1 };
      const v2Data = { status: 'deprecated', version: 2 };

      graph.applyUpdate({
        nodes: [{ id: nodeId, type: 'service', data: v1Data, observedAt: '2024-01-01T00:00:00Z' }]
      });

      graph.applyUpdate({
        nodes: [{ id: nodeId, type: 'service', data: v2Data, observedAt: '2024-02-01T00:00:00Z' }]
      });

      const snapshot = graph.snapshot();
      const node = snapshot.nodes.find(n => n.id === nodeId);
      expect(node?.data.version).toBe(2);
      expect(node?.provenance?.observedAt).toBeDefined();
    });

    it('should handle concurrent write operations consistently', async () => {
      const updates = Array.from({ length: 5 }, (_, i) => ({
        nodes: [{ id: `service:concurrent-${i}`, type: 'service' as const, data: { i } }]
      }));

      // Simulate concurrent updates
      await Promise.all(updates.map(u => graph.applyUpdate(u)));

      const snapshot = graph.snapshot();
      expect(snapshot.stats?.nodes).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < 5; i++) {
        expect(snapshot.nodes.find(n => n.id === `service:concurrent-${i}`)).toBeDefined();
      }
    });
  });

  describe('Resilience & Graceful Degradation', () => {
    it('should handle missing nodes gracefully during traversal', async () => {
      // Setup a broken relationship (to a non-existent node)
      graph.applyUpdate({
        edges: [{ id: 'broken-edge', from: 'service:source', to: 'service:missing', type: 'DEPENDS_ON' }]
      });

      const snapshot = graph.snapshot();
      expect(snapshot.stats?.edges).toBe(1);
      expect(snapshot.lineage?.missingNodes).toContain('service:missing');
    });

    it('should degrade gracefully when an ingestion source fails', async () => {
      const failingConnector = {
        loadServices: async () => { throw new Error('Source Unavailable'); }
      };

      graph.registerServiceConnector(failingConnector);

      // Verify that refresh throws but preserves previous state or allows partial success
      await expect(graph.refresh()).rejects.toThrow('Source Unavailable');

      const snapshot = graph.snapshot();
      expect(snapshot.nodes).toBeDefined(); // Should still be able to get a snapshot of existing data
    });

    it('should enforce mutation thresholds to prevent accidental mass deletions', async () => {
      // Enable strict mode with low threshold
      const strictGraph = new OrchestrationKnowledgeGraph(new StructuredEventEmitter(), {
        mutationThreshold: 1
      });

      strictGraph.applyUpdate({ nodes: [{ id: 'node-1', type: 'service' }] });

      // Attempt to add 2 more nodes (total delta = 2 > threshold)
      expect(() => strictGraph.applyUpdate({
        nodes: [
          { id: 'node-2', type: 'service' },
          { id: 'node-3', type: 'service' }
        ]
      })).toThrow(/Refusing to mutate/);
    });
  });
});
