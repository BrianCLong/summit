import test from "node:test";
import assert from "node:assert";
import { DecisionResource } from "../src/crd/Decision.js";

test("Decision resource type definition is accessible", () => {
  const mockDecision: DecisionResource = {
    apiVersion: "summit.io/v1alpha1",
    kind: "Decision",
    metadata: { name: "test-decision" },
    spec: {
      decisionId: "DEC-1",
      intent: "Test",
      evidenceIds: [],
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

  assert.strictEqual(mockDecision.kind, "Decision");
  assert.strictEqual(mockDecision.spec.riskTier, "low");
});
