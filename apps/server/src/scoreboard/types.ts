export type GateType = "ROADMAP_SCOPE" | "RELEASE_ENVELOPE" | "PR_SIZE_LIMIT" | "WIP_LIMIT";

export type GateState = "OPEN" | "BLOCKED" | "OVERRIDDEN";

export interface OnCallHealth {
  pagesPerShift: number;
  sleepDebtHours: number;
  toilHours: number;
}

export interface DomainMetrics {
  domainId: string;
  domainName: string;
  periodStart: string;
  periodEnd: string;
  sloBurnRate: number;
  errorBudgetRemaining: number;
  cycleTimeDays: number;
  wipCount: number;
  wipLimit: number;
  blockedTimeHours: number;
  reworkRate: number;
  costPerUnit: number;
  onCall: OnCallHealth;
  deletionShipped: number;
  debtBurn: number;
  repeatIncidents: number;
  prSizeLimitBreaches: number;
  releaseEnvelopeRequired: boolean;
}

export interface GateStatus {
  gate: GateType;
  state: GateState;
  reason: string;
  ownerOverride?: string;
  expiresAt?: string;
}

export interface ExceptionEntry {
  id: string;
  domainId: string;
  gate: GateType;
  owner: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
}

export interface DecisionLogEntry {
  id: string;
  domainId: string;
  title: string;
  owner: string;
  rationale: string;
  revisitDate: string;
  decisionType: "ONE_WAY_DOOR" | "TWO_WAY_DOOR";
  createdAt: string;
}

export interface ReleaseEnvelope {
  id: string;
  domainId: string;
  owner: string;
  metrics: string[];
  rollbackPlan: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DomainScoreboard {
  domainId: string;
  domainName: string;
  metrics: DomainMetrics;
  gates: GateStatus[];
  decisions: DecisionLogEntry[];
  exceptions: ExceptionEntry[];
  releaseEnvelope?: ReleaseEnvelope;
  health: {
    reliability: "GOOD" | "WATCH" | "POOR";
    flow: "GOOD" | "WATCH" | "POOR";
    onCall: "GOOD" | "WATCH" | "POOR";
  };
}

export interface DomainMetricsInput extends Omit<DomainMetrics, "domainId" | "domainName"> {
  domainId: string;
  domainName: string;
}

export const HEALTH_THRESHOLDS = {
  errorBudgetRemaining: 0.02,
  cycleTimeDays: 5,
  blockedTimeHours: 10,
  reworkRate: 0.2,
  repeatIncidents: 2,
  prSizeLimitBreaches: 0,
};
