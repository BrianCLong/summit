import test from "node:test";
import assert from "node:assert";
import { reconcileDecision } from "../src/controllers/decisionController.js";
import { DecisionResource } from "../src/crd/Decision.js";

test("reconcileDecision sets allowed and phase correctly", async () => {
  const resource: DecisionResource = {
    apiVersion: "summit.io/v1alpha1",
    kind: "Decision",
    metadata: { name: "test" },
    spec: {
      decisionId: "DEC-1",
      intent: "Test reconcile",
      evidenceIds: ["EVID:1"],
      riskTier: "low",
      policyProfile: "default",
    },
    status: {
      phase: "Pending",
      allowed: false,
      trustScore: 0,
      riskScore: 0,
      conditions: [],
    },
  };

  const status = await reconcileDecision(resource);
  assert.strictEqual(status.allowed, true);
  assert.strictEqual(status.phase, "Admitted");
  assert.strictEqual(status.trustScore, 80);
});
