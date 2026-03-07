import { describe, it } from 'node:test';
import assert from 'node:assert';
import { adaptPolicyToGraph, PolicyRule } from '../../src/agent-graph/policy-adapter.js';
import type { CapabilityGraph } from '../../src/agent-graph/schema.js';

describe('Policy Adapter', () => {
  const baseGraph: CapabilityGraph = {
    version: "v1",
    nodes: [],
    edges: [
      { id: "e1", from: "action-1", to: "resource-1", allow: true, requiredChecks: [], evidenceKinds: [] }
    ]
  };

  it('should adapt deny policies', () => {
    const rules: PolicyRule[] = [
      { action: "action-1", resource: "resource-1", effect: "deny" }
    ];
    const newGraph = adaptPolicyToGraph(rules, baseGraph);
    assert.strictEqual(newGraph.edges[0].allow, false);
  });
});
