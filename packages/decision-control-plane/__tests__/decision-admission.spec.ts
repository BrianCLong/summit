import test from "node:test";
import assert from "node:assert";
import { evaluateAdmission } from "../src/admission/evaluateAdmission.js";
import { DecisionResource } from "../src/crd/Decision.js";

test("evaluateAdmission denies missing evidence", async () => {
  const resource: DecisionResource = {
    apiVersion: "summit.io/v1alpha1",
    kind: "Decision",
    metadata: { name: "test" },
    spec: {
      decisionId: "DEC-1",
      intent: "Test missing evidence",
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

  const result = await evaluateAdmission(resource);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.conditions[0].reason.includes("missing_evidence_ids"), true);
});

test("evaluateAdmission denies high risk without human approval", async () => {
  const resource: DecisionResource = {
    apiVersion: "summit.io/v1alpha1",
    kind: "Decision",
    metadata: { name: "test" },
    spec: {
      decisionId: "DEC-1",
      intent: "Test high risk",
      evidenceIds: ["EVID:1"],
      riskTier: "high",
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

  const result = await evaluateAdmission(resource, { human: false });
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.conditions[0].reason.includes("high_risk_requires_human_approval"), true);
});

test("evaluateAdmission allows valid low risk", async () => {
  const resource: DecisionResource = {
    apiVersion: "summit.io/v1alpha1",
    kind: "Decision",
    metadata: { name: "test" },
    spec: {
      decisionId: "DEC-1",
      intent: "Test valid",
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

  const result = await evaluateAdmission(resource);
  assert.strictEqual(result.allowed, true);
});
