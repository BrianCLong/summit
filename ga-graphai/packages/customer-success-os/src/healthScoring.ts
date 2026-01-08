import { Alert, HealthComponentResult, HealthInput, HealthScore } from "./types";

const COMPONENT_WEIGHTS: Record<string, number> = {
  adoption: 0.22,
  stickiness: 0.16,
  reliability: 0.18,
  support: 0.16,
  sentiment: 0.12,
  sponsor: 0.08,
  billing: 0.08,
};

function normalize(value: number, floor: number, ceiling: number): number {
  if (ceiling === floor) return 0;
  const bounded = Math.min(Math.max(value, floor), ceiling);
  return ((bounded - floor) / (ceiling - floor)) * 100;
}

function buildComponent(
  component: string,
  score: number,
  rationale: string[]
): HealthComponentResult {
  return {
    component,
    score: Number(score.toFixed(2)),
    weight: COMPONENT_WEIGHTS[component],
    rationale,
  };
}

function adoptionScore(adoption: HealthInput["adoption"]): HealthComponentResult {
  const depth = normalize(adoption.depthScore, 0, 10);
  const width = normalize(adoption.widthScore, 0, 10);
  const combined = (depth * 0.6 + width * 0.4) * (adoption.stickiness / 100);
  const rationale = [
    `Depth=${adoption.depthScore}/10`,
    `Width=${adoption.widthScore}/10`,
    `Stickiness=${adoption.stickiness}`,
  ];
  if (adoption.featureGaps?.length) {
    rationale.push(`Feature gaps: ${adoption.featureGaps.join(", ")}`);
  }
  return buildComponent("adoption", combined, rationale);
}

function stickinessScore(adoption: HealthInput["adoption"]): HealthComponentResult {
  const score = normalize(adoption.stickiness, 0, 100);
  const rationale = [`Stickiness score ${adoption.stickiness}`];
  if (adoption.stickiness < 40) {
    rationale.push("Usage not habitual: enable nudges and recipes");
  }
  return buildComponent("stickiness", score, rationale);
}

function reliabilityScore(reliability: HealthInput["reliability"]): HealthComponentResult {
  const errorScore = 100 - normalize(reliability.errorRate, 0, 10);
  const mttrScore = 100 - normalize(reliability.mttrMinutes, 0, 240);
  const penalty = reliability.slaBreaches * 10;
  const score = Math.max(0, errorScore * 0.55 + mttrScore * 0.35 - penalty);
  const rationale = [
    `Error rate ${reliability.errorRate}%`,
    `MTTR ${reliability.mttrMinutes}m`,
    `SLA breaches ${reliability.slaBreaches}`,
  ];
  return buildComponent("reliability", score, rationale);
}

function supportScore(support: HealthInput["support"]): HealthComponentResult {
  const backlogPenalty = Math.min(30, support.openTickets * 3);
  const churnRiskPenalty = support.churnRiskTagged * 5;
  const score = Math.max(0, 100 - backlogPenalty - churnRiskPenalty);
  const rationale = [
    `Open tickets ${support.openTickets}`,
    `Churn-risk tags ${support.churnRiskTagged}`,
  ];
  return buildComponent("support", score, rationale);
}

function sentimentScore(support: HealthInput["support"]): HealthComponentResult {
  const normalized = normalize(support.sentiment, -100, 100);
  const rationale = [`Sentiment ${support.sentiment}`];
  if (support.sentiment < 0) {
    rationale.push("Negative sentiment: require exec touch and action plan");
  }
  return buildComponent("sentiment", normalized, rationale);
}

function sponsorScore(support: HealthInput["support"]): HealthComponentResult {
  const rationale = [`Sponsor strength ${support.sponsorStrength}`];
  if (support.sponsorStrength < 50) {
    rationale.push("Sponsor disengagement risk: schedule EBR and executive outreach");
  }
  return buildComponent("sponsor", normalize(support.sponsorStrength, 0, 100), rationale);
}

function billingScore(billing: HealthInput["billing"]): HealthComponentResult {
  const unpaidPenalty = Math.min(50, billing.unpaidInvoices * 15 + billing.invoiceAgingDays);
  const score = Math.max(0, 100 - unpaidPenalty - (billing.overageRisk ? 10 : 0));
  const rationale = [
    `Unpaid invoices ${billing.unpaidInvoices}`,
    `Invoice aging ${billing.invoiceAgingDays} days`,
    billing.overageRisk ? "Approaching limits: expansion opportunity" : "Usage within limits",
  ];
  return buildComponent("billing", score, rationale);
}

function detectAlerts(current: HealthInput, previous?: HealthInput): Alert[] {
  const alerts: Alert[] = [];
  const now = current.lastUpdated;
  if (previous) {
    const adoptionDrop =
      current.adoption.depthScore + current.adoption.widthScore <
      (previous.adoption.depthScore + previous.adoption.widthScore) * 0.8;
    if (adoptionDrop) {
      alerts.push({
        kind: "adoption-drop",
        severity: "high",
        message: "Adoption dropped ≥20% week-over-week",
        recommendedPlaybook: "Launch adoption rescue: schedule office hours and recipe reminders",
        occurredAt: now,
      });
    }
    const stickinessDecline = current.adoption.stickiness < previous.adoption.stickiness - 15;
    if (stickinessDecline) {
      alerts.push({
        kind: "stickiness-decline",
        severity: "medium",
        message: "Stickiness fell materially; add behavior-triggered nudges",
        recommendedPlaybook: "Enable nudges for dormant features and send value recap",
        occurredAt: now,
      });
    }
  }

  if (current.reliability.errorRate > 10 || current.reliability.mttrMinutes > 180) {
    alerts.push({
      kind: "error-spike",
      severity: "critical",
      message: "Error spike or slow recovery detected",
      recommendedPlaybook:
        "Activate incident comms, add deflection banners, push fixes to top priority",
      occurredAt: now,
    });
  }

  if (current.reliability.slaBreaches > 0) {
    alerts.push({
      kind: "sla-risk",
      severity: "high",
      message: "SLA breach jeopardizes hypercare promise",
      recommendedPlaybook:
        "Escalate to hypercare lead, add exec sponsor visibility, post-mortem within 24h",
      occurredAt: now,
    });
  }

  if (current.billing.unpaidInvoices > 0 || current.billing.invoiceAgingDays > 30) {
    alerts.push({
      kind: "unpaid-invoice",
      severity: "medium",
      message: "Unpaid invoices detected; risk of suspension",
      recommendedPlaybook:
        "Coordinate with finance, set remediation deadline, communicate grace window",
      occurredAt: now,
    });
  }

  if (current.support.sponsorStrength < 40) {
    alerts.push({
      kind: "sponsor-disengaged",
      severity: "high",
      message: "Sponsor disengaged; requires executive action",
      recommendedPlaybook:
        "Schedule executive touch, co-create success plan, secure mutual next steps",
      occurredAt: now,
    });
  }

  return alerts;
}

export function calculateHealthScore(current: HealthInput, previous?: HealthInput): HealthScore {
  const components: HealthComponentResult[] = [
    adoptionScore(current.adoption),
    stickinessScore(current.adoption),
    reliabilityScore(current.reliability),
    supportScore(current.support),
    sentimentScore(current.support),
    sponsorScore(current.support),
    billingScore(current.billing),
  ];

  const weightedSum = components.reduce((total, c) => total + c.score * c.weight, 0);
  const alerts = detectAlerts(current, previous);
  return {
    tenantId: current.tenantId,
    score: Number(weightedSum.toFixed(2)),
    components,
    alerts,
    updatedAt: current.lastUpdated,
  };
}
