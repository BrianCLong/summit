import { test } from 'node:test';
import assert from 'node:assert';
import { runDeterministicTask } from "../../benchmarks/agent-spine/run";
import { SpineTask } from "../../benchmarks/agent-spine/schema";

test("deterministic benchmark spine is byte-stable", () => {
  const task: SpineTask = {
    suite: "graphrag-mini",
    case_id: "001",
    prompt: "Summarize linked evidence",
    expected_evidence: ["doc-1", "doc-2"],
    tool_trace: [{ tool: "graphrag.lookup", input: "entity:A", output_ref: "ref-1" }],
  };

  const a = JSON.stringify(runDeterministicTask(task));
  const b = JSON.stringify(runDeterministicTask(task));
  assert.strictEqual(a, b);
});

test("deterministic benchmark spine correctly scores based on expected_evidence", () => {
  const taskFail: SpineTask = {
    suite: "graphrag-mini",
    case_id: "002",
    prompt: "No evidence found",
    expected_evidence: [],
    tool_trace: [{ tool: "graphrag.lookup", input: "entity:B", output_ref: "ref-2" }],
  };

  const failResult = runDeterministicTask(taskFail);
  assert.strictEqual(failResult.passed, false);
  assert.strictEqual(failResult.score, 0);

  const taskPass: SpineTask = {
    suite: "graphrag-mini",
    case_id: "003",
    prompt: "Evidence found",
    expected_evidence: ["doc-1"],
    tool_trace: [{ tool: "graphrag.lookup", input: "entity:C", output_ref: "ref-3" }],
  };

  const passResult = runDeterministicTask(taskPass);
  assert.strictEqual(passResult.passed, true);
  assert.strictEqual(passResult.score, 1);
  assert.strictEqual(passResult.evidence_ids.length, 1);
  assert.strictEqual(passResult.evidence_ids[0], "EVID:graphrag-mini:003:step:1:doc-1");
});
