export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'decommissioned';

export interface QuotaProfile {
  maxEvaluations: number;
  maxRuntimeMinutes: number;
  dataLimitMb: number;
  maxConcurrency: number;
}

export interface AccessKey {
  key: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface TenantPolicy {
  allowPii: boolean;
  restrictedConnectors: string[];
  sandboxed: boolean;
}

export interface TenantUsage {
  evaluationsRun: number;
  runtimeMinutes: number;
  dataScannedMb: number;
  lastActivityAt?: Date;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  status: TenantStatus;
  quota: QuotaProfile;
  policy: TenantPolicy;
  usage: TenantUsage;
  keys: AccessKey[];
  auditLog: AuditRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditRecord {
  id: string;
  timestamp: Date;
  action: string;
  details?: Record<string, unknown>;
}

export type EvaluationStatus =
  | 'requested'
  | 'provisioning'
  | 'ready'
  | 'running'
  | 'report-ready'
  | 'deprovisioned'
  | 'failed';

export interface EvaluationEnvironment {
  id: string;
  status: 'provisioning' | 'ready' | 'deprovisioned';
  sandboxed: boolean;
  billingTags: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

export interface EvaluationRequest {
  tenantName: string;
  email: string;
  useCase: string;
  connectors: string[];
  deploymentProfile: string;
  quotaOverride?: Partial<QuotaProfile>;
}

export interface EvaluationRun {
  id: string;
  startedAt: Date;
  completedAt: Date;
  runtimeMinutes: number;
  dataScannedMb: number;
  scenario: string;
  success: boolean;
}

export interface GuidedSuggestion {
  title: string;
  recommendation: string;
  rationale: string;
}

export interface KPIReport {
  evaluationId: string;
  timeToFirstInsightMinutes: number;
  successProbability: number;
  latencyP95Ms: number;
  dataScannedMb: number;
  guidedSuggestions: GuidedSuggestion[];
  notes: string;
}

export interface EvaluationRecord {
  id: string;
  tenantId: string;
  status: EvaluationStatus;
  environment: EvaluationEnvironment;
  runs: EvaluationRun[];
  kpiReport?: KPIReport;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationResult {
  subject: string;
  passed: boolean;
  score: number;
  badgeId: string;
  issues: string[];
  artifactUrl: string;
}

export interface ConnectorCandidate {
  name: string;
  version: string;
  capabilities: string[];
  signedBy?: string;
}

export interface DeploymentProfile {
  name: string;
  isolation: 'saas' | 'vpc' | 'on-prem' | 'air-gap';
  controls: {
    rateLimitPerMinute: number;
    auditEnabled: boolean;
    sandboxed: boolean;
    encryptedAtRest: boolean;
  };
  supportedRegions: string[];
}

export interface FunnelStageEvent {
  evaluationId: string;
  stage: 'requested' | 'provisioned' | 'run-triggered' | 'report-ready' | 'deprovisioned';
  occurredAt: Date;
  success: boolean;
}

export interface FunnelMetrics {
  stages: Record<string, number>;
  dropOff: Record<string, number>;
  averageTimeToValueMinutes: number;
  completionRate: number;
}
