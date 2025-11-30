/**
 * Audit Black Box Service - Core Type Definitions
 *
 * Comprehensive audit event schema for immutable, tamper-evident audit logging.
 * Supports cross-system audit logging with correlation IDs for distributed tracing.
 *
 * Design Goals:
 * - Immutable audit trail with cryptographic integrity (SHA-256 hash chain)
 * - SOC 2, GDPR, HIPAA, ISO 27001, FedRAMP, CJIS compliance
 * - Multi-tenant isolation with tenant-scoped audit data
 * - Forensic analysis capabilities with full actor/resource tracking
 * - RTBF/redaction support via tombstones (no silent deletion)
 */

import { z } from 'zod';

// ============================================================================
// Critical Event Categories
// ============================================================================

/**
 * Critical event categories that require mandatory audit logging
 * These events must always be captured regardless of system load
 */
export const CriticalEventCategory = {
  /** User access events - login, logout, session management */
  ACCESS: 'access',
  /** Data export events - bulk downloads, reports, API extracts */
  EXPORT: 'export',
  /** Administrative changes - user management, config, permissions */
  ADMIN_CHANGE: 'admin_change',
  /** Policy changes - RBAC/ABAC rules, OPA policies, governance rules */
  POLICY_CHANGE: 'policy_change',
  /** AI/ML model selection and execution - copilot, inference, training */
  MODEL_SELECTION: 'model_selection',
  /** Security events - breaches, alerts, anomalies */
  SECURITY: 'security',
  /** Data lifecycle - deletion, anonymization, retention */
  DATA_LIFECYCLE: 'data_lifecycle',
  /** Compliance events - audits, reports, attestations */
  COMPLIANCE: 'compliance',
} as const;

export type CriticalEventCategory =
  (typeof CriticalEventCategory)[keyof typeof CriticalEventCategory];

// ============================================================================
// Audit Event Types
// ============================================================================

/**
 * Comprehensive audit event types covering all system operations
 */
