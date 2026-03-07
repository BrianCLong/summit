import {
  Alert,
  ExecutiveUpdate,
  FrictionLogEntry,
  HealthScore,
  PlaybookAction,
  Ticket,
  TimelineInsight,
} from "./types";

function mapSeverity(alert: Alert): "low" | "medium" | "high" {
  if (alert.severity === "critical") return "high";
  if (alert.severity === "high") return "high";
  if (alert.severity === "medium") return "medium";
  return "low";
}

export function buildFrictionLog(tickets: Ticket[], alerts: Alert[]): FrictionLogEntry[] {
  const entries: FrictionLogEntry[] = tickets.map((ticket) => ({
    issue: ticket.type,
    severity: ticket.severity === "p1" ? "high" : ticket.severity === "p2" ? "medium" : "low",
    owner: ticket.repeating ? "product" : "support",
    mitigation: ticket.repeating
      ? "Add to weekly top-10 fix queue and publish ship date"
      : "Close-the-loop response with macro and diagnostics",
    targetShipDate: ticket.repeating ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : new Date(),
  }));

  alerts
    .filter((alert) =>
      ["adoption-drop", "error-spike", "sla-risk", "unpaid-invoice", "stalled-onboarding"].includes(
        alert.kind
      )
    )
    .forEach((alert) => {
      entries.push({
        issue: alert.message,
        severity: mapSeverity(alert),
        owner: alert.kind === "unpaid-invoice" ? "finance" : "product",
        mitigation: alert.recommendedPlaybook,
        targetShipDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
    });

  return entries;
}

export function buildExecutiveUpdate(
  health: HealthScore,
  timeline: TimelineInsight,
  actions: PlaybookAction[],
  alerts: Alert[]
): ExecutiveUpdate {
  const monday = new Date(health.updatedAt);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const highlights = [
    `Health score ${health.score}`,
    `Deployments: ${timeline.deployments}, Incidents: ${timeline.incidents}`,
    timeline.lastValueProof
      ? `Latest proof: ${timeline.lastValueProof}`
      : "Need value proof artifact",
  ];

  const risks = alerts
    .filter((alert) => ["high", "critical"].includes(alert.severity))
    .map((alert) => alert.message);
  const plannedFixes = actions
    .filter((action) => action.category === "support" || action.category === "governance")
    .map((action) => action.description);

  const artifacts = Array.from(
    new Set(
      actions
        .flatMap((action) => action.artifacts || [])
        .concat(["timeline", "health-dashboard", "roi-dashboard"])
    )
  );

  return {
    weekOf: monday,
    highlights,
    risks,
    plannedFixes,
    artifacts,
  };
}
