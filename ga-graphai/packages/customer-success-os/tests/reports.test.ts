import { describe, expect, it } from "vitest";
import { buildExecutiveUpdate, buildFrictionLog } from "../src/reports";
import { Alert, HealthScore, PlaybookAction, Ticket, TimelineInsight } from "../src/types";

describe("reports", () => {
  const health: HealthScore = {
    tenantId: "t",
    score: 82,
    components: [],
    alerts: [],
    updatedAt: new Date("2025-01-06T10:00:00Z"),
  };
  const timeline: TimelineInsight = {
    deployments: 2,
    incidents: 1,
    configChanges: 1,
    recipesCompleted: 3,
    stalledOnboardingHours: 10,
    lastValueProof: "dashboard-export",
  };

  it("builds an executive update with highlights, risks, planned fixes, and artifacts", () => {
    const actions: PlaybookAction[] = [
      {
        id: "a1",
        category: "support",
        description: "Fix ingestion retries",
        artifacts: ["incident-log"],
      },
      { id: "a2", category: "governance", description: "Enable approvals for risky actions" },
    ];
    const alerts: Alert[] = [
      {
        kind: "error-spike",
        severity: "critical",
        message: "Error spike or slow recovery detected",
        recommendedPlaybook: "Activate incident comms",
        occurredAt: new Date(),
      },
    ];

    const update = buildExecutiveUpdate(health, timeline, actions, alerts);
    expect(update.highlights[0]).toContain("Health score");
    expect(update.risks.length).toBeGreaterThan(0);
    expect(update.plannedFixes.length).toBe(2);
    expect(update.artifacts).toContain("roi-dashboard");
  });

  it("creates a friction log from tickets and alerts", () => {
    const tickets: Ticket[] = [
      {
        id: "t1",
        type: "ingest-failure",
        severity: "p1",
        churnRisk: true,
        revenueImpact: "high",
        repeating: true,
      },
    ];
    const alerts: Alert[] = [
      {
        kind: "unpaid-invoice",
        severity: "medium",
        message: "Unpaid invoices detected; risk of suspension",
        recommendedPlaybook:
          "Coordinate with finance, set remediation deadline, communicate grace window",
        occurredAt: new Date(),
      },
    ];

    const friction = buildFrictionLog(tickets, alerts);
    expect(friction.length).toBe(2);
    expect(friction[0].owner).toBe("product");
    expect(friction[1].owner).toBe("finance");
  });
});
