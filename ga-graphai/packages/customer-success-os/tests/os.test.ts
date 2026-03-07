import { describe, expect, it } from "vitest";
import { operate } from "../src/os";
import { Ticket } from "../src/support";

const tickets: Ticket[] = [
  {
    id: "t1",
    type: "ingestion-error",
    severity: "p1",
    churnRisk: true,
    revenueImpact: "high",
    repeating: true,
  },
];

describe("operate", () => {
  it("orchestrates health, playbooks, governance, and advocacy", () => {
    const result = operate({
      profile: {
        id: "tenant-3",
        name: "Cyberdyne",
        segment: "enterprise",
        icp: "defense",
        targetUseCases: ["threat-detection"],
        tier: "premium",
      },
      health: {
        tenantId: "tenant-3",
        adoption: { depthScore: 9, widthScore: 8, stickiness: 85 },
        reliability: { errorRate: 2, mttrMinutes: 20, slaBreaches: 0 },
        support: { openTickets: 1, churnRiskTagged: 0, sentiment: 80, sponsorStrength: 90 },
        billing: { unpaidInvoices: 0, invoiceAgingDays: 0, overageRisk: true },
        lastUpdated: new Date(),
      },
      previousHealth: undefined,
      behaviorSignals: {
        dormantFeatures: ["graph-ops"],
        highValuePatterns: ["automations"],
        unusedForDays: 8,
        stalledOnboardingHours: 0,
      },
      trainingSignals: { championPresent: true, adminsTrained: true, operatorsTrained: false },
      progressMetrics: {
        ssoLive: true,
        integrations: 2,
        datasetsIngested: 1,
        recipesCompleted: 2,
        activeUsers: 20,
        errorsBelowBudget: true,
        dashboardsShipped: 2,
        championTrained: true,
        hypercareResponseMinutes: 25,
        businessReviewScheduled: true,
        backlogOfUseCases: 4,
      },
      tickets,
      expansionSignals: {
        seatsUsed: 80,
        seatLimit: 100,
        advancedFeaturesUsed: ["graph-ops"],
        newTeamsInvited: 2,
        invoicesOverLimit: false,
      },
      governance: {
        dataResidency: "us",
        approvedRegions: ["us", "eu"],
        integrationAllowlists: ["snowflake", "okta"],
        requestedIntegration: "snowflake",
      },
      renewalDate: new Date("2025-12-31"),
      timeline: [
        {
          id: "e1",
          tenantId: "tenant-3",
          kind: "recipe.completed",
          timestamp: new Date(),
          metadata: {},
          severity: "info",
        },
      ],
    });

    expect(result.health.score).toBeGreaterThan(70);
    expect(result.checklists).toHaveLength(3);
    expect(result.actions.length).toBeGreaterThan(5);
    expect(result.expansionTriggers.length).toBeGreaterThan(0);
    expect(result.advocacy.length).toBeGreaterThan(0);
    expect(result.trust.find((c) => c.control === "audit-log")?.enforced).toBe(true);
    expect(result.predictiveInsights.riskScore).toBeLessThan(100);
    expect(result.frictionLog.length).toBeGreaterThan(0);
    expect(result.executiveUpdate.highlights.length).toBeGreaterThan(0);
    expect(result.timelineInsight.recipesCompleted).toBeGreaterThanOrEqual(1);
  });
});