export const AuditEventType = {
  // System lifecycle
  SYSTEM_START: 'system_start',
  SYSTEM_STOP: 'system_stop',
  SYSTEM_ERROR: 'system_error',
  CONFIG_CHANGE: 'config_change',
  HEALTH_CHECK: 'health_check',

  // Authentication & Authorization
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_DELETED: 'user_deleted',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  PASSWORD_CHANGE: 'password_change',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  MFA_CHALLENGE: 'mfa_challenge',
  SESSION_CREATED: 'session_created',
  SESSION_EXPIRED: 'session_expired',
  SESSION_REVOKED: 'session_revoked',
  TOKEN_ISSUED: 'token_issued',
  TOKEN_REVOKED: 'token_revoked',
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REMOVED: 'role_removed',
  ACCESS_DENIED: 'access_denied',
  IMPERSONATION_START: 'impersonation_start',
  IMPERSONATION_END: 'impersonation_end',

  // Resource operations (CRUD)
  RESOURCE_CREATE: 'resource_create',
  RESOURCE_READ: 'resource_read',
  RESOURCE_UPDATE: 'resource_update',
  RESOURCE_DELETE: 'resource_delete',
  RESOURCE_RESTORE: 'resource_restore',
  RESOURCE_EXPORT: 'resource_export',
  RESOURCE_IMPORT: 'resource_import',
  RESOURCE_ARCHIVE: 'resource_archive',

  // Investigation operations
  INVESTIGATION_CREATE: 'investigation_create',
  INVESTIGATION_VIEW: 'investigation_view',
  INVESTIGATION_UPDATE: 'investigation_update',
  INVESTIGATION_DELETE: 'investigation_delete',
  INVESTIGATION_SHARE: 'investigation_share',
  INVESTIGATION_UNSHARE: 'investigation_unshare',
  INVESTIGATION_ARCHIVE: 'investigation_archive',
  INVESTIGATION_CLONE: 'investigation_clone',

  // Entity operations
  ENTITY_CREATE: 'entity_create',
  ENTITY_VIEW: 'entity_view',
  ENTITY_UPDATE: 'entity_update',
  ENTITY_DELETE: 'entity_delete',
  ENTITY_MERGE: 'entity_merge',
  ENTITY_SPLIT: 'entity_split',
  ENTITY_LINK: 'entity_link',
  ENTITY_UNLINK: 'entity_unlink',

  // Relationship operations
  RELATIONSHIP_CREATE: 'relationship_create',
  RELATIONSHIP_VIEW: 'relationship_view',
  RELATIONSHIP_UPDATE: 'relationship_update',
  RELATIONSHIP_DELETE: 'relationship_delete',

  // Graph operations
  GRAPH_QUERY: 'graph_query',
  GRAPH_EXPORT: 'graph_export',
  GRAPH_IMPORT: 'graph_import',
  GRAPH_ANALYSIS: 'graph_analysis',
  GRAPH_TRAVERSAL: 'graph_traversal',

  // AI/ML operations
  AI_EXTRACTION_START: 'ai_extraction_start',
  AI_EXTRACTION_COMPLETE: 'ai_extraction_complete',
  AI_EXTRACTION_FAIL: 'ai_extraction_fail',
  AI_INFERENCE_REQUEST: 'ai_inference_request',
  AI_INFERENCE_COMPLETE: 'ai_inference_complete',
  AI_MODEL_SELECTED: 'ai_model_selected',
  AI_MODEL_UPDATE: 'ai_model_update',
  AI_COPILOT_QUERY: 'ai_copilot_query',
  AI_COPILOT_RESPONSE: 'ai_copilot_response',

  // Data operations
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  DATA_DELETION: 'data_deletion',
  DATA_ANONYMIZATION: 'data_anonymization',
  DATA_BREACH: 'data_breach',
  DATA_ACCESS_BULK: 'data_access_bulk',
  DATA_RETENTION_APPLY: 'data_retention_apply',
  DATA_CLASSIFICATION_CHANGE: 'data_classification_change',

  // Compliance & Policy
  POLICY_DECISION: 'policy_decision',
  POLICY_VIOLATION: 'policy_violation',
  POLICY_UPDATE: 'policy_update',
  COMPLIANCE_CHECK: 'compliance_check',
  COMPLIANCE_VIOLATION: 'compliance_violation',
  COMPLIANCE_REPORT_GENERATED: 'compliance_report_generated',
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_DENIED: 'approval_denied',
  LEGAL_HOLD_APPLIED: 'legal_hold_applied',
  LEGAL_HOLD_RELEASED: 'legal_hold_released',

  // Security events
  SECURITY_ALERT: 'security_alert',
  ANOMALY_DETECTED: 'anomaly_detected',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  BRUTE_FORCE_DETECTED: 'brute_force_detected',
  MALWARE_DETECTED: 'malware_detected',
  INTRUSION_DETECTED: 'intrusion_detected',
  DLP_VIOLATION: 'dlp_violation',

  // Backup & Recovery
  BACKUP_START: 'backup_start',
  BACKUP_COMPLETE: 'backup_complete',
  BACKUP_FAIL: 'backup_fail',
  RESTORE_START: 'restore_start',
  RESTORE_COMPLETE: 'restore_complete',
  RESTORE_FAIL: 'restore_fail',

  // Audit integrity
  AUDIT_INTEGRITY_CHECK: 'audit_integrity_check',
  AUDIT_TAMPER_DETECTED: 'audit_tamper_detected',
  AUDIT_EXPORT: 'audit_export',
  AUDIT_REDACTION: 'audit_redaction',

  // RTBF (Right to Be Forgotten)
  RTBF_REQUEST: 'rtbf_request',
  RTBF_EXECUTED: 'rtbf_executed',
  RTBF_DENIED: 'rtbf_denied',
} as const;

export type AuditEventType =
  (typeof AuditEventType)[keyof typeof AuditEventType];

// ============================================================================
// Severity Levels
// ============================================================================

export const AuditLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type AuditLevel = (typeof AuditLevel)[keyof typeof AuditLevel];

// ============================================================================
// Compliance Frameworks
// ============================================================================

export const ComplianceFramework = {
  SOC2: 'SOC2',
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  SOX: 'SOX',
  NIST: 'NIST',
  ISO27001: 'ISO27001',
  CCPA: 'CCPA',
  PCI_DSS: 'PCI_DSS',
  FEDRAMP: 'FEDRAMP',
  CJIS: 'CJIS',
  ITAR: 'ITAR',
} as const;

