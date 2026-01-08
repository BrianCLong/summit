import { describe, expect, it } from "vitest";
import { enforceGovernance } from "../src/governance";

describe("enforceGovernance", () => {
  it("enforces data residency and requests approvals for risky actions", () => {
    const { controls, approvals } = enforceGovernance({
      dataResidency: "eu",
      approvedRegions: ["us"],
      integrationAllowlists: ["snowflake"],
      requestedIntegration: "salesforce",
      riskyActionRequested: "bypass-retention",
    });

    const residencyControl = controls.find((c) => c.control === "data-residency");
    expect(residencyControl?.enforced).toBe(false);
    const integrationControl = controls.find((c) => c.control === "integration-governance");
    expect(integrationControl?.enforced).toBe(false);
    expect(approvals[0].requiresApproval).toBe(true);
  });
});
