import { describe, expect, it } from "vitest";
import { buildSupportPlan, Ticket } from "../src/support";
import { Alert } from "../src/types";

describe("buildSupportPlan", () => {
  it("tags churn-risk tickets and adds deflection and escalation playbooks", () => {
    const tickets: Ticket[] = [
      {
        id: "t1",
        type: "login-error",
        severity: "p1",
        churnRisk: true,
        revenueImpact: "high",
        repeating: false,
      },
    ];
    const alerts: Alert[] = [
      {
        kind: "error-spike",
        severity: "critical",
        message: "Spike",
        recommendedPlaybook: "Activate incident comms",
        occurredAt: new Date(),
      },
    ];
    const plan = buildSupportPlan(tickets, alerts);
    expect(plan.taggedTickets[0].type).toContain("churn-risk");
    expect(plan.deflection.length).toBeGreaterThan(0);
    expect(plan.escalations[0].requiresApproval).toBe(true);
    expect(plan.copilot.artifacts).toContain("bug-mapping");
  });
});
