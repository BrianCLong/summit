import test from "node:test";
import assert from "node:assert";
import { allowedActions } from "../../packages/world-model/src/affordances.js";
import { EntitySnapshot } from "../../packages/world-model/src/types.js";

test("allowedActions returns correct actions based on state", (t) => {
  const openSnapshot: EntitySnapshot = {
    entity_id: "pr:1",
    type: "pull_request",
    current_state: "open"
  };

  const actions = allowedActions(openSnapshot);
  assert.ok(actions.includes("start_work"));
  assert.ok(actions.includes("assign_owner"));
  assert.strictEqual(actions.includes("close"), false);

  const blockedSnapshot: EntitySnapshot = {
    entity_id: "pr:2",
    type: "pull_request",
    current_state: "blocked"
  };

  const blockedActions = allowedActions(blockedSnapshot);
  assert.ok(blockedActions.includes("request_review"));
  assert.ok(blockedActions.includes("resolve_blocker"));
});
