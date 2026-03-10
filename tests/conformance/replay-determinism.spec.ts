import test from 'node:test';
import assert from 'node:assert';
import { assertDeterministicArtifacts, RunArtifacts } from '../../evaluation/conformance/schema-check.js';
import { replayTrace, mockSimulateTool } from '../../evaluation/replay/replay-engine.js';

test('assertDeterministicArtifacts - identical artifacts pass', () => {
  const runA: RunArtifacts = {
    trace: { steps: [] },
    plan: { tasks: [] },
    metrics: { scores: { accuracy: 1 } },
    report: { status: 'success' },
    stamp: { run_nonce: '123' }
  };
  const runB: RunArtifacts = {
    trace: { steps: [] },
    plan: { tasks: [] },
    metrics: { scores: { accuracy: 1 } },
    report: { status: 'success' },
    stamp: { run_nonce: '456' } // different nonce, same structure
  };

  assert.doesNotThrow(() => assertDeterministicArtifacts(runA, runB));
});

test('replayTrace - matches simulated tool output', () => {
  const mockTrace = {
    trace_version: "1.0",
    agent_id: "test",
    steps: [
      { step: 1, action: 'search', tool: 'graphrag', input: 'test', output: ['EVID:test'] }
    ]
  };

  assert.doesNotThrow(() => replayTrace(mockTrace, mockSimulateTool));
});
