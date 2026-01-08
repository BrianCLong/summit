export enum PartnerArchetype {
  PLATFORM = "platform",
  SYSTEM_INTEGRATOR = "system_integrator",
  AGENCY = "agency",
  RESELLER = "reseller",
  OEM = "oem_embedded",
  DATA_PROVIDER = "data_provider",
}

export enum PartnerSegment {
  STRATEGIC = "strategic",
  GROWTH = "growth",
  LONG_TAIL = "long_tail",
}

export interface TierCriteria {
  revenueInfluence: number; // 0-5 rubric
  deliveryQuality: number; // 0-5 rubric
  securityPosture: number; // 0-5 rubric
  supportMaturity: number; // 0-5 rubric
}

export interface TierWeights {
  revenueInfluence: number;
  deliveryQuality: number;
  securityPosture: number;
  supportMaturity: number;
}

export interface TierScore {
  weightedScore: number;
  normalizedScore: number;
  criteriaBreakdown: Record<keyof TierCriteria, number>;
}

export interface ScorecardMetrics {
  pipelineSourced: number;
  pipelineInfluenced: number;
  installs: number;
  activationRate: number;
  retentionRate: number;
  incidentRate: number;
  nps: number;
  updatedAt: Date;
}

export interface SLA {
  responseMinutes: number;
  escalationMinutes: number;
  certificationRenewalMonths: number;
}

export interface DealRegistration {
  partnerId: string;
  partnerSegment: PartnerSegment;
  tierScore: number;
  registeredAt: Date;
  expiresAt: Date;
  status: "active" | "expired" | "closed";
  activityLog: Array<{
    at: Date;
    description: string;
  }>;
}

export interface IntakeProfile {
  partnerId: string;
  archetype: PartnerArchetype;
  legalName: string;
  headquartersCountry: string;
  ownershipVerified: boolean;
  taxInformationCollected: boolean;
  contacts: { role: string; email: string }[];
  escalationChain: string[];
}

export interface SecurityQuestionnaireResult {
  tier: PartnerSegment;
  controlsMet: number;
  controlsTotal: number;
  failingControls: string[];
}

export interface TechnicalOnboardingChecklist {
  sandboxIssued: boolean;
  apiKeysIssued: boolean;
  scopesGranted: string[];
  rateLimitPerMinute: number;
  webhooksConfigured: boolean;
  replayProtectionEnabled: boolean;
}

export interface OnboardingState {
  intake: IntakeProfile;
  security: SecurityQuestionnaireResult;
  technical: TechnicalOnboardingChecklist;
  certificationStatus: "pending" | "passed" | "failed";
  enablementKitIssued: boolean;
  portalAccountIssued: boolean;
  createdAt: Date;
  firstSuccessAt?: Date;
}

export interface IntegrationContract {
  versioningStrategy: "semver" | "dated" | "none";
  pagination: "cursor" | "offset" | "none";
  errorModel: "typed" | "http-status-only";
  idempotencyKeys: boolean;
  webhooksSigned: boolean;
  replayWindowSeconds: number;
  scopedPermissions: string[];
  dependencyScanning: boolean;
  secretHandling: "vaulted" | "plaintext";
  egressPolicy: "restricted" | "open";
}

export interface IntegrationCertificationResult {
  passed: boolean;
  violations: string[];
}

export interface RiskRegisterEntry {
  partnerId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  dataAccess: string;
  geography: string;
  dependencies: string[];
  lastReviewedAt: Date;
}

export interface AccessGrant {
  id: string;
  partnerId: string;
  issuedAt: Date;
  expiresAt: Date;
  scopes: string[];
  type: "user" | "service_token";
}

export type EnforcementAction = "warn" | "throttle" | "suspend" | "terminate";

export interface HealthSignal {
  metric: "errorRate" | "volume" | "abuse";
  value: number;
  threshold: number;
  partnerId: string;
  observedAt: Date;
}

export interface PayoutLineItem {
  partnerId: string;
  model: "rev_share" | "referral" | "usage" | "oem";
  gross: number;
  sharePercentage: number;
  refunds: number;
  disputes: number;
  taxWithholding: number;
  occurredAt: Date;
}

export interface PayoutResult {
  net: number;
  auditTrail: string[];
}

export interface Entitlement {
  partnerId: string;
  tier: PartnerSegment;
  apiQuotaPerMinute: number;
  supportSla: SLA;
  promoSlots: number;
}

export interface LeakageEvent {
  partnerId: string;
  reason: string;
  detectedAt: Date;
}

export interface ThrottleDecision {
  newQuota: number;
  rationale: string;
  triggeredBy: HealthSignal | null;
}
