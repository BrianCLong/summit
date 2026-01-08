import {
  buildWeeklyThroughputReport,
  computeFlowMetrics,
  deduplicateAlerts,
  enforceDecisionEscalation,
  enforcePrGuardrails,
  enforcePreviewTtl,
  enforceReadyChecklist,
  enforceSliceSize,
  enforceToilBudget,
  enforceWipLimits,
  identifyToilAutomationBacklog,
  sanitizeAlerts,
  summarizeCost,
} from "../src/index.js";
import { Alert, PullRequest, ToilItem, WorkItem } from "../src/types.js";

describe("flow governance guardrails", () => {
  const baseReady = {
    specProvided: true,
    metricsDefined: true,
    rollbackPlan: true,
    ownerAssigned: true,
  };

  it("computes flow metrics with blocked and rework data", () => {
    const now = new Date("2024-01-10T00:00:00Z");
    const workItems: WorkItem[] = [
      {
        id: "1",
        team: "alpha",
        status: "done",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        startedAt: new Date("2024-01-02T00:00:00Z"),
        completedAt: new Date("2024-01-04T00:00:00Z"),
        blockedWindows: [
          { start: new Date("2024-01-02T12:00:00Z"), end: new Date("2024-01-02T18:00:00Z") },
        ],
        reworkCount: 1,
        estimateDays: 3,
        ready: baseReady,
      },
      {
        id: "2",
        team: "alpha",
        status: "in_progress",
        createdAt: new Date("2024-01-05T00:00:00Z"),
        startedAt: new Date("2024-01-06T00:00:00Z"),
        blockedWindows: [
          { start: new Date("2024-01-07T00:00:00Z"), end: new Date("2024-01-07T06:00:00Z") },
        ],
        ready: baseReady,
      },
    ];

    const metrics = computeFlowMetrics(workItems, now);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].wipCount).toBe(1);
    expect(metrics[0].leadTimeDays).toBeCloseTo(3);
    expect(metrics[0].blockedTimeHours).toBeCloseTo(6);
    expect(metrics[0].reworkPercentage).toBeCloseTo(100);
  });

  it("enforces ready checklist and slice sizing", () => {
    const incomplete: WorkItem = {
      id: "3",
      team: "beta",
      status: "ready",
      createdAt: new Date(),
      ready: {
        specProvided: false,
        metricsDefined: true,
        rollbackPlan: false,
        ownerAssigned: true,
      },
      estimateDays: 8,
    };

    expect(enforceReadyChecklist(incomplete).ok).toBe(false);
    const sliced = enforceSliceSize(incomplete);
    expect(sliced.ok).toBe(false);
    expect(sliced.severity).toBe("block");
  });

  it("enforces WIP limits and PR guardrails with overrides", () => {
    const workItems: WorkItem[] = [
      { id: "4", team: "alpha", status: "in_progress", createdAt: new Date(), ready: baseReady },
      { id: "5", team: "alpha", status: "review", createdAt: new Date(), ready: baseReady },
    ];

    const wip = enforceWipLimits(workItems, { alpha: 1 });
    expect(wip[0].allowedToStart).toBe(false);

    const pr: PullRequest = {
      id: "pr1",
      team: "alpha",
      author: "dev",
      filesChanged: 50,
      linesChanged: 1200,
      createdAt: new Date(),
      riskAccepted: true,
    };
    const guardrail = enforcePrGuardrails(pr);
    expect(guardrail.ok).toBe(true);
    expect(guardrail.severity).toBe("warning");
  });

  it("drives decision escalations after 48 hours", () => {
    const now = new Date("2024-02-03T00:00:00Z");
    const decisions = [
      {
        id: "d1",
        owner: "lead",
        createdAt: new Date("2024-02-01T00:00:00Z"),
        summary: "Cross-team dependency",
      },
    ];

    const escalations = enforceDecisionEscalation(decisions, now);
    expect(escalations).toEqual([{ id: "d1", nextEscalation: "owner" }]);
  });

  it("tracks toil budgets and automation backlog", () => {
    const toilItems: ToilItem[] = [
      {
        id: "t1",
        owner: "engineer-1",
        hoursPerWeek: 20,
        automated: false,
        hasRunbook: true,
        dryRunSupported: false,
        rollbackPlan: false,
        auditLogging: false,
      },
      {
        id: "t2",
        owner: "engineer-1",
        hoursPerWeek: 5,
        automated: true,
        hasRunbook: true,
        dryRunSupported: true,
        rollbackPlan: true,
        auditLogging: true,
      },
    ];

    const budget = enforceToilBudget(toilItems, {
      weeklyHoursPerEngineer: 40,
      budgetPercentage: 25,
    });
    expect(budget[0].breached).toBe(true);

    const backlog = identifyToilAutomationBacklog(toilItems);
    expect(backlog).toHaveLength(1);
    expect(backlog[0].id).toBe("t1");
  });

  it("deduplicates and sanitizes alerts", () => {
    const alerts: Alert[] = [
      {
        id: "a1",
        dedupKey: "svc1",
        service: "svc1",
        severity: "info",
        noiseScore: 0.9,
        createdAt: new Date(),
      },
      {
        id: "a2",
        dedupKey: "svc1",
        service: "svc1",
        severity: "critical",
        noiseScore: 0.2,
        createdAt: new Date(),
      },
      {
        id: "a3",
        dedupKey: "svc2",
        service: "svc2",
        severity: "info",
        noiseScore: 0.95,
        createdAt: new Date(),
      },
    ];

    const deduped = deduplicateAlerts(alerts);
    expect(deduped).toHaveLength(2);

    const sanitized = sanitizeAlerts(alerts, 0.8);
    expect(sanitized.every((alert) => alert.severity !== "info" || alert.noiseScore < 0.8)).toBe(
      true
    );
  });

  it("expires preview environments respecting TTL and activity", () => {
    const now = new Date("2024-01-10T00:00:00Z");
    const previews = [
      {
        id: "env1",
        owner: "dev1",
        createdAt: new Date("2024-01-05T00:00:00Z"),
        ttlHours: 24,
        lastActiveAt: new Date("2024-01-05T10:00:00Z"),
      },
      {
        id: "env2",
        owner: "dev2",
        createdAt: new Date("2024-01-09T00:00:00Z"),
        ttlHours: 72,
        lastActiveAt: new Date("2024-01-09T23:00:00Z"),
      },
    ];

    const enforcement = enforcePreviewTtl(previews, now);
    expect(enforcement.find((env) => env.id === "env1")?.expired).toBe(true);
    expect(enforcement.find((env) => env.id === "env2")?.expired).toBe(false);
  });

  it("summarizes cost and weekly throughput", () => {
    const cost = summarizeCost([
      { service: "svc", tenant: "tenant-a", amount: 10, timestamp: new Date() },
      { service: "svc", tenant: "tenant-b", amount: 5, timestamp: new Date() },
    ]);
    expect(cost.total).toBe(15);
    expect(cost.byService.svc).toBe(15);

    const flow = [
      {
        team: "alpha",
        leadTimeDays: 2,
        cycleTimeDays: 2,
        wipCount: 3,
        blockedTimeHours: 1,
        reworkPercentage: 0,
      },
    ];
    const weekly = buildWeeklyThroughputReport(
      flow,
      [{ reason: "blocked-by-review" }],
      ["added reviewer rotation"]
    );
    expect(weekly.blockedReasons["blocked-by-review"]).toBe(1);
  });
});
