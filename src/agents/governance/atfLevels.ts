import { AtfLevel, PromotionCriteria } from "./types";

export const ATF_DEFAULT_LEVEL: AtfLevel = "intern";

export const ATF_LEVELS: AtfLevel[] = ["intern", "junior", "senior", "principal"];

export function getLevelRank(level: AtfLevel): number {
  return ATF_LEVELS.indexOf(level);
}

export function canExecuteActions(level: AtfLevel): boolean {
  // Interns cannot execute actions autonomously.
  // Juniors and above can, but subject to policy.
  return level !== "intern";
}

export function requiresHumanApproval(level: AtfLevel): boolean {
  // Interns and Juniors require approval for most actions.
  // Seniors require approval for high-risk actions (handled by policy).
  // This is a baseline check.
  return level === "intern" || level === "junior";
}

export const PROMOTION_CRITERIA: Record<AtfLevel, PromotionCriteria | null> = {
  intern: {
    minSuccessRate: 0.8,
    minTasksCompleted: 10,
    minTimeAtLevelDays: 7,
  },
  junior: {
    minSuccessRate: 0.9,
    minTasksCompleted: 50,
    minTimeAtLevelDays: 30,
    recommendationAcceptanceRate: 0.95, // ATF-03 example
  },
  senior: {
    minSuccessRate: 0.95,
    minTasksCompleted: 200,
    minTimeAtLevelDays: 90,
  },
  principal: null, // Top level
};

export function checkPromotionEligibility(
  currentLevel: AtfLevel,
  stats: {
    successRate: number;
    tasksCompleted: number;
    daysAtLevel: number;
    recommendationAcceptanceRate?: number;
  }
): boolean {
  const criteria = PROMOTION_CRITERIA[currentLevel];
  if (!criteria) return false;

  if (stats.successRate < criteria.minSuccessRate) return false;
  if (stats.tasksCompleted < criteria.minTasksCompleted) return false;
  if (stats.daysAtLevel < criteria.minTimeAtLevelDays) return false;

  if (
    criteria.recommendationAcceptanceRate !== undefined &&
    (stats.recommendationAcceptanceRate === undefined ||
      stats.recommendationAcceptanceRate < criteria.recommendationAcceptanceRate)
  ) {
    return false;
  }

  return true;
}
