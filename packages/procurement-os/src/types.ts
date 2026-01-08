export type DataClassification = "public" | "internal" | "sensitive" | "pii" | "phi" | "regulated";

export type RiskTier = 0 | 1 | 2 | 3;

export interface IntakeRequest {
  owner: string;
  useCase: string;
  problemStatement: string;
  roiModel: string;
  spendEstimate: number;
  spendCurrency: string;
  capex: number;
  opex: number;
  termMonths: number;
  dataCategories: DataClassification[];
  dataFlows: string[];
  integrationNeeds: string[];
  renewalDate: string;
  noticeDate: string;
  seatsRequested: number;
  preferredVendor: boolean;
  vendorName: string;
  existingOverlapCategory?: string;
  criticality: "customer-impacting" | "core-operations" | "business-support" | "non-critical";
  apiAccess: boolean;
  handlesProductionTraffic: boolean;
  hasSSO: boolean;
  estimatedUsers: number;
}

export interface IntakeDecision {
  riskTier: RiskTier;
  approvalPath: ApprovalRequirement;
  routing: RoutingAssignment[];
  policyViolations: string[];
}

export interface ApprovalRequirement {
  spendGate: string[];
  requiresExecutiveSignoff: boolean;
  requiresSecurity: boolean;
  requiresLegal: boolean;
  requiresFinance: boolean;
  requiresIT: boolean;
}

export interface RoutingAssignment {
  team: "Security" | "Legal" | "Finance" | "IT" | "Procurement" | "Executive";
  reason: string;
  slaHours: number;
}

export type AssessmentType = "lite" | "standard" | "deep";

export interface AssessmentEvidence {
  type: "soc2" | "iso27001" | "pentest" | "subprocessor_list" | "dpa" | "dpiA" | "other";
  receivedAt: Date;
  description: string;
}

export interface RemediationTask {
  id: string;
  description: string;
  dueDate: Date;
  severity: "low" | "medium" | "high";
  status: "open" | "in_progress" | "closed";
  escalationLevel: number;
}

export interface RiskAssessment {
  vendor: string;
  tier: RiskTier;
  assessmentType: AssessmentType;
  evidences: AssessmentEvidence[];
  remediation: RemediationTask[];
  completed: boolean;
  lastReviewed: Date;
  exitPlanReady: boolean;
  subprocessorChanges: string[];
}

export interface ExceptionEntry {
  id: string;
  description: string;
  expiresAt: Date;
  owner: string;
  compensatingControls: string[];
}

export interface RenewalEvent {
  vendor: string;
  renewalDate: Date;
  noticeDate: Date;
  negotiationWindowStart: Date;
  owner: string;
  autoRenew: boolean;
}

export interface VendorScorecard {
  vendor: string;
  spend: number;
  usage: number;
  reliability: number;
  risk: number;
  businessValue: number;
  tier: RiskTier;
  score: number;
  renewalRecommendation: "renew" | "re-negotiate" | "replace" | "retire";
}

export interface PaymentRequest {
  vendor: string;
  amount: number;
  currency: string;
  purchaseOrder?: string;
  exceptionId?: string;
}

export interface PaymentDecision {
  approved: boolean;
  reason?: string;
}

export interface CatalogEntry {
  vendor: string;
  owner: string;
  tier: RiskTier;
  dataRisk: DataClassification[];
  keepKill: "keep" | "watch" | "delete";
  overlapCategory?: string;
  blockedShadow: boolean;
}
