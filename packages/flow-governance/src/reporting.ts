import {
  Alert,
  CostEntry,
  CostReport,
  FlowMetrics,
  GuardrailResult,
  PullRequest,
  ToilItem,
} from "./types.js";
import {
  autoCloseNoisyAlerts,
  deduplicateAlerts,
  enforcePrGuardrails,
  enforceToilBudget,
} from "./guardrails.js";

export interface WeeklyThroughputReport {
  shippedCount: number;
  blockedCount: number;
  blockedReasons: Record<string, number>;
  mitigations: string[];
  flow: FlowMetrics[];
}

export interface ToilReportEntry {
  item: ToilItem;
  needsAutomation: boolean;
}

export interface ToilReport {
  census: ToilReportEntry[];
  budgetBreaches: Array<{ owner: string; hours: number; budget: number }>;
}

export function buildWeeklyThroughputReport(
  completedItems: FlowMetrics[],
  blockedItems: Array<{ reason: string }>,
  mitigations: string[]
): WeeklyThroughputReport {
  const blockedReasons: Record<string, number> = {};
  for (const blocked of blockedItems) {
    blockedReasons[blocked.reason] = (blockedReasons[blocked.reason] ?? 0) + 1;
  }

  return {
    shippedCount: completedItems.reduce((acc, metric) => acc + metric.wipCount, 0),
    blockedCount: blockedItems.length,
    blockedReasons,
    mitigations,
    flow: completedItems,
  };
}

export function buildToilReport(
  toilItems: ToilItem[],
  budgetConfig: { weeklyHoursPerEngineer: number; budgetPercentage: number }
): ToilReport {
  const census = toilItems.map((item) => ({
    item,
    needsAutomation:
      !item.automated || !item.auditLogging || !item.rollbackPlan || !item.dryRunSupported,
  }));

  const budgetBreaches = enforceToilBudget(toilItems, budgetConfig)
    .filter((breach) => breach.breached)
    .map((breach) => ({ owner: breach.owner, hours: breach.hours, budget: breach.budget }));

  return { census, budgetBreaches };
}

export function evaluatePrs(
  prs: PullRequest[],
  lineLimit?: number,
  fileLimit?: number
): GuardrailResult[] {
  return prs.map((pr) => enforcePrGuardrails(pr, lineLimit, fileLimit));
}

export function summarizeCost(entries: CostEntry[]): CostReport {
  const byService: Record<string, number> = {};
  const byTenant: Record<string, number> = {};
  let total = 0;

  for (const entry of entries) {
    byService[entry.service] = (byService[entry.service] ?? 0) + entry.amount;
    byTenant[entry.tenant] = (byTenant[entry.tenant] ?? 0) + entry.amount;
    total += entry.amount;
  }

  return { byService, byTenant, total };
}

export function sanitizeAlerts(alerts: Alert[], noiseThreshold?: number) {
  const afterDedup = deduplicateAlerts(alerts);
  return autoCloseNoisyAlerts(afterDedup, noiseThreshold);
}
