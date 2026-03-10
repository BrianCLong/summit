/**
 * PolicyDecisionPoint — unit tests.
 *
 * Positive fixture: all scopes clear → allow.
 * Negative fixtures: tool scope denied, dataset scope denied, restricted without approval.
 */

import { evaluatePolicy } from "../../../src/agents/controlplane/policy/PolicyDecisionPoint.js";
import type { PolicyInput } from "../../../src/agents/controlplane/policy/PolicyTypes.js";

function makeInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    agentId: "agent-001",
    capability: "text-summarise",
    requestedTools: ["web-search"],
    allowedTools: ["web-search"],
    requestedDatasets: ["ds-public"],
    allowedDatasets: ["ds-public"],
    dataClassification: "public",
    taskRisk: "low",
    humanApprovalGranted: false,
    requiresHumanApproval: false,
    ...overrides,
  };
}

describe("PolicyDecisionPoint — allow", () => {
  it("allows when all scopes are satisfied", () => {
    const result = evaluatePolicy(makeInput());
    expect(result.allow).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("allows wildcard tool scope", () => {
    const result = evaluatePolicy(makeInput({ allowedTools: ["*"] }));
    expect(result.allow).toBe(true);
  });

  it("allows wildcard dataset scope", () => {
    const result = evaluatePolicy(makeInput({ allowedDatasets: ["*"] }));
    expect(result.allow).toBe(true);
  });
});

describe("PolicyDecisionPoint — deny", () => {
  it("denies when agent requests an unauthorised tool", () => {
    const result = evaluatePolicy(
      makeInput({ requestedTools: ["rm-rf"], allowedTools: ["web-search"] })
    );
    expect(result.allow).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("TOOL_SCOPE_DENIED"))).toBe(true);
  });

  it("denies when agent requests an unauthorised dataset", () => {
    const result = evaluatePolicy(
      makeInput({ requestedDatasets: ["ds-restricted"], allowedDatasets: ["ds-public"] })
    );
    expect(result.allow).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("DATASET_SCOPE_DENIED"))).toBe(true);
  });

  it("denies restricted data access without human approval", () => {
    const result = evaluatePolicy(
      makeInput({
        dataClassification: "restricted",
        requiresHumanApproval: true,
        humanApprovalGranted: false,
      })
    );
    expect(result.allow).toBe(false);
    expect(result.reasons).toContain("RESTRICTED_REQUIRES_APPROVAL");
  });

  it("allows restricted data access when human approval has been granted", () => {
    const result = evaluatePolicy(
      makeInput({
        dataClassification: "restricted",
        requiresHumanApproval: true,
        humanApprovalGranted: true,
      })
    );
    expect(result.allow).toBe(true);
  });

  it("accumulates multiple denial reasons", () => {
    const result = evaluatePolicy(
      makeInput({
        requestedTools: ["rm-rf"],
        allowedTools: ["web-search"],
        requestedDatasets: ["ds-restricted"],
        allowedDatasets: ["ds-public"],
      })
    );
    expect(result.allow).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
