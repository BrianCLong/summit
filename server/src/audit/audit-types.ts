/**
 * Comprehensive Audit Event Schema
 *
 * Design Goals:
 * - Immutable audit trail with cryptographic integrity
 * - SOC 2, GDPR, HIPAA, and ISO 27001 compliance
 * - TimescaleDB hypertable partitioning for performance
 * - HMAC signatures for tamper detection
 * - Before/after state tracking for all mutations
 * - Write-once file append support
 * - Multi-tenant isolation
 * - Forensic analysis capabilities
 */

import { z } from 'zod';

/**
 * Comprehensive audit event types covering all system operations
 */
export type AuditEventType =
  // System lifecycle
  | 'system_start'
  | 'system_stop'
  | 'system_error'
  | 'config_change'

  // Authentication & Authorization
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_deleted'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'password_change'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_created'
  | 'session_expired'
  | 'session_revoked'
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_assigned'
  | 'role_removed'
  | 'access_denied'

  // Resource operations (CRUD)
  | 'resource_create'
  | 'resource_read'
  | 'resource_update'
  | 'resource_delete'
  | 'resource_restore'
  | 'resource_export'
  | 'resource_import'

  // Investigation operations
  | 'investigation_create'
  | 'investigation_view'
  | 'investigation_update'
  | 'investigation_delete'
  | 'investigation_share'
  | 'investigation_unshare'
  | 'investigation_archive'

  // Entity operations
  | 'entity_create'
  | 'entity_view'
  | 'entity_update'
  | 'entity_delete'
  | 'entity_merge'
  | 'entity_split'

  // Relationship operations
  | 'relationship_create'
  | 'relationship_view'
  | 'relationship_update'
  | 'relationship_delete'

  // Graph operations
  | 'graph_query'
  | 'graph_export'
  | 'graph_import'
  | 'graph_analysis'

  // AI/ML operations
  | 'ai_extraction_start'
  | 'ai_extraction_complete'
  | 'ai_extraction_fail'
  | 'ai_inference_request'
  | 'ai_model_update'

  // Data operations
  | 'data_export'
  | 'data_import'
  | 'data_deletion'
  | 'data_anonymization'
  | 'data_breach'
  | 'data_access_bulk'

  // Compliance & Policy
  | 'policy_decision'
  | 'policy_violation'
  | 'compliance_check'
  | 'compliance_violation'
  | 'approval_request'
  | 'approval_granted'
  | 'approval_denied'

  // Security events
  | 'security_alert'
  | 'anomaly_detected'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'brute_force_detected'
  | 'malware_detected'

  // Backup & Recovery
  | 'backup_start'
  | 'backup_complete'
  | 'backup_fail'
  | 'restore_start'
  | 'restore_complete'
  | 'restore_fail'

  // Audit integrity
  | 'audit_integrity_check'
  | 'audit_tamper_detected'
  | 'audit_export';

/**
 * Audit event severity levels
 */
export type AuditLevel =
  | 'debug'     // Verbose logging for development
  | 'info'      // Normal operations
  | 'warn'      // Warning conditions
  | 'error'     // Error conditions
  | 'critical'; // Critical events requiring immediate attention

/**
 * Compliance frameworks supported
 */
export type ComplianceFramework =
  | 'SOC2'      // SOC 2 Type I & II
  | 'GDPR'      // General Data Protection Regulation
  | 'HIPAA'     // Health Insurance Portability and Accountability Act
  | 'SOX'       // Sarbanes-Oxley Act
  | 'NIST'      // NIST Cybersecurity Framework
  | 'ISO27001'  // ISO/IEC 27001
  | 'CCPA'      // California Consumer Privacy Act
  | 'PCI_DSS';  // Payment Card Industry Data Security Standard

/**
 * Data classification levels for compliance
 */
export type DataClassification =
  | 'public'        // Publicly available data
  | 'internal'      // Internal use only
  | 'confidential'  // Confidential business data
  | 'restricted'    // Highly sensitive data (PII, PHI, financial)
  | 'top_secret';   // Maximum security classification

/**
 * Resource types in the system
 */
export type ResourceType =
  | 'investigation'
  | 'entity'
  | 'relationship'
  | 'user'
  | 'tenant'
  | 'document'
  | 'graph'
  | 'ai_model'
  | 'backup'
  | 'config'
  | 'api_key'
  | 'webhook';

/**
 * Comprehensive audit event interface
 *
 * This interface extends the basic AdvancedAuditSystem design
 * with additional fields for comprehensive compliance and forensics
 */
