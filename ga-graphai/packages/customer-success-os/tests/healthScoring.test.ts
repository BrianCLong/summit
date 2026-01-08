import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "../src/healthScoring";
import { HealthInput } from "../src/types";

const baseline: HealthInput = {
  tenantId: "tenant-1",
  adoption: { depthScore: 8, widthScore: 7, stickiness: 80 },
  reliability: { errorRate: 1, mttrMinutes: 30, slaBreaches: 0 },
  support: { openTickets: 1, churnRiskTagged: 0, sentiment: 40, sponsorStrength: 80 },
  billing: { unpaidInvoices: 0, invoiceAgingDays: 0, overageRisk: false },
  lastUpdated: new Date("2025-01-01T00:00:00Z"),
};

describe("calculateHealthScore", () => {
  it("computes weighted score and components", () => {
    const result = calculateHealthScore(baseline);
    expect(result.score).toBeGreaterThan(70);
    expect(result.components).toHaveLength(7);
    expect(result.components.find((c) => c.component === "adoption")?.score).toBeGreaterThan(0);
  });

  it("emits alerts when adoption drops and errors spike", () => {
    const current: HealthInput = {
      ...baseline,
      adoption: { depthScore: 3, widthScore: 3, stickiness: 40 },
      reliability: { errorRate: 12, mttrMinutes: 200, slaBreaches: 1 },
      billing: { unpaidInvoices: 1, invoiceAgingDays: 45, overageRisk: true },
      support: { openTickets: 4, churnRiskTagged: 2, sentiment: -10, sponsorStrength: 30 },
      lastUpdated: new Date("2025-01-08T00:00:00Z"),
    };
    const result = calculateHealthScore(current, baseline);
    const kinds = result.alerts.map((a) => a.kind);
    expect(kinds).toContain("adoption-drop");
    expect(kinds).toContain("error-spike");
    expect(kinds).toContain("sla-risk");
    expect(kinds).toContain("unpaid-invoice");
    expect(kinds).toContain("sponsor-disengaged");
  });
});
