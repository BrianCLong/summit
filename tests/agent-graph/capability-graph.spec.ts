import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { CapabilityGraph, CapabilityNode, CapabilityEdge } from '../../src/agent-graph/schema.js';

describe('Capability Graph Schema', () => {
  it('should define a valid graph', () => {
    const node: CapabilityNode = {
      id: "agent-1",
      kind: "agent",
      riskTier: "low",
      requiresEvidence: true,
      tags: ["test"]
    };
    const edge: CapabilityEdge = {
      id: "edge-1",
      from: "agent-1",
      to: "tool-1",
      allow: true,
      requiredChecks: ["check-1"],
      evidenceKinds: ["evidence-1"],
      maxCostUsd: 1.5,
      maxLatencyMs: 1000
    };
    const graph: CapabilityGraph = {
      version: "v1",
      nodes: [node, { id: "tool-1", kind: "tool", riskTier: "low", requiresEvidence: false, tags: [] }],
      edges: [edge]
    };

    assert.strictEqual(graph.nodes.length, 2);
    assert.strictEqual(graph.edges.length, 1);
    assert.strictEqual(graph.edges[0].allow, true);
  });
});
