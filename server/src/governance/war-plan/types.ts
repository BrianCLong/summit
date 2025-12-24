export type Tier = 'T0' | 'T1' | 'T2';

export interface ServiceReliability {
  service: string;
  availability: number;
  mttrMinutes: number;
  tier: Tier;
}

export interface JourneyStatus {
  name: string;
  hasSloDashboard: boolean;
  hasBurnAlerts: boolean;
  hasRunbook: boolean;
  gameDayValidated: boolean;
}

export interface CostBudgetSnapshot {
  service: string;
  weeklyBudget: number;
  actualSpend: number;
  perWorkspaceBaseline: number;
  perWorkspaceActual: number;
  telemetryCap: number;
  telemetryActual: number;
  storageCap: number;
  storageActual: number;
  burstyTenants?: string[];
}

export interface SecurityControls {
  criticalFindings: number;
  auditLoggingEnabled: boolean;
  privilegedAuditCoverage: boolean;
  ssoMfaEnforced: boolean;
  sharedAccountsRemoved: boolean;
}

export interface GuardrailSnapshot {
  reliability: ServiceReliability[];
  journeys: JourneyStatus[];
  costs: CostBudgetSnapshot[];
  security: SecurityControls;
}

export interface NonNegotiableChecklist {
  domainOwner: string | null;
  sloGatesEnforced: boolean;
  deprecationWindowDays: number;
  auditLoggingEnabled: boolean;
  rollbackPlan: RollbackPlan;
  documentationLinks: string[];
  supportTrainingComplete: boolean;
}

export interface RollbackPlan {
  autoRollbackEnabled: boolean;
  triggers: string[];
  testedInGameDay: boolean;
}

export interface AcceptanceCriteria {
  successMetrics: string[];
  rolloutPlan: string;
  rollbackPlan: RollbackPlan;
  documentation: string[];
  supportTraining: boolean;
  observability: ObservabilityExpectations;
}

export interface ObservabilityExpectations {
  sloDefined: boolean;
  burnAlertsEnabled: boolean;
  tracingEnabled: boolean;
  structuredLogging: boolean;
  correlationIds: boolean;
}

export interface SurfaceAreaChange {
  added: string[];
  removed: string[];
}

export interface RiskItem {
  id: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  owner: string;
  dueDate: string;
  mitigation?: string;
}

export interface PhaseSnapshot {
  day: number;
  journeys: JourneyStatus[];
  reliability: ServiceReliability[];
  costs: CostBudgetSnapshot[];
  security: SecurityControls;
  noisyAlertsRemoved: number;
  deletionsCompleted: number;
  progressiveDeliveryEnabled: boolean;
  costDashboardsReady: boolean;
  ssoMfaCoverage: boolean;
  adminAuditLogging: boolean;
  backlogInPlace: boolean;
  riskRegister: RiskItem[];
  canonicalFlowsLive: boolean;
  lowUsageFeaturesRemoved: number;
  toolingConsolidated: boolean;
  queueConsolidated: boolean;
  crossDomainReadsRemoved: boolean;
  migrationFactoryUsed: boolean;
  dualWritesEliminated: number;
  constraintsEnforced: boolean;
  reconciliationJobsRunning: boolean;
  idempotencyCoverage: boolean;
  telemetryStreamsDeleted: number;
  dependenciesUpgraded: number;
  servicesCollapsed: number;
  topTelemetryDashboardsDeleted: number;
  queriesOptimized: number;
  cachingShipped: boolean;
  frontendBundleReduced: boolean;
  autoscalingCaps: boolean;
  quotasLive: boolean;
  jobWasteReduced: boolean;
  costAnomalyDetection: boolean;
  archivePolicies: boolean;
  trustCenterLive: boolean;
  auditExportsEnabled: boolean;
  scimRbacTemplates: boolean;
  retentionControls: boolean;
  entitlementsCentralized: boolean;
  meteringAccuracyChecks: boolean;
  upgradesSelfServe: boolean;
  dunningRetries: boolean;
  cancellationReasons: boolean;
}

export interface GuardrailReport {
  reliability: RequirementReport;
  cost: RequirementReport;
  security: RequirementReport;
  journeys: RequirementReport;
}

export interface RequirementReport {
  compliant: boolean;
  violations: string[];
}

export interface ErrorBudgetStatus {
  remainingMinutes: number;
  budgetMinutes: number;
  burnRate: number;
  alerts: number[];
  exhausted: boolean;
}

export interface CostBudgetStatus {
  service: string;
  budget: number;
  actual: number;
  variance: number;
  alertLevel: number | null;
  throttleRecommended: boolean;
  telemetryBreached: boolean;
  storageBreached: boolean;
}

export interface CostBudgetReport {
  statuses: CostBudgetStatus[];
  nonCompliant: string[];
}

export interface NonNegotiableResult extends RequirementReport {
  missing: string[];
}

export interface AcceptanceValidationResult extends RequirementReport {
  missing: string[];
}

export interface SurfaceAreaResult extends RequirementReport {}

export interface RiskRegisterStatus {
  topRisks: RiskItem[];
  staleOrMissing: RiskItem[];
}

export interface PhaseStatus extends RequirementReport {
  name: 'Phase 1' | 'Phase 2' | 'Phase 3';
}

export interface PhaseReport {
  phases: PhaseStatus[];
}

export interface Scoreboard {
  reliability: RequirementReport;
  cost: RequirementReport;
  security: RequirementReport;
  delivery: PhaseReport;
  riskRegister: RiskRegisterStatus;
}
