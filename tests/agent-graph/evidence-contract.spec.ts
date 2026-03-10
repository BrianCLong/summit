import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateEvidenceId, createDeterministicStamp } from '../../src/agent-graph/evidence.js';
import type { CapabilityGraph } from '../../src/agent-graph/schema.js';

describe('Evidence Contract', () => {
  it('should generate valid evidence ID', () => {
    const id = generateEvidenceId("v1", "edge.agentplace-policy->opa-sim", "0007");
    assert.strictEqual(id, "EVID:agent-capability-graph:v1:edge.agentplace-policy->opa-sim:0007");
  });

  it('should create deterministic stamp without timestamps', () => {
    const graph: CapabilityGraph = { version: "v2", nodes: [], edges: [] };
    const stamp1 = createDeterministicStamp(graph, "1");
    const stamp2 = createDeterministicStamp(graph, "1");

    assert.strictEqual(stamp1.evidence_id, stamp2.evidence_id);
    assert.strictEqual(stamp1.hash, stamp2.hash);
    assert.strictEqual(stamp1.graph_version, "v2");
    assert.strictEqual(stamp1.evidence_id, "EVID:agent-capability-graph:v2:plan:0001");
  });
});
