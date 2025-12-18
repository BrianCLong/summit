/**
 * ScenarioAnalytics Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxGraph } from '../src/services/SandboxGraph.js';
import { WhatIfOperations } from '../src/services/WhatIfOperations.js';
import { ScenarioAnalytics } from '../src/services/ScenarioAnalytics.js';

describe('ScenarioAnalytics', () => {
  let sandboxGraph: SandboxGraph;
  let whatIfOps: WhatIfOperations;
  let analytics: ScenarioAnalytics;

  beforeEach(() => {
    sandboxGraph = new SandboxGraph('test-scenario');
    whatIfOps = new WhatIfOperations(sandboxGraph);
    analytics = new ScenarioAnalytics(sandboxGraph);
  });

  describe('Basic Metrics', () => {
    it('should compute metrics for an empty graph', async () => {
      const metrics = await analytics.computeMetrics();

      expect(metrics.scenarioId).toBe('test-scenario');
      expect(metrics.nodeCount).toBe(0);
      expect(metrics.edgeCount).toBe(0);
      expect(metrics.avgDegree).toBe(0);
      expect(metrics.density).toBe(0);
    });

    it('should compute metrics for a simple graph', async () => {
      await whatIfOps.addEntity('Person', 'Alice');
      await whatIfOps.addEntity('Person', 'Bob');
      await whatIfOps.addEntity('Person', 'Charlie');

      const alice = (await sandboxGraph.getAllNodes())[0];
      const bob = (await sandboxGraph.getAllNodes())[1];
      const charlie = (await sandboxGraph.getAllNodes())[2];

      await whatIfOps.createRelationship(alice.id, bob.id, 'KNOWS');
      await whatIfOps.createRelationship(bob.id, charlie.id, 'KNOWS');

      const metrics = await analytics.computeMetrics();

      expect(metrics.nodeCount).toBe(3);
      expect(metrics.edgeCount).toBe(2);
      expect(metrics.avgDegree).toBeCloseTo(4 / 3, 2);
      expect(metrics.computationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should compute connected components', async () => {
      // Create two disconnected components
      await whatIfOps.addEntity('Person', 'Alice');
      await whatIfOps.addEntity('Person', 'Bob');
      await whatIfOps.addEntity('Person', 'Charlie');
      await whatIfOps.addEntity('Person', 'David');

      const nodes = await sandboxGraph.getAllNodes();
      await whatIfOps.createRelationship(nodes[0].id, nodes[1].id, 'KNOWS');
      await whatIfOps.createRelationship(nodes[2].id, nodes[3].id, 'KNOWS');

      const metrics = await analytics.computeMetrics();

      expect(metrics.connectedComponents).toBe(2);
    });
  });

  describe('Centrality Metrics', () => {
    it('should compute PageRank', async () => {
      // Create a star topology (hub with spokes)
      await whatIfOps.addEntity('Person', 'Hub');
      await whatIfOps.addEntity('Person', 'Spoke1');
      await whatIfOps.addEntity('Person', 'Spoke2');
      await whatIfOps.addEntity('Person', 'Spoke3');

      const nodes = await sandboxGraph.getAllNodes();
      const hub = nodes[0];

      await whatIfOps.createRelationship(nodes[1].id, hub.id, 'POINTS_TO');
      await whatIfOps.createRelationship(nodes[2].id, hub.id, 'POINTS_TO');
      await whatIfOps.createRelationship(nodes[3].id, hub.id, 'POINTS_TO');

      const metrics = await analytics.computeMetrics(undefined, ['centrality']);

      expect(metrics.topNodesByPageRank.length).toBeGreaterThan(0);

      // Hub should have highest PageRank
      const topNode = metrics.topNodesByPageRank[0];
      expect(topNode.nodeId).toBe(hub.id);
    });

    it('should compute betweenness centrality', async () => {
      // Create a chain: A -> B -> C -> D
      await whatIfOps.addEntity('Person', 'A');
      await whatIfOps.addEntity('Person', 'B');
      await whatIfOps.addEntity('Person', 'C');
      await whatIfOps.addEntity('Person', 'D');

      const nodes = await sandboxGraph.getAllNodes();
      await whatIfOps.createRelationship(nodes[0].id, nodes[1].id, 'NEXT');
      await whatIfOps.createRelationship(nodes[1].id, nodes[2].id, 'NEXT');
      await whatIfOps.createRelationship(nodes[2].id, nodes[3].id, 'NEXT');

      const metrics = await analytics.computeMetrics(undefined, ['centrality']);

      expect(metrics.topNodesByBetweenness.length).toBeGreaterThan(0);

      // B and C should have highest betweenness (they're in the middle)
      const topTwo = metrics.topNodesByBetweenness.slice(0, 2).map(n => n.nodeId);
      expect(topTwo).toContain(nodes[1].id);
      expect(topTwo).toContain(nodes[2].id);
    });
  });

  describe('Path Metrics', () => {
    it('should compute path metrics', async () => {
      // Create a connected graph
      await whatIfOps.addEntity('Person', 'A');
      await whatIfOps.addEntity('Person', 'B');
      await whatIfOps.addEntity('Person', 'C');

      const nodes = await sandboxGraph.getAllNodes();
      await whatIfOps.createRelationship(nodes[0].id, nodes[1].id, 'CONNECTS');
      await whatIfOps.createRelationship(nodes[1].id, nodes[2].id, 'CONNECTS');

      const metrics = await analytics.computeMetrics(undefined, ['path_length']);

      expect(metrics.avgPathLength).toBeDefined();
      expect(metrics.diameter).toBeDefined();
      expect(metrics.diameter).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Clustering Metrics', () => {
    it('should compute clustering coefficient', async () => {
      // Create a triangle (complete graph of 3 nodes)
      await whatIfOps.addEntity('Person', 'A');
      await whatIfOps.addEntity('Person', 'B');
      await whatIfOps.addEntity('Person', 'C');

      const nodes = await sandboxGraph.getAllNodes();
      await whatIfOps.createRelationship(nodes[0].id, nodes[1].id, 'KNOWS');
      await whatIfOps.createRelationship(nodes[1].id, nodes[2].id, 'KNOWS');
      await whatIfOps.createRelationship(nodes[2].id, nodes[0].id, 'KNOWS');

      const metrics = await analytics.computeMetrics(undefined, ['clustering']);

      const clusteringMetric = metrics.metrics.find(m => m.name === 'clustering_coefficient');
      expect(clusteringMetric).toBeDefined();
      expect(clusteringMetric!.value).toBeGreaterThan(0);
    });
  });

  describe('Risk Metrics', () => {
    it('should compute risk metrics from node properties', async () => {
      sandboxGraph.addNode(['Person'], { name: 'LowRisk', riskScore: 10 });
      sandboxGraph.addNode(['Person'], { name: 'MediumRisk', riskScore: 50 });
      sandboxGraph.addNode(['Person'], { name: 'HighRisk', riskScore: 80 });

      const metrics = await analytics.computeMetrics(undefined, ['risk_score']);

      expect(metrics.aggregateRiskScore).toBeDefined();
      expect(metrics.aggregateRiskScore).toBeCloseTo((10 + 50 + 80) / 3, 1);
      expect(metrics.riskDistribution.low).toBe(1);
      expect(metrics.riskDistribution.medium).toBe(1);
      expect(metrics.riskDistribution.high).toBe(1);
    });
  });

  describe('Detection Metrics', () => {
    it('should compute detection coverage', async () => {
      sandboxGraph.addNode(['Entity'], { detected: true, detectionTime: 100 });
      sandboxGraph.addNode(['Entity'], { detected: true, detectionTime: 200 });
      sandboxGraph.addNode(['Entity'], { detected: false });

      const metrics = await analytics.computeMetrics(undefined, ['detection_time', 'coverage']);

      expect(metrics.detectionCoverage).toBeCloseTo(2 / 3, 2);
      expect(metrics.avgDetectionTime).toBe(150);
    });
  });

  describe('Delta Computation', () => {
    it('should compute deltas from baseline', async () => {
      // Create baseline
      sandboxGraph.addNode(['Person'], { name: 'Alice' });
      sandboxGraph.addNode(['Person'], { name: 'Bob' });

      const baselineMetrics = await analytics.computeMetrics();

      // Add more nodes
      sandboxGraph.addNode(['Person'], { name: 'Charlie' });
      sandboxGraph.addNode(['Person'], { name: 'David' });

      const newMetrics = await analytics.computeMetrics(baselineMetrics);

      expect(newMetrics.deltas.length).toBeGreaterThan(0);

      const nodeCountDelta = newMetrics.deltas.find(d => d.metricName === 'node_count');
      expect(nodeCountDelta).toBeDefined();
      expect(nodeCountDelta!.baselineValue).toBe(2);
      expect(nodeCountDelta!.scenarioValue).toBe(4);
      expect(nodeCountDelta!.absoluteDelta).toBe(2);
      expect(nodeCountDelta!.direction).toBe('increase');
      expect(nodeCountDelta!.significant).toBe(true);
    });

    it('should identify significant changes', async () => {
      sandboxGraph.addNode(['Person'], { riskScore: 20 });
      sandboxGraph.addNode(['Person'], { riskScore: 20 });

      const baseline = await analytics.computeMetrics();

      // Add high risk nodes
      sandboxGraph.addNode(['Person'], { riskScore: 90 });
      sandboxGraph.addNode(['Person'], { riskScore: 90 });

      const newMetrics = await analytics.computeMetrics(baseline);

      const riskDelta = newMetrics.deltas.find(d => d.metricName === 'aggregate_risk_score');
      expect(riskDelta).toBeDefined();
      expect(riskDelta!.significant).toBe(true);
      expect(riskDelta!.direction).toBe('increase');
    });
  });

  describe('Scenario Comparison', () => {
    it('should compare two scenarios', async () => {
      // Create scenario 1
      const graph1 = new SandboxGraph('scenario-1');
      graph1.addNode(['Person'], { name: 'Alice' });
      graph1.addNode(['Person'], { name: 'Bob' });

      // Create scenario 2
      const graph2 = new SandboxGraph('scenario-2');
      graph2.addNode(['Person'], { name: 'Alice' });
      graph2.addNode(['Person'], { name: 'Bob' });
      graph2.addNode(['Person'], { name: 'Charlie' });

      const analytics1 = new ScenarioAnalytics(graph1);
      const comparison = await analytics1.compareScenarios(graph1, graph2);

      expect(comparison.scenario1Id).toBe('scenario-1');
      expect(comparison.scenario2Id).toBe('scenario-2');
      expect(comparison.scenario1Metrics.nodeCount).toBe(2);
      expect(comparison.scenario2Metrics.nodeCount).toBe(3);
      expect(comparison.structuralDifferences.nodesOnlyIn2.length).toBe(1);
    });

    it('should detect modified nodes', async () => {
      const graph1 = new SandboxGraph('scenario-1');
      const node = graph1.addNode(['Person'], { name: 'Alice', age: 30 });

      const graph2 = graph1.clone('scenario-2');
      await graph2.updateNode(node.id, { age: 31 });

      const analytics1 = new ScenarioAnalytics(graph1);
      const comparison = await analytics1.compareScenarios(graph1, graph2);

      expect(comparison.structuralDifferences.modifiedNodes).toContain(node.id);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary text', async () => {
      sandboxGraph.addNode(['Person'], { name: 'Alice' });
      sandboxGraph.addNode(['Person'], { name: 'Bob' });

      const metrics = await analytics.computeMetrics();

      expect(metrics.summary).toBeDefined();
      expect(metrics.summary).toContain('2 nodes');
    });

    it('should generate warnings', async () => {
      // Create disconnected graph
      sandboxGraph.addNode(['Person'], { name: 'Alice' });
      sandboxGraph.addNode(['Person'], { name: 'Bob' });
      sandboxGraph.addNode(['Person'], { name: 'Charlie', riskScore: 90 });

      const metrics = await analytics.computeMetrics();

      expect(metrics.warnings.length).toBeGreaterThan(0);
      expect(metrics.warnings.some(w => w.includes('disconnected'))).toBe(true);
      expect(metrics.warnings.some(w => w.includes('risk'))).toBe(true);
    });

    it('should generate recommendations', async () => {
      sandboxGraph.addNode(['Entity'], { riskScore: 20 });
      const baseline = await analytics.computeMetrics();

      sandboxGraph.addNode(['Entity'], { riskScore: 90 });
      sandboxGraph.addNode(['Entity'], { riskScore: 95 });

      const newMetrics = await analytics.computeMetrics(baseline);

      expect(newMetrics.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache metrics when enabled', async () => {
      const cachingAnalytics = new ScenarioAnalytics(sandboxGraph, { enableCaching: true });

      sandboxGraph.addNode(['Person'], { name: 'Alice' });

      await cachingAnalytics.computeMetrics();

      const cached = cachingAnalytics.getCachedMetrics('test-scenario');
      expect(cached).toBeDefined();
      expect(cached!.length).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      const cachingAnalytics = new ScenarioAnalytics(sandboxGraph, { enableCaching: true });

      sandboxGraph.addNode(['Person'], { name: 'Alice' });
      await cachingAnalytics.computeMetrics();

      cachingAnalytics.clearCache();

      const cached = cachingAnalytics.getCachedMetrics('test-scenario');
      expect(cached).toBeUndefined();
    });
  });

  describe('Top K Nodes', () => {
    it('should return configurable number of top nodes', async () => {
      // Create 10 nodes
      for (let i = 0; i < 10; i++) {
        sandboxGraph.addNode(['Person'], { name: `Person${i}` });
      }

      const analyticsTop5 = new ScenarioAnalytics(sandboxGraph, { topKNodes: 5 });
      const metrics = await analyticsTop5.computeMetrics(undefined, ['centrality']);

      expect(metrics.topNodesByPageRank.length).toBeLessThanOrEqual(5);
    });
  });
});
