import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileAllowedPlan } from '../../src/agent-graph/compiler.js';
import type { CapabilityGraph } from '../../src/agent-graph/schema.js';

describe('Plan Compiler', () => {
  const graph: CapabilityGraph = {
    version: "v1",
    nodes: [
      { id: "a", kind: "agent", riskTier: "low", requiresEvidence: false, tags: [] },
      { id: "b", kind: "tool", riskTier: "low", requiresEvidence: false, tags: [] },
      { id: "c", kind: "tool", riskTier: "low", requiresEvidence: false, tags: [] }
    ],
    edges: [
      { id: "e1", from: "a", to: "b", allow: true, requiredChecks: ["c1"], evidenceKinds: ["e1"] },
      { id: "e2", from: "b", to: "c", allow: false, requiredChecks: [], evidenceKinds: [] }
    ]
  };

  it('should allow valid paths', () => {
    const result = compileAllowedPlan(graph, ["a", "b"]);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.violations, []);
    assert.deepStrictEqual(result.requiredChecks, ["c1"]);
    assert.deepStrictEqual(result.evidencePlan, ["e1"]);
  });

  it('should deny invalid nodes', () => {
    const result = compileAllowedPlan(graph, ["a", "d"]);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.violations[0], "Node not found in graph: d");
  });

  it('should deny missing edges', () => {
    const result = compileAllowedPlan(graph, ["a", "c"]);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.violations[0], "Missing edge from a to c");
  });

  it('should deny explicitly denied edges', () => {
    const result = compileAllowedPlan(graph, ["a", "b", "c"]);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.violations[0], "Edge from b to c is explicitly denied (allow=false)");
  });
});
