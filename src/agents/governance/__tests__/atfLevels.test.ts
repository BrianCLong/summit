import { describe, test, expect } from "vitest";
import {
  ATF_DEFAULT_LEVEL,
  ATF_LEVELS,
  canExecuteActions,
  requiresHumanApproval,
  checkPromotionEligibility,
  PROMOTION_CRITERIA,
} from "../atfLevels";
import { createIdentity, createManifest } from "../identity";

describe("ATF Governance - Levels", () => {
  test("default level should be intern", () => {
    expect(ATF_DEFAULT_LEVEL).toBe("intern");
  });

  test("ATF levels list should be correct", () => {
    expect(ATF_LEVELS).toEqual(["intern", "junior", "senior", "principal"]);
  });

  test("Intern cannot execute actions", () => {
    expect(canExecuteActions("intern")).toBe(false);
  });

  test("Junior and above can execute actions", () => {
    expect(canExecuteActions("junior")).toBe(true);
    expect(canExecuteActions("senior")).toBe(true);
    expect(canExecuteActions("principal")).toBe(true);
  });

  test("Intern and Junior require human approval", () => {
    expect(requiresHumanApproval("intern")).toBe(true);
    expect(requiresHumanApproval("junior")).toBe(true);
  });

  test("Senior and Principal do not strictly require approval by default logic", () => {
    expect(requiresHumanApproval("senior")).toBe(false);
    expect(requiresHumanApproval("principal")).toBe(false);
  });
});

describe("ATF Governance - Promotion", () => {
  test("Intern not eligible if stats low", () => {
    const eligible = checkPromotionEligibility("intern", {
      successRate: 0.5,
      tasksCompleted: 5,
      daysAtLevel: 1,
    });
    expect(eligible).toBe(false);
  });

  test("Intern eligible if stats meet criteria", () => {
    const criteria = PROMOTION_CRITERIA.intern!;
    const eligible = checkPromotionEligibility("intern", {
      successRate: criteria.minSuccessRate + 0.01,
      tasksCompleted: criteria.minTasksCompleted + 1,
      daysAtLevel: criteria.minTimeAtLevelDays + 1,
    });
    expect(eligible).toBe(true);
  });

  test("Junior requires recommendation acceptance rate", () => {
    const criteria = PROMOTION_CRITERIA.junior!;
    const eligible = checkPromotionEligibility("junior", {
      successRate: criteria.minSuccessRate + 0.01,
      tasksCompleted: criteria.minTasksCompleted + 1,
      daysAtLevel: criteria.minTimeAtLevelDays + 1,
      recommendationAcceptanceRate: 0.5, // Too low
    });
    expect(eligible).toBe(false);
  });

  test("Junior eligible with good acceptance rate", () => {
    const criteria = PROMOTION_CRITERIA.junior!;
    const eligible = checkPromotionEligibility("junior", {
      successRate: criteria.minSuccessRate + 0.01,
      tasksCompleted: criteria.minTasksCompleted + 1,
      daysAtLevel: criteria.minTimeAtLevelDays + 1,
      recommendationAcceptanceRate: 0.99,
    });
    expect(eligible).toBe(true);
  });
});

describe("ATF Governance - Identity Manifest", () => {
  test("creates identity with default level", () => {
    const identity = createIdentity();
    expect(identity.level).toBe("intern");
    expect(identity.id).toContain("agent-");
  });

  test("creates manifest with correct capabilities for intern", () => {
    const identity = createIdentity("intern");
    const manifest = createManifest(identity);
    expect(manifest.capabilities.canExecuteActions).toBe(false);
    expect(manifest.capabilities.requiresApproval).toBe(true);
  });

  test("creates manifest with correct capabilities for senior", () => {
    const identity = createIdentity("senior");
    const manifest = createManifest(identity);
    expect(manifest.capabilities.canExecuteActions).toBe(true);
    expect(manifest.capabilities.requiresApproval).toBe(false);
  });
});
