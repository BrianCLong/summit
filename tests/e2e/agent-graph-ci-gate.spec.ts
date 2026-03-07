import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateRuntimeGuard } from '../../src/agent-graph/runtime-guard.js';
import type { CapabilityGraph } from '../../src/agent-graph/schema.js';

describe('CI Gate E2E', () => {
  const graph: CapabilityGraph = {
    version: "v1",
    nodes: [
      { id: "n1", kind: "agent", riskTier: "low", requiresEvidence: false, tags: [] },
      { id: "n2", kind: "tool", riskTier: "low", requiresEvidence: false, tags: [] }
    ],
    edges: [
      { id: "e1", from: "n1", to: "n2", allow: true, requiredChecks: [], evidenceKinds: [], maxCostUsd: 5.0, maxLatencyMs: 1000 }
    ]
  };

  it('should allow valid guard evaluation', () => {
    const result = evaluateRuntimeGuard(graph, ["n1", "n2"], 10.0, 5);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.costUsd, 5.0);
    assert.strictEqual(result.latencyMs, 1000);
  });

  it('should deny if depth exceeded', () => {
    const result = evaluateRuntimeGuard(graph, ["n1", "n2"], 10.0, 1);
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || "", /Traversal depth 2 exceeds maximum allowed depth 1/);
  });

  it('should deny if cost exceeded', () => {
    const result = evaluateRuntimeGuard(graph, ["n1", "n2"], 2.0, 5);
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || "", /Estimated cost \$5 exceeds maximum budget \$2/);
  });
});
