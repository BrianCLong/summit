import { identifyAdvocacyCandidates } from "./advocacy";
import { buildOnboardingPlan } from "./onboarding";
import {
  prescribeAdoptionPlaybooks,
  prescribeExpansionPlaybooks,
  prescribeSupportPlaybooks,
  prescribeRenewalPlaybooks,
} from "./playbooks";
import { buildSupportPlan, Ticket } from "./support";
import { detectExpansionTriggers, ExpansionSignals } from "./expansion";
import { enforceGovernance, GovernanceInputs } from "./governance";
import { calculateHealthScore } from "./healthScoring";
import { summarizeTimeline } from "./timeline";
import { buildExecutiveUpdate, buildFrictionLog } from "./reports";
import {
  Alert,
  OperatingSystemResult,
  PredictiveJourneyInsight,
  PlaybookAction,
  TenantProfile,
  TimelineEvent,
  HealthInput,
} from "./types";

interface OperatingInputs {
  profile: TenantProfile;
  health: HealthInput;
  previousHealth?: HealthInput;
  behaviorSignals: {
    dormantFeatures: string[];
    highValuePatterns: string[];
    unusedForDays: number;
    stalledOnboardingHours: number;
  };
  trainingSignals: {
    championPresent: boolean;
    adminsTrained: boolean;
    operatorsTrained: boolean;
  };
  progressMetrics: {
    ssoLive: boolean;
    integrations: number;
    datasetsIngested: number;
    recipesCompleted: number;
    activeUsers: number;
    errorsBelowBudget: boolean;
    dashboardsShipped: number;
    championTrained: boolean;
    hypercareResponseMinutes: number;
    businessReviewScheduled: boolean;
    backlogOfUseCases: number;
  };
  tickets: Ticket[];
  expansionSignals: ExpansionSignals;
  governance: GovernanceInputs;
  renewalDate: Date;
  timeline: TimelineEvent[];
}

function predictiveJourney(timeline: TimelineEvent[], alerts: Alert[]): PredictiveJourneyInsight {
  const riskIndicators = alerts.filter((alert) =>
    ["adoption-drop", "error-spike", "sla-risk"].includes(alert.kind)
  );
  const recencyBoost = timeline.some((event) => event.kind === "recipe.completed") ? -5 : 0;
  const riskScore = Math.min(100, riskIndicators.length * 20 + recencyBoost + alerts.length * 3);
  const likelihoodNextAction =
    riskScore > 60 ? "activate adoption rescue playbook" : "prepare advocacy outreach";
  return {
    riskScore,
    likelihoodNextAction,
    explanation: `Derived from ${riskIndicators.length} high-risk alerts and ${timeline.length} timeline events`,
  };
}

export function operate(inputs: OperatingInputs): OperatingSystemResult {
  const health = calculateHealthScore(inputs.health, inputs.previousHealth);
  const timelineInsight = summarizeTimeline(inputs.timeline, inputs.health.lastUpdated);
  const onboarding = buildOnboardingPlan(
    inputs.profile,
    inputs.progressMetrics,
    inputs.health.lastUpdated
  );
  const adoptionActions = prescribeAdoptionPlaybooks(
    inputs.profile,
    inputs.behaviorSignals,
    inputs.trainingSignals
  );
  const supportPlaybooks = prescribeSupportPlaybooks(health.alerts);
  const supportPlan = buildSupportPlan(inputs.tickets, health.alerts);
  const expansionTriggers = detectExpansionTriggers(inputs.expansionSignals);
  const expansionActions = prescribeExpansionPlaybooks(
    inputs.profile.targetUseCases[0],
    expansionTriggers[0]?.trigger || "usage milestone",
    true
  );
  const renewalPlan = {
    startDate: new Date(inputs.renewalDate.getTime() - 120 * 24 * 60 * 60 * 1000),
    renewalDate: inputs.renewalDate,
    milestones: prescribeRenewalPlaybooks(inputs.renewalDate),
  };
  const advocacy = identifyAdvocacyCandidates(health);
  const governance = enforceGovernance(inputs.governance);
  const predictiveInsights = predictiveJourney(inputs.timeline, health.alerts);

  const actions: PlaybookAction[] = [
    ...onboarding.hypercare,
    ...adoptionActions,
    ...supportPlaybooks,
    ...supportPlan.escalations,
    ...expansionActions,
    ...governance.approvals,
    ...renewalPlan.milestones,
  ];

  const alerts: Alert[] = [...health.alerts];

  const stalledHours = Math.max(
    inputs.behaviorSignals.stalledOnboardingHours,
    timelineInsight.stalledOnboardingHours
  );
  if (stalledHours >= 72) {
    alerts.push({
      kind: "stalled-onboarding",
      severity: "high",
      message: "Onboarding stalled for more than 72 hours",
      recommendedPlaybook: "Launch recovery actions, pair on integrations, and unblock recipes",
      occurredAt: inputs.health.lastUpdated,
    });
  }

  if (advocacy.length) {
    alerts.push({
      kind: "advocacy-opportunity",
      severity: "medium",
      message: "Customer is healthy enough to invite to reference program",
      recommendedPlaybook: "Offer benefits and schedule reference call",
      occurredAt: inputs.health.lastUpdated,
    });
  }

  if (expansionTriggers.length) {
    alerts.push({
      kind: "expansion-opportunity",
      severity: "medium",
      message: "Expansion trigger detected; align upgrade path to value moment",
      recommendedPlaybook: expansionActions[0]?.description || "Present upgrade options",
      occurredAt: inputs.health.lastUpdated,
    });
  }

  const frictionLog = buildFrictionLog(inputs.tickets, alerts);
  const executiveUpdate = buildExecutiveUpdate(health, timelineInsight, actions, alerts);

  return {
    health,
    checklists: onboarding.outcomes,
    actions,
    alerts,
    expansionTriggers,
    renewalPlan,
    advocacy,
    trust: governance.controls,
    predictiveInsights,
    frictionLog,
    executiveUpdate,
    timelineInsight,
  };
}
