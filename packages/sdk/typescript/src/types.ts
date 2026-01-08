/**
 * Summit SDK Types
 *
 * Core type definitions for the Summit SDK.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/sdk/types
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Governance verdict for all platform operations
 */
export type GovernanceVerdict = "ALLOW" | "DENY" | "FLAG" | "REVIEW_REQUIRED";

/**
 * Data envelope wrapper for all API responses
 */
export interface DataEnvelope<T> {
  data: T;
  metadata: EnvelopeMetadata;
  verdict: GovernanceVerdict;
  timestamp: string;
}

/**
 * Metadata attached to all data envelopes
 */
export interface EnvelopeMetadata {
  requestId: string;
  tenantId: string;
  userId?: string;
  operationType: string;
  sourceSystem: string;
  provenance?: ProvenanceInfo;
}

/**
 * Provenance information for data lineage
 */
export interface ProvenanceInfo {
  source: string;
  timestamp: string;
  transformations?: string[];
  parentIds?: string[];
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * SDK configuration options
 */
export interface SummitConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string;
  tenantId?: string;
  timeout?: number;
  retries?: number;
  onUnauthorized?: () => void;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

/**
 * User information
 */
export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: string;
  tenantId: string;
}

// ============================================================================
// Policy Types
// ============================================================================

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  version: number;
  status: PolicyStatus;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Policy status
 */
export type PolicyStatus = "draft" | "active" | "archived" | "pending_approval";

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  condition: string;
  action: "allow" | "deny" | "flag" | "review";
  priority: number;
  metadata?: Record<string, unknown>;
}

/**
 * Policy simulation request
 */
export interface PolicySimulationRequest {
  policyId?: string;
  rules?: PolicyRule[];
  context: Record<string, unknown>;
  resource: {
    type: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
}

/**
 * Policy simulation result
 */
export interface PolicySimulationResult {
  verdict: GovernanceVerdict;
  matchedRules: string[];
  evaluationPath: string[];
  executionTime: number;
}

// ============================================================================
// Governance Types
// ============================================================================

/**
 * Governance evaluation request
 */
export interface GovernanceRequest {
  action: string;
  resource: {
    type: string;
    id?: string;
    tenantId?: string;
  };
  context?: Record<string, unknown>;
}

/**
 * Governance evaluation result
 */
export interface GovernanceResult {
  verdict: GovernanceVerdict;
  reason?: string;
  policies: string[];
  confidence: number;
}

// ============================================================================
// Tenant Types
// ============================================================================

/**
 * Tenant information
 */
export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant status
 */
export type TenantStatus = "active" | "suspended" | "pending" | "archived";

/**
 * Tenant settings
 */
export interface TenantSettings {
  maxUsers?: number;
  features?: string[];
  customPolicies?: boolean;
  ssoEnabled?: boolean;
  mfaRequired?: boolean;
}

// ============================================================================
// Compliance Types
// ============================================================================

/**
 * Compliance framework identifier
 */
export type ComplianceFramework = "SOC2" | "ISO27001" | "GDPR" | "HIPAA";

/**
 * Control status
 */
export type ControlStatus = "compliant" | "non_compliant" | "partial" | "not_assessed";

/**
 * Compliance control
 */
export interface Control {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement: string;
  frequency: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  framework: ComplianceFramework;
}

/**
 * Control assessment
 */
export interface ControlAssessment {
  controlId: string;
  status: ControlStatus;
  score: number;
  findings: string[];
  evidence: string[];
  assessedAt: string;
  assessedBy: string;
}

/**
 * Evidence item
 */
export interface Evidence {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  type: EvidenceType;
  source: string;
  content: unknown;
  hash: string;
  collectedAt: string;
  collectedBy: string;
  status: "pending" | "verified" | "rejected" | "expired";
}

/**
 * Evidence type
 */
export type EvidenceType =
  | "configuration"
  | "log"
  | "screenshot"
  | "report"
  | "policy"
  | "attestation";

/**
 * Compliance summary
 */
export interface ComplianceSummary {
  framework: ComplianceFramework;
  overallScore: number;
  status: ControlStatus;
  controlSummary: {
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  };
  categoryBreakdown: Array<{
    category: string;
    score: number;
    status: ControlStatus;
  }>;
}

/**
 * Audit readiness assessment
 */
export interface AuditReadiness {
  framework: ComplianceFramework;
  overallScore: number;
  readinessLevel: "ready" | "mostly_ready" | "needs_work" | "not_ready";
  gaps: AuditGap[];
  recommendations: string[];
}

/**
 * Audit gap
 */
export interface AuditGap {
  controlId: string;
  controlName: string;
  gapType: "missing_evidence" | "stale_evidence" | "failed_assessment" | "no_assessment";
  severity: "critical" | "high" | "medium" | "low";
  remediation: string;
  effort: "low" | "medium" | "high";
}

// ============================================================================
// Integration Types
// ============================================================================

/**
 * Integration definition
 */
export interface Integration {
  id: string;
  name: string;
  type: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Integration status
 */
export type IntegrationStatus = "active" | "inactive" | "error" | "pending_approval";

/**
 * Integration action request
 */
export interface IntegrationActionRequest {
  integrationId: string;
  action: string;
  payload: Record<string, unknown>;
}

/**
 * Integration action result
 */
export interface IntegrationActionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  approvalId?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: {
    type: string;
    id: string;
  };
  outcome: "success" | "failure" | "denied";
  verdict?: GovernanceVerdict;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit query parameters
 */
export interface AuditQueryParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  outcome?: "success" | "failure" | "denied";
  limit?: number;
  offset?: number;
}

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Plugin definition
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  status: PluginStatus;
  capabilities: string[];
  config: Record<string, unknown>;
  installedAt: string;
}

/**
 * Plugin status
 */
export type PluginStatus = "enabled" | "disabled" | "error" | "pending";

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Summit SDK error
 */
export class SummitError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    requestId?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SummitError";
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;
  }
}