export type ComplianceFramework =
  (typeof ComplianceFramework)[keyof typeof ComplianceFramework];

// ============================================================================
// Data Classification
// ============================================================================

export const DataClassification = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
  TOP_SECRET: 'top_secret',
} as const;

export type DataClassification =
  (typeof DataClassification)[keyof typeof DataClassification];

// ============================================================================
// Resource Types
// ============================================================================

export const ResourceType = {
  INVESTIGATION: 'investigation',
  ENTITY: 'entity',
  RELATIONSHIP: 'relationship',
  USER: 'user',
  TENANT: 'tenant',
  DOCUMENT: 'document',
  GRAPH: 'graph',
  AI_MODEL: 'ai_model',
  BACKUP: 'backup',
  CONFIG: 'config',
  API_KEY: 'api_key',
  WEBHOOK: 'webhook',
  POLICY: 'policy',
  REPORT: 'report',
  CASE: 'case',
  ALERT: 'alert',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

// ============================================================================
// Outcome Types
// ============================================================================

export const AuditOutcome = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL: 'partial',
  PENDING: 'pending',
  DENIED: 'denied',
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

// ============================================================================
// Core Audit Event Interface
// ============================================================================

/**
 * Comprehensive audit event interface for the black box service
 */
export interface AuditEvent {
  // === Core Identification ===
  /** Unique event identifier (UUID v4) */
  id: string;
  /** Type of audit event */
  eventType: AuditEventType | string;
  /** Severity level */
  level: AuditLevel;
  /** Event timestamp (ISO 8601 UTC) */
  timestamp: Date;
  /** Schema version for evolution */
  version: string;

  // === Context & Correlation ===
  /** Groups related events across services (required for tracing) */
  correlationId: string;
  /** User session ID */
  sessionId?: string;
  /** HTTP request ID */
  requestId?: string;
  /** Parent event ID for hierarchies */
  parentEventId?: string;
  /** OpenTelemetry trace ID */
  traceId?: string;
  /** OpenTelemetry span ID */
  spanId?: string;

  // === Actors ===
  /** Primary user ID performing the action */
  userId?: string;
  /** User display name (for readability) */
  userName?: string;
  /** User email (may be redacted) */
  userEmail?: string;
  /** Original user if impersonating */
  impersonatedBy?: string;
  /** Service account ID if automated */
  serviceAccountId?: string;
  /** Multi-tenant isolation key (required) */
  tenantId: string;
  /** Organization context */
  organizationId?: string;

  // === Service Context ===
  /** Service that generated the event (required) */
  serviceId: string;
  /** Human-readable service name */
  serviceName: string;
  /** Service version */
  serviceVersion?: string;
  /** Runtime environment */
  environment: 'development' | 'staging' | 'production';
  /** Hostname/container ID */
  hostId?: string;

  // === Resource Context ===
  /** Type of resource affected */
  resourceType?: ResourceType | string;
  /** Primary resource identifier */
  resourceId?: string;
  /** Multiple resource IDs for bulk operations */
  resourceIds?: string[];
  /** API path or file path */
  resourcePath?: string;
  /** Human-readable resource name */
  resourceName?: string;

  // === Action Details ===
  /** Critical event category */
  criticalCategory?: CriticalEventCategory;
  /** Short action description */
  action: string;
  /** Operation outcome */
  outcome: AuditOutcome;
  /** Human-readable message */
  message: string;
  /** Structured event details */
  details: Record<string, unknown>;

  // === Mutation Tracking (Before/After States) ===
  /** State before mutation */
  oldValues?: Record<string, unknown>;
  /** State after mutation */
  newValues?: Record<string, unknown>;
  /** Human-readable diff summary */
  diffSummary?: string;

  // === Security Context ===
  /** Client IPv4 address */
  ipAddress?: string;
  /** Client IPv6 address */
  ipAddressV6?: string;
  /** Client user agent */
  userAgent?: string;
  /** Geolocation data */
  geolocation?: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number]; // [longitude, latitude]
    timezone?: string;
  };
  /** Device fingerprint hash */
  deviceFingerprint?: string;

  // === Compliance Fields ===
  /** Flag for compliance-relevant events */
  complianceRelevant: boolean;
  /** Applicable compliance frameworks */
  complianceFrameworks: ComplianceFramework[];
  /** Data sensitivity classification */
  dataClassification?: DataClassification;
  /** Retention period override in days */
  retentionPeriodDays?: number;
  /** Legal hold flag (prevents deletion) */
  legalHold?: boolean;
  /** GDPR Article 6 lawful basis */
  gdprLawfulBasis?: string;
  /** HIPAA requirement reference */
  hipaaRequirement?: string;

  // === Cryptographic Integrity ===
  /** SHA-256 hash of event content */
  hash?: string;
  /** HMAC-SHA256 signature */
  signature?: string;
  /** Hash chain link to previous event */
  previousEventHash?: string;
  /** Signature algorithm used */
  signatureAlgorithm?: string;
  /** Public key ID for verification */
  publicKeyId?: string;

  // === Performance Metrics ===
  /** Operation duration in milliseconds */
  duration?: number;
  /** Error code if failed */
  errorCode?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Sanitized stack trace */
  stackTrace?: string;

  // === Metadata ===
  /** Searchable tags */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Whether PII was redacted */
  redacted?: boolean;

  // === Audit Metadata (Set by Black Box Service) ===
  /** Database insertion time */
  createdAt?: Date;
  /** Sequential numbering for ordering */
  sequenceNumber?: bigint;
  /** Storage partition identifier */
  partition?: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * Geolocation schema
 */
