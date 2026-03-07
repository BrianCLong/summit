import { describe, expect, it } from "vitest";
import { abacDecision } from "../abac";
import { approvalsData, demoUser } from "../mockData";

describe("abacDecision", () => {
  const base = approvalsData[0];

  it("allows compliant approval", () => {
    const result = abacDecision(demoUser, base, "approve");
    expect(result.allowed).toBe(true);
  });

  it("denies when tenant mismatch", () => {
    const user = { ...demoUser, tenants: ["other"] };
    const result = abacDecision(user, base, "approve");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/tenant/i);
  });

  it("requires region match", () => {
    const user = { ...demoUser, region: "eu" as const };
    const result = abacDecision(user, base, "approve");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/region/i);
  });

  it("requires clearance for restricted sensitivity", () => {
    const user = { ...demoUser, clearance: "l2" as const };
    const result = abacDecision(user, base, "approve");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/restricted/i);
  });

  it("enforces dual control when compliance officer has not approved", () => {
    const user = { ...demoUser, role: "auditor" as const };
    const result = abacDecision(user, base, "approve");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/compliance officer/i);
  });

  it("allows second approval once compliance officer approval exists", () => {
    const user = { ...demoUser, role: "auditor" as const };
    const result = abacDecision(
      user,
      {
        ...base,
        approvals: [
          ...base.approvals,
          {
            id: "act-x",
            actor: "user-9",
            role: "compliance_officer",
            decision: "approved",
            rationale: "Dual control satisfied",
            timestamp: new Date().toISOString(),
            correlationId: base.correlationId,
          },
        ],
      },
      "approve"
    );
    expect(result.allowed).toBe(true);
  });
});
