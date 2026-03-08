import test from "node:test";
import assert from "node:assert";
import { isActionAllowed, evaluateMutation } from "../../packages/world-model/src/policyGuards.js";
import { EntitySnapshot } from "../../packages/world-model/src/types.js";

test("policyGuards should enforce deny-by-default", (t) => {
  const snapshot: EntitySnapshot = {
    entity_id: "pr:1",
    type: "pull_request",
    current_state: "open"
  };

  assert.strictEqual(isActionAllowed(snapshot, "close"), false);
  assert.strictEqual(isActionAllowed(snapshot, "start_work"), true);
});

test("evaluateMutation enforces role checks", (t) => {
  const snapshot: EntitySnapshot = {
    entity_id: "pr:1",
    type: "pull_request",
    current_state: "resolved"
  };

  assert.strictEqual(evaluateMutation(snapshot, "close", ["user"]), false);
  assert.strictEqual(evaluateMutation(snapshot, "close", ["admin"]), true);
});