export const GeolocationSchema = z.object({
  country: z.string().optional(),
  countryCode: z.string().max(3).optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
  timezone: z.string().optional(),
});

/**
 * Comprehensive audit event validation schema
 */
export const AuditEventSchema = z.object({
  // Core identification
  id: z.string().uuid().optional(),
  eventType: z.string().min(1),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  timestamp: z.coerce.date().optional(),
  version: z.string().default('1.0.0'),

  // Context & correlation (correlationId is required)
  correlationId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  parentEventId: z.string().uuid().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),

  // Actors
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
  impersonatedBy: z.string().optional(),
  serviceAccountId: z.string().optional(),
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),

  // Service context
  serviceId: z.string().min(1),
  serviceName: z.string().min(1),
  serviceVersion: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']),
  hostId: z.string().optional(),

  // Resource context
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
  resourcePath: z.string().optional(),
  resourceName: z.string().optional(),

  // Action details
  criticalCategory: z
    .enum([
      'access',
      'export',
      'admin_change',
      'policy_change',
      'model_selection',
      'security',
      'data_lifecycle',
      'compliance',
    ])
    .optional(),
  action: z.string().min(1),
  outcome: z.enum(['success', 'failure', 'partial', 'pending', 'denied']),
  message: z.string().min(1),
  details: z.record(z.unknown()).default({}),

  // Mutation tracking
  oldValues: z.record(z.unknown()).optional(),
  newValues: z.record(z.unknown()).optional(),
  diffSummary: z.string().optional(),

  // Security context
  ipAddress: z.string().ip().optional(),
  ipAddressV6: z.string().optional(),
  userAgent: z.string().optional(),
  geolocation: GeolocationSchema.optional(),
  deviceFingerprint: z.string().optional(),

  // Compliance fields
  complianceRelevant: z.boolean().default(false),
  complianceFrameworks: z
    .array(
      z.enum([
        'SOC2',
        'GDPR',
        'HIPAA',
        'SOX',
        'NIST',
        'ISO27001',
        'CCPA',
        'PCI_DSS',
        'FEDRAMP',
        'CJIS',
        'ITAR',
      ]),
    )
    .default([]),
  dataClassification: z
    .enum(['public', 'internal', 'confidential', 'restricted', 'top_secret'])
    .optional(),
  retentionPeriodDays: z.number().int().positive().optional(),
  legalHold: z.boolean().optional(),
  gdprLawfulBasis: z.string().optional(),
  hipaaRequirement: z.string().optional(),

  // Performance metrics
  duration: z.number().nonnegative().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  redacted: z.boolean().optional(),
});

/**
 * Input schema for creating audit events (minimal required fields)
 */
