import { test } from "node:test";
import * as assert from "node:assert";
import {
  InternalRiskData,
  InternalGovernanceData,
  InternalAutomationData,
  redactRiskData,
  redactGovernanceData,
  redactAutomationData
} from "../../src/trust/summary_model.js";

test("redactRiskData should aggregate data and remove PII", () => {
  const mockRiskData: InternalRiskData[] = [
    { personaId: "user123", accountHandle: "@user123", campaignId: "campA", riskLevel: "HIGH", narrativeType: "disinformation", incidents: [{ id: "inc1", timestamp: "2024-01-01", details: "foo" }] },
    { personaId: "user456", accountHandle: "@user456", campaignId: "campB", riskLevel: "LOW", narrativeType: "spam", incidents: [] },
    { personaId: "user789", accountHandle: "@user789", campaignId: "campC", riskLevel: "HIGH", narrativeType: "disinformation", incidents: [] }
  ];

  const summary = redactRiskData(mockRiskData);

  assert.deepStrictEqual(summary.riskDistribution, { LOW: 1, MEDIUM: 0, HIGH: 2 });
  assert.strictEqual(summary.highRiskAlertsHandled, 1);
  assert.deepStrictEqual(summary.topNarrativeRisks, ["disinformation", "spam"]);

  // Ensure no raw identifiers remain
  assert.strictEqual(JSON.stringify(summary).includes("user123"), false);
  assert.strictEqual(JSON.stringify(summary).includes("campA"), false);
});

test("redactGovernanceData should aggregate governance data and remove PII/code details", () => {
  const mockGovData: InternalGovernanceData[] = [
    { decisionId: "d1", tier: "Tier 1", approvalTimeMs: 1000, category: "ontology", codeDetails: "function A() {}", reviewerId: "rev1" },
    { decisionId: "d2", tier: "Tier 3", approvalTimeMs: 5000, category: "exports", codeDetails: "function B() {}", reviewerId: "rev2" },
    { decisionId: "d3", tier: "Tier 2", approvalTimeMs: 3000, category: "exports", codeDetails: "function C() {}", reviewerId: "rev3" }
  ];

  const summary = redactGovernanceData(mockGovData);

  assert.strictEqual(summary.tier2And3Decisions, 2);
  assert.strictEqual(summary.averageApprovalTimeMs, 3000);
  assert.deepStrictEqual(summary.majorCategories.sort(), ["exports", "ontology"].sort());

  // Ensure no code details or reviewer IDs remain
  assert.strictEqual(JSON.stringify(summary).includes("function A()"), false);
  assert.strictEqual(JSON.stringify(summary).includes("rev1"), false);
});

test("redactAutomationData should aggregate automation data and remove subject IDs", () => {
  const mockAutoData: InternalAutomationData[] = [
    { executionId: "exec1", subjectId: "sub1", actionClass: "watchlist", requiredCouncilApproval: true, timestamp: "2024-01-01" },
    { executionId: "exec2", subjectId: "sub2", actionClass: "watchlist", requiredCouncilApproval: false, timestamp: "2024-01-02" },
    { executionId: "exec3", subjectId: "sub3", actionClass: "report", requiredCouncilApproval: false, timestamp: "2024-01-03" }
  ];

  const summary = redactAutomationData(mockAutoData);

  assert.deepStrictEqual(summary.actionsByClass, { watchlist: 2, report: 1 });
  assert.strictEqual(summary.councilApprovalsRequired, 1);
  assert.strictEqual(summary.autoApprovals, 2);

  // Ensure no raw identifiers remain
  assert.strictEqual(JSON.stringify(summary).includes("exec1"), false);
  assert.strictEqual(JSON.stringify(summary).includes("sub1"), false);
});
