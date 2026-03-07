import test from 'node:test';
import assert from 'node:assert';
import { assertDeterministicArtifacts } from '../../evaluation/conformance/schema-check.js';
import { replayTrace } from '../../evaluation/replay/replay-engine.js';

test('assertDeterministicArtifacts should pass for identical artifacts', () => {
  const artifactsA = {
    trace: { trace_version: '1.0', agent_id: 'agent1', steps: [], evidence_ids: [] },
    plan: { plan_version: '1.0', agent_id: 'agent1', steps: [] },
    metrics: { metrics_version: '1.0', agent_id: 'agent1' },
    report: { report_version: '1.0', agent_id: 'agent1' },
    stamp: { stamp_version: '1.0', agent_id: 'agent1' }
  };
  const artifactsB = JSON.parse(JSON.stringify(artifactsA));
  assert.doesNotThrow(() => assertDeterministicArtifacts(artifactsA, artifactsB));
});

test('assertDeterministicArtifacts should throw for mismatched trace', () => {
  const artifactsA = {
    trace: { trace_version: '1.0', agent_id: 'agent1', steps: [], evidence_ids: [] },
    plan: { plan_version: '1.0', agent_id: 'agent1', steps: [] },
    metrics: { metrics_version: '1.0', agent_id: 'agent1' },
    report: { report_version: '1.0', agent_id: 'agent1' },
    stamp: { stamp_version: '1.0', agent_id: 'agent1' }
  };
  const artifactsB = JSON.parse(JSON.stringify(artifactsA));
  artifactsB.trace.agent_id = 'agent2';
  assert.throws(() => assertDeterministicArtifacts(artifactsA, artifactsB), /trace mismatch/);
});

test('replayTrace should run without error', () => {
  const trace = {
    trace_version: '1.0',
    agent_id: 'agent1',
    steps: [{ step: 1, action: 'retrieve', tool: 'graphrag_query', input: {}, output: [] }],
    evidence_ids: []
  };
  assert.doesNotThrow(() => replayTrace(trace));
});