export const AuditEventInputSchema = AuditEventSchema.pick({
  eventType: true,
  level: true,
  correlationId: true,
  tenantId: true,
  serviceId: true,
  serviceName: true,
  environment: true,
  action: true,
  outcome: true,
  message: true,
}).extend({
  // Optional fields with defaults
  details: z.record(z.unknown()).default({}),
  complianceRelevant: z.boolean().default(false),
  complianceFrameworks: z.array(z.string()).default([]),
  // All other fields are optional
  ...AuditEventSchema.omit({
    eventType: true,
    level: true,
    correlationId: true,
    tenantId: true,
    serviceId: true,
    serviceName: true,
    environment: true,
    action: true,
    outcome: true,
    message: true,
    details: true,
    complianceRelevant: true,
    complianceFrameworks: true,
  }).shape,
});

export type AuditEventInput = z.infer<typeof AuditEventInputSchema>;

// ============================================================================
// Hash Chain Types
// ============================================================================

/**
 * Hash chain entry for tamper-evident audit trail
 */
export interface HashChainEntry {
  /** Sequential number in the chain */
  sequence: bigint;
  /** Timestamp of entry */
  timestamp: Date;
  /** SHA-256 hash of the audit event */
  eventHash: string;
  /** Hash of the previous entry */
  previousHash: string;
  /** Combined chain hash: H(eventHash + previousHash + sequence) */
  chainHash: string;
  /** HMAC signature of the chain entry */
  signature?: string;
  /** Audit event ID */
  eventId: string;
}

/**
 * Merkle tree checkpoint for efficient verification
 */
export interface MerkleCheckpoint {
  /** Checkpoint ID */
  id: string;
  /** Starting sequence number */
  startSequence: bigint;
  /** Ending sequence number */
  endSequence: bigint;
  /** Timestamp of checkpoint creation */
  timestamp: Date;
  /** Number of events in checkpoint */
  eventCount: number;
  /** Merkle root hash */
  merkleRoot: string;
  /** Digital signature of checkpoint */
  signature: string;
  /** Public key ID used for signing */
  publicKeyId: string;
}

// ============================================================================
// Query & Report Types
// ============================================================================

/**
 * Query interface for filtering audit events
 */
export interface AuditQuery {
  // Time range
  startTime?: Date;
  endTime?: Date;

  // Event filters
  eventTypes?: string[];
  levels?: AuditLevel[];
  outcomes?: AuditOutcome[];
  criticalCategories?: CriticalEventCategory[];

  // Actor filters
  userIds?: string[];
  tenantIds?: string[];
  serviceIds?: string[];
  organizationIds?: string[];

  // Resource filters
  resourceTypes?: string[];
  resourceIds?: string[];

  // Context filters
  correlationIds?: string[];
  sessionIds?: string[];
  requestIds?: string[];

  // Compliance filters
  complianceFrameworks?: ComplianceFramework[];
  complianceRelevant?: boolean;
  dataClassifications?: DataClassification[];
  legalHold?: boolean;

  // Full-text search
  searchQuery?: string;
  tags?: string[];

  // Pagination
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: 'timestamp' | 'level' | 'eventType' | 'sequenceNumber';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated query result
 */
export interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  cursor?: string;
  hasMore: boolean;
}

/**
 * Audit report export format
 */
export interface AuditExportReport {
  /** Report ID */
  id: string;
  /** Report generation timestamp */
  generatedAt: Date;
  /** User who generated the report */
  generatedBy: string;
  /** Time period covered */
  period: {
    start: Date;
    end: Date;
  };
  /** Query parameters used */
  query: AuditQuery;
  /** Number of events included */
  eventCount: number;
  /** Report format */
  format: 'json' | 'csv' | 'pdf';
  /** Data hash for integrity */
  dataHash: string;
  /** Signature */
  signature: string;
  /** Events (may be omitted if stored separately) */
  events?: AuditEvent[];
}

// ============================================================================
// Integrity Verification Types
// ============================================================================

/**
 * Result of integrity verification
 */
