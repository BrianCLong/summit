/**
 * Simulation tests
 */

import { describe, it, expect } from 'vitest';
import {
  InfrastructureGraph,
  createSampleInfrastructure,
} from '../src/simulation/graph.js';
import {
  securityControls,
  simulateControls,
  evaluateCampaignControls,
  getControlsForTechnique,
} from '../src/simulation/controls.js';

describe('InfrastructureGraph', () => {
  it('should create empty graph', () => {
    const graph = new InfrastructureGraph();
    expect(graph.getNodes().length).toBe(0);
  });

  it('should add nodes', () => {
    const graph = new InfrastructureGraph();
    const node = graph.addNode({
      type: 'endpoint',
      name: 'test-endpoint',
      properties: {},
      controls: [],
    });

    expect(node.id).toBeDefined();
    expect(graph.getNodes().length).toBe(1);
  });

  it('should add edges between nodes', () => {
    const graph = new InfrastructureGraph();
    const node1 = graph.addNode({
      type: 'identity',
      name: 'user',
      properties: {},
      controls: [],
    });
    const node2 = graph.addNode({
      type: 'endpoint',
      name: 'workstation',
      properties: {},
      controls: [],
    });

    const edge = graph.addEdge({
      type: 'can_authenticate',
      sourceId: node1.id,
      targetId: node2.id,
      properties: {},
      weight: 1,
    });

    expect(edge.id).toBeDefined();
    const neighbors = graph.getNeighbors(node1.id);
    expect(neighbors.length).toBe(1);
    expect(neighbors[0].id).toBe(node2.id);
  });

  it('should find paths between nodes', () => {
    const graph = new InfrastructureGraph();
    const nodes = [
      graph.addNode({ type: 'identity', name: 'user', properties: {}, controls: [] }),
      graph.addNode({ type: 'endpoint', name: 'ws', properties: {}, controls: [] }),
      graph.addNode({ type: 'server', name: 'srv', properties: {}, controls: [] }),
      graph.addNode({ type: 'database', name: 'db', properties: {}, controls: [] }),
    ];

    graph.addEdge({ type: 'can_access', sourceId: nodes[0].id, targetId: nodes[1].id, properties: {}, weight: 1 });
    graph.addEdge({ type: 'network_reachable', sourceId: nodes[1].id, targetId: nodes[2].id, properties: {}, weight: 1 });
    graph.addEdge({ type: 'network_reachable', sourceId: nodes[2].id, targetId: nodes[3].id, properties: {}, weight: 1 });

    const path = graph.findPath(nodes[0].id, nodes[3].id);
    expect(path).not.toBeNull();
    expect(path?.length).toBe(4);
  });

  it('should calculate blast radius', () => {
    const graph = new InfrastructureGraph();
    const nodes = [
      graph.addNode({ type: 'endpoint', name: 'ws1', properties: {}, controls: [] }),
      graph.addNode({ type: 'endpoint', name: 'ws2', properties: {}, controls: [] }),
      graph.addNode({ type: 'server', name: 'srv', properties: {}, controls: [] }),
    ];

    graph.addEdge({ type: 'network_reachable', sourceId: nodes[0].id, targetId: nodes[1].id, properties: {}, weight: 1 });
    graph.addEdge({ type: 'network_reachable', sourceId: nodes[0].id, targetId: nodes[2].id, properties: {}, weight: 1 });

    const blastRadius = graph.calculateBlastRadius(nodes[0].id);
    expect(blastRadius.size).toBe(3);
  });

  it('should track compromise state', () => {
    const graph = new InfrastructureGraph();
    const node = graph.addNode({
      type: 'endpoint',
      name: 'target',
      properties: {},
      controls: [],
    });

    expect(node.compromised).toBe(false);
    graph.compromiseNode(node.id);
    expect(graph.getNode(node.id)?.compromised).toBe(true);

    graph.resetCompromise();
    expect(graph.getNode(node.id)?.compromised).toBe(false);
  });
});

describe('createSampleInfrastructure', () => {
  it('should create a valid sample infrastructure', () => {
    const graph = createSampleInfrastructure();
    const stats = graph.getStats();

    expect(stats.nodeCount).toBeGreaterThan(0);
    expect(stats.edgeCount).toBeGreaterThan(0);
    expect(stats.nodesByType).toHaveProperty('identity');
    expect(stats.nodesByType).toHaveProperty('endpoint');
  });
});

describe('securityControls', () => {
  it('should have built-in controls', () => {
    expect(securityControls.length).toBeGreaterThan(0);
  });

  it('should have valid control structure', () => {
    securityControls.forEach((control) => {
      expect(control.id).toBeDefined();
      expect(control.name).toBeDefined();
      expect(control.effectiveness).toBeGreaterThanOrEqual(0);
      expect(control.effectiveness).toBeLessThanOrEqual(1);
      expect(control.mitigates.length).toBeGreaterThan(0);
    });
  });
});

describe('simulateControls', () => {
  it('should evaluate controls against techniques', () => {
    const result = simulateControls('T1078', securityControls);

    expect(result.technique).toBe('T1078');
    expect(result.controlsEvaluated.length).toBeGreaterThan(0);
    expect(result.residualRisk).toBeGreaterThanOrEqual(0);
    expect(result.residualRisk).toBeLessThanOrEqual(1);
  });

  it('should identify blocking and detecting controls', () => {
    const result = simulateControls('T1078', securityControls);

    // At least one of these should be populated for a common technique
    expect(
      result.blockingControls.length > 0 || result.detectingControls.length > 0
    ).toBe(true);
  });
});

describe('evaluateCampaignControls', () => {
  it('should evaluate multiple techniques', () => {
    const techniques = ['T1078', 'T1059', 'T1003'];
    const result = evaluateCampaignControls(techniques, securityControls);

    expect(result.results.length).toBe(3);
    expect(result.avgResidualRisk).toBeGreaterThanOrEqual(0);
    expect(result.avgResidualRisk).toBeLessThanOrEqual(1);
  });
});

describe('getControlsForTechnique', () => {
  it('should return controls that mitigate the technique', () => {
    const controls = getControlsForTechnique('T1078');
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach((c) => {
      expect(c.mitigates.includes('T1078') || c.mitigates.includes('*')).toBe(true);
    });
  });
});
