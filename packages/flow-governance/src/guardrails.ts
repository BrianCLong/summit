import {
  Alert,
  DecisionRecord,
  GuardrailResult,
  PullRequest,
  PreviewEnvironment,
  ToilBudgetConfig,
  ToilItem,
  WipLimitEnforcement,
  WorkItem,
} from "./types.js";

const DEFAULT_PR_LINE_LIMIT = 800;
const DEFAULT_PR_FILE_LIMIT = 40;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function enforceReadyChecklist(item: WorkItem): GuardrailResult {
  const missing: string[] = [];
  if (!item.ready.specProvided) missing.push("spec");
  if (!item.ready.metricsDefined) missing.push("metrics");
  if (!item.ready.rollbackPlan) missing.push("rollback");
  if (!item.ready.ownerAssigned) missing.push("owner");

  if (missing.length === 0) {
    return { ok: true, severity: "info", message: "Ready checklist satisfied" };
  }

  return {
    ok: false,
    severity: "block",
    message: `Ready checklist incomplete: ${missing.join(", ")}`,
  };
}

export function enforceSliceSize(item: WorkItem): GuardrailResult {
  if (!item.estimateDays) {
    return { ok: false, severity: "block", message: "Estimate missing for slice" };
  }

  if (item.estimateDays <= 5) {
    return { ok: true, severity: "info", message: "Slice within 5-day limit" };
  }

  if (item.riskAccepted) {
    return { ok: true, severity: "warning", message: "Override accepted for >5-day slice" };
  }

  return { ok: false, severity: "block", message: "Slice exceeds 5-day limit without override" };
}

export function enforceWipLimits(
  workItems: WorkItem[],
  limits: Record<string, number>
): WipLimitEnforcement[] {
  const grouped: Record<string, WorkItem[]> = {};
  for (const item of workItems) {
    grouped[item.team] = grouped[item.team] ?? [];
    grouped[item.team].push(item);
  }

  return Object.entries(grouped).map(([team, items]) => {
    const limit = limits[team] ?? limits.default ?? 5;
    const currentWip = items.filter((item) => item.status !== "done").length;
    const allowedToStart = currentWip < limit;

    return {
      team,
      limit,
      currentWip,
      allowedToStart,
      reason: allowedToStart ? undefined : "WIP limit reached — stop starting, start finishing",
    };
  });
}

export function enforcePrGuardrails(
  pr: PullRequest,
  lineLimit = DEFAULT_PR_LINE_LIMIT,
  fileLimit = DEFAULT_PR_FILE_LIMIT
): GuardrailResult {
  if (pr.linesChanged <= lineLimit && pr.filesChanged <= fileLimit) {
    return { ok: true, severity: "info", message: "PR within guardrails" };
  }

  if (pr.riskAccepted) {
    return {
      ok: true,
      severity: "warning",
      message: "PR exceeds guardrails but risk acceptance present; route to structured review",
    };
  }

  return {
    ok: false,
    severity: "block",
    message: `PR exceeds guardrails (lines: ${pr.linesChanged}/${lineLimit}, files: ${pr.filesChanged}/${fileLimit})`,
  };
}

export function enforceToilBudget(
  toilItems: ToilItem[],
  budget: ToilBudgetConfig
): Array<{ owner: string; hours: number; budget: number; breached: boolean }> {
  const ownerHours: Record<string, number> = {};
  for (const item of toilItems) {
    ownerHours[item.owner] = (ownerHours[item.owner] ?? 0) + item.hoursPerWeek;
  }

  return Object.entries(ownerHours).map(([owner, hours]) => {
    const budgetHours = (budget.weeklyHoursPerEngineer * budget.budgetPercentage) / 100;
    return {
      owner,
      hours,
      budget: budgetHours,
      breached: hours > budgetHours,
    };
  });
}

export function identifyToilAutomationBacklog(toilItems: ToilItem[]): ToilItem[] {
  return [...toilItems]
    .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
    .slice(0, 30)
    .filter(
      (item) => !item.automated || !item.auditLogging || !item.rollbackPlan || !item.dryRunSupported
    );
}

export function deduplicateAlerts(alerts: Alert[]): Alert[] {
  const seen = new Map<string, Alert>();
  for (const alert of alerts) {
    const existing = seen.get(alert.dedupKey);
    if (!existing || alert.severity === "critical" || alert.noiseScore < existing.noiseScore) {
      seen.set(alert.dedupKey, alert);
    }
  }
  return Array.from(seen.values());
}

export function autoCloseNoisyAlerts(alerts: Alert[], noiseThreshold = 0.8): Alert[] {
  return alerts.filter(
    (alert) => !(alert.severity === "info" && alert.noiseScore >= noiseThreshold)
  );
}

export function enforceDecisionEscalation(
  decisions: DecisionRecord[],
  now = new Date(),
  escalationWindowHours = 48
): Array<{ id: string; nextEscalation: string }> {
  const actions: Array<{ id: string; nextEscalation: string }> = [];
  for (const decision of decisions) {
    if (decision.resolvedAt) continue;
    const elapsedHours = (now.getTime() - decision.createdAt.getTime()) / (1000 * 60 * 60);
    if (elapsedHours < escalationWindowHours) continue;

    const ladder = decision.escalationLevels ?? ["owner", "director", "executive"];
    const nextEscalation =
      ladder[Math.min(ladder.length - 1, Math.floor(elapsedHours / escalationWindowHours) - 1)];
    actions.push({ id: decision.id, nextEscalation });
  }
  return actions;
}

export function enforcePreviewTtl(
  environments: PreviewEnvironment[],
  now = new Date()
): Array<{ id: string; expired: boolean; owner: string }> {
  return environments.map((env) => {
    const expiration = env.createdAt.getTime() + env.ttlHours * 60 * 60 * 1000;
    const expired =
      expiration < now.getTime() || env.lastActiveAt.getTime() + DAY_IN_MS < now.getTime();
    return { id: env.id, expired, owner: env.owner };
  });
}