export interface AuditEvent {
  // === Core Identification ===
  id: string;                           // UUID v4
  eventType: AuditEventType;
  level: AuditLevel;
  timestamp: Date;                      // ISO 8601 UTC timestamp
  version: string;                      // Schema version for evolution

  // === Context & Correlation ===
  correlationId: string;                // Groups related events
  sessionId?: string;                   // User session ID
  requestId?: string;                   // HTTP request ID
  parentEventId?: string;               // For event hierarchies
  traceId?: string;                     // Distributed tracing ID
  spanId?: string;                      // Distributed tracing span ID

  // === Actors ===
  userId?: string;                      // Primary user ID
  impersonatedBy?: string;              // If user is impersonated
  serviceAccountId?: string;            // If automated
  tenantId: string;                     // Multi-tenant isolation
  organizationId?: string;              // Organization context

  // === Service Context ===
  serviceId: string;                    // Service that generated event
  serviceName: string;                  // Human-readable service name
  serviceVersion?: string;              // Service version
  environment: 'development' | 'staging' | 'production';

  // === Resource Context ===
  resourceType?: ResourceType;
  resourceId?: string;                  // Primary resource identifier
  resourceIds?: string[];               // For bulk operations
  resourcePath?: string;                // API path or file path
  resourceName?: string;                // Human-readable resource name

  // === Action Details ===
  action: string;                       // Short action description
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  message: string;                      // Human-readable message
  details: Record<string, any>;         // Structured event details

  // === Mutation Tracking (Before/After States) ===
  oldValues?: Record<string, any>;      // State before mutation
  newValues?: Record<string, any>;      // State after mutation
  diffSummary?: string;                 // Human-readable diff

  // === Security Context ===
  ipAddress?: string;                   // Client IP address
  ipAddressV6?: string;                 // IPv6 address
  userAgent?: string;                   // Client user agent
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];     // [longitude, latitude]
  };
  deviceFingerprint?: string;           // Device identification

  // === Compliance Fields ===
  complianceRelevant: boolean;          // Flag for compliance events
  complianceFrameworks: ComplianceFramework[];
  dataClassification?: DataClassification;
  retentionPeriodDays?: number;         // Retention override
  legalHold?: boolean;                  // Legal hold flag
  gdprLawfulBasis?: string;             // GDPR Article 6 basis
  hipaaRequirement?: string;            // HIPAA requirement reference

  // === Cryptographic Integrity ===
  hash?: string;                        // SHA-256 hash of event
  signature?: string;                   // HMAC-SHA256 signature
  previousEventHash?: string;           // Hash chain link
  signatureAlgorithm?: string;          // e.g., "HMAC-SHA256"
  publicKeyId?: string;                 // For public key verification

  // === Performance Metrics ===
  duration?: number;                    // Operation duration in ms
  errorCode?: string;                   // Error code if failed
  errorMessage?: string;                // Error message if failed
  stackTrace?: string;                  // Stack trace (sanitized)

  // === Metadata ===
  tags?: string[];                      // Searchable tags
  metadata?: Record<string, any>;       // Additional metadata
  redacted?: boolean;                   // If PII was redacted

  // === Audit Metadata ===
  createdAt?: Date;                     // Database insertion time
  sequenceNumber?: bigint;              // Sequential numbering
  partition?: string;                   // TimescaleDB partition
}

/**
 * Validation schema for audit events using Zod
 */
export const AuditEventSchema = z.object({
  eventType: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  timestamp: z.date().optional(),
  version: z.string().default('1.0.0'),

  // Context
  correlationId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  parentEventId: z.string().uuid().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),

  // Actors
  userId: z.string().optional(),
  impersonatedBy: z.string().optional(),
  serviceAccountId: z.string().optional(),
  tenantId: z.string(),
  organizationId: z.string().optional(),

  // Service
  serviceId: z.string(),
  serviceName: z.string(),
  serviceVersion: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']),

  // Resource
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
  resourcePath: z.string().optional(),
  resourceName: z.string().optional(),

  // Action
  action: z.string(),
  outcome: z.enum(['success', 'failure', 'partial', 'pending']),
  message: z.string(),
  details: z.record(z.any()).default({}),

  // Mutations
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  diffSummary: z.string().optional(),

  // Security
  ipAddress: z.string().optional(),
  ipAddressV6: z.string().optional(),
  userAgent: z.string().optional(),
  geolocation: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
  }).optional(),
  deviceFingerprint: z.string().optional(),

  // Compliance
  complianceRelevant: z.boolean(),
  complianceFrameworks: z.array(z.string()),
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).optional(),
  retentionPeriodDays: z.number().optional(),
  legalHold: z.boolean().optional(),
  gdprLawfulBasis: z.string().optional(),
  hipaaRequirement: z.string().optional(),

  // Performance
  duration: z.number().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  redacted: z.boolean().optional(),
});

