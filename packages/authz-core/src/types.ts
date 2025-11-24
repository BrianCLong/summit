/**
 * Core Authorization Types
 * Comprehensive type definitions for multi-tenant authorization with warrant and license enforcement
 */

// ============================================================================
// Subject (User/Service) Types
// ============================================================================

export interface Subject {
  id: string;
  type: 'user' | 'service' | 'system';
  tenantId: string;
  email?: string;

  // RBAC
  roles: string[];
  permissions: string[];

  // ABAC attributes
  clearance?: string;             // 'UNCLASSIFIED' | 'CUI' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'
  clearanceLevel?: number;        // 0-5
  compartments?: string[];        // SCI compartments
  missionTags?: string[];
  orgId?: string;
  teamId?: string;
  groups?: string[];

  // Authentication context
  loa?: string;                   // Level of Assurance (loa1, loa2, loa3)
  acr?: string;                   // Authentication Context Class Reference
  mfaVerified?: boolean;
  stepUpRequired?: boolean;

  // Risk & compliance
  riskScore?: number;
  lastReviewedAt?: Date;
  residency?: string;             // Geographic residency (ISO country code)

  // Metadata
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface Resource {
  type: string;                   // 'entity', 'relationship', 'investigation', 'query', 'export'
  id: string;
  tenantId: string;

  // Classification
  classification?: string;
  classificationLevel?: number;
  compartments?: string[];
  missionTags?: string[];

  // Ownership & context
  ownerId?: string;
  investigationId?: string;
  caseId?: string;

  // Data attributes
  dataTypes?: string[];           // Types of data contained
  residency?: string;             // Geographic residency
  tags?: string[];

  // Metadata
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Action Types
// ============================================================================

export type Action =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'SHARE'
  | 'ANNOTATE'
  | 'LINK'
  | 'QUERY'
  | 'COPILOT'
  | 'DISTRIBUTE'
  | 'MODIFY'
  | 'DOWNLOAD';

// ============================================================================
// Context Types
// ============================================================================

export interface AuthorizationContext {
  // Temporal
  requestTime: Date;
  validFrom?: Date;
  validUntil?: Date;

  // Technical
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;

  // Application
  environment: 'development' | 'staging' | 'production';
  investigationId?: string;
  caseId?: string;

  // Purpose tracking
  purpose: string;                // Required: reason for access
  justification?: string;         // Additional justification
  minimumNecessary?: string;      // HIPAA minimum necessary explanation

  // Warrant/Authority
  warrantId?: string;
  warrantRequired?: boolean;
  authorityBasis?: string;

  // License
  licenseId?: string;
  licenseRequired?: boolean;
  tosAccepted?: boolean;

  // Risk context
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  protectedActions?: string[];   // Actions requiring step-up

  // Authentication context
  currentAcr?: string;
  mfaVerified?: boolean;

  // Additional context
  [key: string]: unknown;
}

// ============================================================================
// Warrant Types
// ============================================================================

export type WarrantType =
  | 'WARRANT'
  | 'SUBPOENA'
  | 'COURT_ORDER'
  | 'ADMIN_AUTH'
  | 'LICENSE'
  | 'TOS'
  | 'CONSENT'
  | 'EMERGENCY'
  | 'MUTUAL_AID';

export type WarrantStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUSPENDED'
  | 'SUPERSEDED';

export interface Warrant {
  warrantId: string;
  tenantId: string;
  warrantNumber: string;
  warrantType: WarrantType;

  // Legal details
  issuingAuthority: string;
  jurisdiction: string;
  caseNumber?: string;
  legalBasis: string;

  // Scope
  scope: Record<string, unknown>;
  scopeDescription: string;
  permittedActions: Action[];
  targetSubjects?: string[];
  targetDataTypes?: string[];
  geographicScope?: string[];

  // Validity
  issuedDate: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  status: WarrantStatus;

  // Metadata
  documentUrl?: string;
  documentHash?: string;
}

export interface WarrantValidationResult {
  valid: boolean;
  warrant?: Warrant;
  reason?: string;
  expiresIn?: number;             // Milliseconds until expiry
}

// ============================================================================
// License Types
// ============================================================================

export type LicenseType =
  | 'INTERNAL_ONLY'
  | 'RELEASABLE'
  | 'ORCON'
  | 'NOFORN'
  | 'PROPIN'
  | 'PUBLIC'
  | 'CUSTOM';

export type LicenseStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'SUPERSEDED';

export interface License {
  licenseId: string;
  tenantId: string;
  licenseKey: string;
  licenseName: string;
  licenseType: LicenseType;
  status: LicenseStatus;

  // Permissions
  permissions: {
    read: boolean;
    copy: boolean;
    modify: boolean;
    distribute: boolean;
    commercialUse: boolean;
    createDerivatives: boolean;
  };

  // Restrictions
  restrictions: {
    attribution: boolean;
    shareAlike: boolean;
    nonCommercial: boolean;
    noDerivatives: boolean;
    timeLimited: boolean;
    geographicLimited: boolean;
  };

  // Compliance
  requiresAttribution: boolean;
  attributionText?: string;
  requiresNotice: boolean;
  noticeText?: string;
  requiresSignature: boolean;

  // Export controls
  exportControlled: boolean;
  exportControlClassification?: string;
  permittedCountries?: string[];
  prohibitedCountries?: string[];

  // Validity
  effectiveDate: Date;
  expiryDate?: Date;

  // Metadata
  termsUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: License;
  reason?: string;
  conditions?: LicenseCondition[];
  blockedActions?: Action[];
}

export interface LicenseCondition {
  type: 'ATTRIBUTION' | 'NOTICE' | 'SIGNATURE' | 'EXPORT_CONTROL' | 'CUSTOM';
  requirement: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Decision Types
// ============================================================================

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;

  // Decision context
  decidedAt: Date;
  policyVersion?: string;

  // Contributing factors
  rbacResult?: boolean;
  abacResult?: boolean;
  warrantResult?: WarrantValidationResult;
  licenseResult?: LicenseValidationResult;
  tosAccepted?: boolean;

  // Obligations & conditions
  obligations?: Obligation[];
  conditions?: Condition[];

  // Audit trail
  auditEventId?: string;
  decisionTrace?: DecisionTrace;

  // Step-up requirements
  requiresStepUp?: boolean;
  stepUpReason?: string;
  minimumAcr?: string;

  // Appeal information
  appealable?: boolean;
  appealProcess?: string;
  contactInfo?: string;
}

export interface Obligation {
  type: string;
  description: string;
  requirement?: string;
  target?: string;
  enforceAt?: 'BEFORE' | 'DURING' | 'AFTER';
  metadata?: Record<string, unknown>;
}

export interface Condition {
  type: string;
  description: string;
  satisfied: boolean;
  reason?: string;
}

export interface DecisionTrace {
  // Policy evaluation
  policiesEvaluated: string[];
  rulesMatched: string[];
  rulesFailed: string[];

  // Timing
  evaluationTimeMs: number;
  cacheHit?: boolean;

  // OPA details (if used)
  opaQuery?: string;
  opaResult?: Record<string, unknown>;
}

// ============================================================================
// Authorization Input
// ============================================================================

export interface AuthorizationInput {
  subject: Subject;
  action: Action;
  resource: Resource;
  context: AuthorizationContext;
}

// ============================================================================
// Audit Event Types
// ============================================================================

export interface AuthorizationAuditEvent {
  eventId: string;
  eventType: 'AUTHORIZATION_DECISION';

  // Request
  tenantId: string;
  userId: string;
  userEmail?: string;
  action: Action;
  resourceType: string;
  resourceId: string;

  // Decision
  decision: 'ALLOW' | 'DENY' | 'CHALLENGE';
  reason: string;

  // Context
  warrantId?: string;
  licenseId?: string;
  purpose: string;
  investigationId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;

  // Compliance
  policyVersion?: string;
  minimumNecessaryJustification?: string;
  dataClassification?: string;

  // Timestamp
  timestamp: Date;

  // Metadata
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface AuthorizationConfig {
  // OPA configuration
  opaUrl: string;
  opaTimeout: number;
  opaCacheEnabled: boolean;
  opaCacheTtl: number;

  // Database configuration
  databaseUrl: string;
  databasePoolSize: number;

  // Behavior
  failSecure: boolean;            // Deny on errors in production
  requirePurpose: boolean;        // Always require purpose field
  requireWarrantFor: Action[];    // Actions requiring warrant
  requireLicenseFor: Action[];    // Actions requiring license check

  // Audit
  auditEnabled: boolean;
  auditStreamUrl?: string;

  // Cache
  cacheEnabled: boolean;
  cacheTtl: number;

  // Monitoring
  metricsEnabled: boolean;
  tracingEnabled: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class WarrantError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WarrantError';
  }
}

export class LicenseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LicenseError';
  }
}
