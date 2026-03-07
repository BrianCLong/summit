export type Segment = "enterprise" | "midmarket" | "growth" | "public-sector";

export type UseCaseCategory =
  | "threat-detection"
  | "fraud-intel"
  | "compliance"
  | "workflow-automation"
  | "insights"
  | "governance";

export interface TenantProfile {
  id: string;
  name: string;
  segment: Segment;
  icp: string;
  targetUseCases: UseCaseCategory[];
  tier: "foundation" | "standard" | "premium";
  timezoneOffsetMinutes?: number;
}

export type EventKind =
  | "user.session"
  | "feature.used"
  | "integration.state"
  | "error.raised"
  | "job.retry"
  | "billing.invoice"
  | "ticket.created"
  | "ticket.resolved"
  | "nudge.sent"
  | "nudge.acted"
  | "recipe.completed"
  | "deployment.published"
  | "config.changed"
  | "sentiment.updated"
  | "sponsor.touch";

export interface TimelineEvent {
  id: string;
  tenantId: string;
  kind: EventKind;
  timestamp: Date;
  metadata: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}

export interface AdoptionSignals {
  depthScore: number;
  widthScore: number;
  stickiness: number;
  featureGaps?: string[];
}

export interface ReliabilitySignals {
  errorRate: number;
  mttrMinutes: number;
  slaBreaches: number;
}

export interface SupportSignals {
  openTickets: number;
  churnRiskTagged: number;
  sentiment: number;
  sponsorStrength: number;
}

export interface Ticket {
  id: string;
  type: string;
  severity: "p1" | "p2" | "p3";
  churnRisk: boolean;
  revenueImpact: "low" | "medium" | "high";
  repeating: boolean;
}

export interface BillingSignals {
  unpaidInvoices: number;
  invoiceAgingDays: number;
  overageRisk: boolean;
}

export interface HealthInput {
  tenantId: string;
  adoption: AdoptionSignals;
  reliability: ReliabilitySignals;
  support: SupportSignals;
  billing: BillingSignals;
  lastUpdated: Date;
}

export interface HealthComponentResult {
  component: string;
  score: number;
  weight: number;
  rationale: string[];
}

export interface HealthScore {
  tenantId: string;
  score: number;
  components: HealthComponentResult[];
  alerts: Alert[];
  updatedAt: Date;
}

export type AlertKind =
  | "adoption-drop"
  | "error-spike"
  | "sla-risk"
  | "stalled-onboarding"
  | "unpaid-invoice"
  | "sponsor-disengaged"
  | "stickiness-decline"
  | "expansion-opportunity"
  | "advocacy-opportunity";

export interface Alert {
  kind: AlertKind;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendedPlaybook: string;
  occurredAt: Date;
}

export interface ChecklistItem {
  key: string;
  description: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  owner?: string;
  recoveryAction?: string;
}

export interface ChecklistOutcome {
  stage: "day7" | "day14" | "day30";
  items: ChecklistItem[];
  completed: boolean;
  blockers: string[];
}

export interface PlaybookAction {
  id: string;
  category:
    | "onboarding"
    | "adoption"
    | "support"
    | "expansion"
    | "advocacy"
    | "renewal"
    | "governance";
  description: string;
  requiresApproval?: boolean;
  slaMinutes?: number;
  artifacts?: string[];
}

export interface ExpansionTrigger {
  trigger: string;
  detectedAt: Date;
  recommendedPath: string;
}

export interface RenewalPlan {
  startDate: Date;
  renewalDate: Date;
  milestones: PlaybookAction[];
}

export interface AdvocacyCandidate {
  tenantId: string;
  rationale: string[];
  asks: string[];
  protections: PlaybookAction[];
}

export interface FrictionLogEntry {
  issue: string;
  severity: "low" | "medium" | "high";
  owner: string;
  mitigation: string;
  targetShipDate: Date;
}

export interface ExecutiveUpdate {
  weekOf: Date;
  highlights: string[];
  risks: string[];
  plannedFixes: string[];
  artifacts: string[];
}

export interface TimelineInsight {
  deployments: number;
  incidents: number;
  configChanges: number;
  recipesCompleted: number;
  stalledOnboardingHours: number;
  lastValueProof?: string;
}

export interface PredictiveJourneyInsight {
  riskScore: number;
  likelihoodNextAction: string;
  explanation: string;
}

export interface TrustControl {
  control: string;
  enforced: boolean;
  evidence: string;
}

export interface OperatingSystemResult {
  health: HealthScore;
  checklists: ChecklistOutcome[];
  actions: PlaybookAction[];
  alerts: Alert[];
  expansionTriggers: ExpansionTrigger[];
  renewalPlan: RenewalPlan;
  advocacy: AdvocacyCandidate[];
  trust: TrustControl[];
  predictiveInsights: PredictiveJourneyInsight;
  frictionLog: FrictionLogEntry[];
  executiveUpdate: ExecutiveUpdate;
  timelineInsight: TimelineInsight;
}