/**
 * Query interface for filtering audit events
 */
export interface AuditQuery {
  // Time range
  startTime?: Date;
  endTime?: Date;

  // Event filters
  eventTypes?: AuditEventType[];
  levels?: AuditLevel[];
  outcomes?: ('success' | 'failure' | 'partial' | 'pending')[];

  // Actor filters
  userIds?: string[];
  tenantIds?: string[];
  serviceIds?: string[];

  // Resource filters
  resourceTypes?: ResourceType[];
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
  sortBy?: 'timestamp' | 'level' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Compliance report interface
 */
export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  generatedBy: string;

  summary: {
    totalEvents: number;
    criticalEvents: number;
    violations: number;
    complianceScore: number;  // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };

  violations: Array<{
    eventId: string;
    violationType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
    controlId?: string;       // SOC2 control ID, etc.
    timestamp: Date;
  }>;

  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;

  controlsAssessed: Array<{
    controlId: string;
    controlName: string;
    status: 'passed' | 'failed' | 'not_applicable';
    evidence: string[];
  }>;
}

/**
 * Forensic analysis interface for incident investigation
 */
export interface ForensicAnalysis {
  id: string;
  correlationId: string;
  investigatorId: string;
  startedAt: Date;
  completedAt?: Date;

  timeline: AuditEvent[];

  actors: Array<{
    userId: string;
    email?: string;
    actionsCount: number;
    riskScore: number;      // 0-100
    suspiciousActions: number;
    firstSeen: Date;
    lastSeen: Date;
    ipAddresses: string[];
    userAgents: string[];
  }>;

  resources: Array<{
    resourceId: string;
    resourceType: ResourceType;
    resourceName?: string;
    accessCount: number;
    modificationCount: number;
    lastAccessed: Date;
    dataClassification?: DataClassification;
  }>;

  anomalies: Array<{
    type: string;
    description: string;
    severity: number;       // 0-100
    confidence: number;     // 0-100
    events: string[];       // Event IDs
    detectedAt: Date;
  }>;

  summary: {
    eventCount: number;
    timeSpan: number;       // milliseconds
    uniqueActors: number;
    uniqueResources: number;
    anomalyCount: number;
    overallRiskScore: number;
  };

  findings: string;
  recommendations: string[];
}

/**
 * Integrity verification result
 */
export interface IntegrityVerification {
  verifiedAt: Date;
  verifiedBy?: string;
  timeRange: {
    start: Date;
    end: Date;
  };

  summary: {
    totalEvents: number;
    validEvents: number;
    invalidEvents: number;
    hashChainValid: boolean;
    overallValid: boolean;
  };

  issues: Array<{
    eventId: string;
    timestamp: Date;
    issueType: 'hash_mismatch' | 'signature_invalid' | 'chain_broken' | 'missing_event';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;

  chainVerification: {
    startHash: string;
    endHash: string;
    chainIntact: boolean;
    brokenLinks: Array<{
      eventId: string;
      expectedHash: string;
      actualHash: string;
    }>;
  };
}

/**
 * Audit service configuration
 */
export interface AuditServiceConfig {
  // Database
  postgresPool: any;        // pg.Pool
  redisClient?: any;        // Redis

  // Security
  signingKey: string;       // HMAC signing key
  encryptionKey?: string;   // Optional encryption key
  signatureAlgorithm: 'HMAC-SHA256' | 'HMAC-SHA512' | 'RSA-SHA256';

  // Retention
  defaultRetentionDays: number;
  complianceRetentionDays: number;  // For compliance-relevant events

  // Performance
  batchSize: number;
  flushIntervalMs: number;
  compressionEnabled: boolean;

  // Features
  realTimeAlerting: boolean;
  writeOnceFileEnabled: boolean;
  writeOnceFilePath?: string;
  anomalyDetectionEnabled: boolean;

  // Logging
  logger: any;              // pino.Logger
  slowQueryThresholdMs?: number;
}

/**
 * Write-once file entry format
 *
 * For append-only audit trail in file system
 */
export interface WriteOnceEntry {
  sequenceNumber: bigint;
  timestamp: string;        // ISO 8601
  eventId: string;
  eventType: string;
  hash: string;
  signature: string;
  previousHash: string;
  data: string;            // Base64 encoded event JSON
  checksum: string;        // CRC32 or SHA-256
}
