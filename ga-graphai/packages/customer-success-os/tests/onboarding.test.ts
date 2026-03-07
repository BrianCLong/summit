import { describe, expect, it } from "vitest";
import { buildOnboardingPlan } from "../src/onboarding";
import { TenantProfile } from "../src/types";

const profile: TenantProfile = {
  id: "tenant-2",
  name: "ACME",
  segment: "enterprise",
  icp: "regulated",
  targetUseCases: ["governance"],
  tier: "premium",
};

describe("buildOnboardingPlan", () => {
  it("builds day 7/14/30 outcomes and hypercare actions", () => {
    const metrics = {
      ssoLive: true,
      integrations: 2,
      datasetsIngested: 1,
      recipesCompleted: 2,
      activeUsers: 15,
      errorsBelowBudget: true,
      dashboardsShipped: 2,
      championTrained: true,
      hypercareResponseMinutes: 20,
      businessReviewScheduled: true,
      backlogOfUseCases: 3,
    };
    const { outcomes, hypercare } = buildOnboardingPlan(profile, metrics, new Date());
    expect(outcomes).toHaveLength(3);
    expect(outcomes.find((o) => o.stage === "day7")?.completed).toBe(true);
    expect(outcomes.find((o) => o.stage === "day30")?.completed).toBe(true);
    expect(hypercare.some((action) => action.slaMinutes === 30)).toBe(true);
    expect(hypercare.some((action) => action.id.includes("office-hours"))).toBe(true);
  });

  it("surfaces blockers when targets are missed", () => {
    const metrics = {
      ssoLive: false,
      integrations: 0,
      datasetsIngested: 0,
      recipesCompleted: 0,
      activeUsers: 1,
      errorsBelowBudget: false,
      dashboardsShipped: 0,
      championTrained: false,
      hypercareResponseMinutes: 120,
      businessReviewScheduled: false,
      backlogOfUseCases: 0,
    };
    const { outcomes } = buildOnboardingPlan(profile, metrics, new Date());
    const day7 = outcomes.find((o) => o.stage === "day7");
    expect(day7?.completed).toBe(false);
    expect(day7?.blockers).toContain("SSO live");
  });
});