export interface IntegrityVerificationResult {
  /** Overall validity */
  valid: boolean;
  /** Verification timestamp */
  verifiedAt: Date;
  /** User who performed verification */
  verifiedBy?: string;
  /** Time range verified */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** Summary statistics */
  summary: {
    totalEvents: number;
    validEvents: number;
    invalidEvents: number;
    hashChainValid: boolean;
    merkleRootValid: boolean;
    signaturesValid: boolean;
  };
  /** List of issues found */
  issues: IntegrityIssue[];
  /** Chain verification details */
  chainVerification: {
    startHash: string;
    endHash: string;
    chainIntact: boolean;
    brokenLinks: BrokenLink[];
  };
}

/**
 * Integrity issue details
 */
export interface IntegrityIssue {
  /** Event ID with issue */
  eventId: string;
  /** Sequence number */
  sequenceNumber: bigint;
  /** Timestamp */
  timestamp: Date;
  /** Type of issue */
  issueType:
    | 'hash_mismatch'
    | 'signature_invalid'
    | 'chain_broken'
    | 'missing_event'
    | 'duplicate_sequence'
    | 'timestamp_anomaly';
  /** Description */
  description: string;
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
}

/**
 * Broken link in hash chain
 */
export interface BrokenLink {
  /** Event ID */
  eventId: string;
  /** Sequence number */
  sequenceNumber: bigint;
  /** Expected previous hash */
  expectedHash: string;
  /** Actual previous hash */
  actualHash: string;
}

// ============================================================================
// Redaction Types
// ============================================================================

/**
 * Redaction request for RTBF compliance
 */
export interface RedactionRequest {
  /** Request ID */
  id: string;
  /** Requester user ID */
  requesterId: string;
  /** Tenant ID */
  tenantId: string;
  /** Subject user ID (whose data to redact) */
  subjectUserId: string;
  /** Reason for redaction */
  reason: string;
  /** Legal basis */
  legalBasis: string;
  /** Verification ID (e.g., ticket number) */
  verificationId?: string;
  /** Fields to redact */
  fieldsToRedact: string[];
  /** Request timestamp */
  requestedAt: Date;
  /** Approval status */
  status: 'pending' | 'approved' | 'denied' | 'executed';
  /** Approver ID */
  approvedBy?: string;
  /** Approval timestamp */
  approvedAt?: Date;
  /** Execution timestamp */
  executedAt?: Date;
}

/**
 * Redaction tombstone (replaces redacted event data)
 */
export interface RedactionTombstone {
  /** Original event ID */
  eventId: string;
  /** Redaction request ID */
  redactionRequestId: string;
  /** Fields that were redacted */
  redactedFields: string[];
  /** Redaction timestamp */
  redactedAt: Date;
  /** Hash of original data (for integrity) */
  originalHash: string;
  /** Reason for redaction */
  reason: string;
  /** Legal basis */
  legalBasis: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Audit Black Box Service configuration
 */
export interface BlackBoxServiceConfig {
  // Database connections
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };

  // Security
  signingKey: string;
  encryptionKey?: string;
  signatureAlgorithm: 'HMAC-SHA256' | 'HMAC-SHA512' | 'RSA-SHA256';
  publicKeyId?: string;

  // Retention
  defaultRetentionDays: number;
  complianceRetentionDays: number;
  maxRetentionDays: number;

  // Performance
  batchSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
  compressionEnabled: boolean;

  // Features
  realTimeAlerting: boolean;
  writeOnceFileEnabled: boolean;
  writeOnceFilePath?: string;
  anomalyDetectionEnabled: boolean;
  merkleCheckpointInterval: number;

  // API
  apiPort: number;
  apiHost: string;
  corsOrigins: string[];

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  slowQueryThresholdMs: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<BlackBoxServiceConfig> = {
  signatureAlgorithm: 'HMAC-SHA256',
  defaultRetentionDays: 365,
  complianceRetentionDays: 2555, // 7 years
  maxRetentionDays: 3650, // 10 years
  batchSize: 100,
  flushIntervalMs: 5000,
  maxBufferSize: 10000,
  compressionEnabled: true,
  realTimeAlerting: true,
  writeOnceFileEnabled: false,
  anomalyDetectionEnabled: true,
  merkleCheckpointInterval: 1000,
  apiPort: 4001,
  apiHost: '0.0.0.0',
  corsOrigins: [],
  logLevel: 'info',
  slowQueryThresholdMs: 1000,
};
