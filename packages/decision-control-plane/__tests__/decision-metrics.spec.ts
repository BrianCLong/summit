import test from "node:test";
import assert from "node:assert";
import { recordDecisionAdmission } from "../src/observability/metrics.js";
import { emitDecisionEvent } from "../src/observability/events.js";

test("recordDecisionAdmission returns mock data", () => {
  const result = recordDecisionAdmission({
    profile: "default",
    outcome: "allow",
    durationMs: 15,
  });

  assert.strictEqual(result.profile, "default");
  assert.strictEqual(result.outcome, "allow");
  assert.strictEqual(result.durationMs, 15);
});

test("emitDecisionEvent returns mock event", () => {
  const result = emitDecisionEvent("DEC-1", "Admitted", { score: 80 });

  assert.strictEqual(result.decisionId, "DEC-1");
  assert.strictEqual(result.eventType, "Admitted");
  assert.strictEqual(result.payload.score, 80);
});
