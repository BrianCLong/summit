"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.AuditEventInputSchema = exports.AuditEventSchema = exports.GeolocationSchema = exports.AuditOutcome = exports.ResourceType = exports.DataClassification = exports.ComplianceFramework = exports.AuditLevel = exports.AuditEventType = exports.CriticalEventCategory = void 0;
const zod_1 = require("zod");
// ============================================================================
// Critical Event Categories
// ============================================================================
/**
 * Critical event categories that require mandatory audit logging
 * These events must always be captured regardless of system load
 */
exports.CriticalEventCategory = {
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
};
// ============================================================================
// Audit Event Types
// ============================================================================
/**
 * Comprehensive audit event types covering all system operations
 */
exports.AuditEventType = {
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
};
// ============================================================================
// Severity Levels
// ============================================================================
exports.AuditLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical',
};
// ============================================================================
// Compliance Frameworks
// ============================================================================
exports.ComplianceFramework = {
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
};
// ============================================================================
// Data Classification
// ============================================================================
exports.DataClassification = {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted',
    TOP_SECRET: 'top_secret',
};
// ============================================================================
// Resource Types
// ============================================================================
exports.ResourceType = {
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
};
// ============================================================================
// Outcome Types
// ============================================================================
exports.AuditOutcome = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    PARTIAL: 'partial',
    PENDING: 'pending',
    DENIED: 'denied',
};
// ============================================================================
// Zod Validation Schemas
// ============================================================================
/**
 * Geolocation schema
 */
exports.GeolocationSchema = zod_1.z.object({
    country: zod_1.z.string().optional(),
    countryCode: zod_1.z.string().max(3).optional(),
    region: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    timezone: zod_1.z.string().optional(),
});
/**
 * Comprehensive audit event validation schema
 */
exports.AuditEventSchema = zod_1.z.object({
    // Core identification
    id: zod_1.z.string().uuid().optional(),
    eventType: zod_1.z.string().min(1),
    level: zod_1.z.enum(['debug', 'info', 'warn', 'error', 'critical']),
    timestamp: zod_1.z.coerce.date().optional(),
    version: zod_1.z.string().default('1.0.0'),
    // Context & correlation (correlationId is required)
    correlationId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid().optional(),
    requestId: zod_1.z.string().uuid().optional(),
    parentEventId: zod_1.z.string().uuid().optional(),
    traceId: zod_1.z.string().optional(),
    spanId: zod_1.z.string().optional(),
    // Actors
    userId: zod_1.z.string().optional(),
    userName: zod_1.z.string().optional(),
    userEmail: zod_1.z.string().email().optional(),
    impersonatedBy: zod_1.z.string().optional(),
    serviceAccountId: zod_1.z.string().optional(),
    tenantId: zod_1.z.string().min(1),
    organizationId: zod_1.z.string().optional(),
    // Service context
    serviceId: zod_1.z.string().min(1),
    serviceName: zod_1.z.string().min(1),
    serviceVersion: zod_1.z.string().optional(),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    hostId: zod_1.z.string().optional(),
    // Resource context
    resourceType: zod_1.z.string().optional(),
    resourceId: zod_1.z.string().optional(),
    resourceIds: zod_1.z.array(zod_1.z.string()).optional(),
    resourcePath: zod_1.z.string().optional(),
    resourceName: zod_1.z.string().optional(),
    // Action details
    criticalCategory: zod_1.z
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
    action: zod_1.z.string().min(1),
    outcome: zod_1.z.enum(['success', 'failure', 'partial', 'pending', 'denied']),
    message: zod_1.z.string().min(1),
    details: zod_1.z.record(zod_1.z.unknown()).default({}),
    // Mutation tracking
    oldValues: zod_1.z.record(zod_1.z.unknown()).optional(),
    newValues: zod_1.z.record(zod_1.z.unknown()).optional(),
    diffSummary: zod_1.z.string().optional(),
    // Security context
    ipAddress: zod_1.z.string().ip().optional(),
    ipAddressV6: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    geolocation: exports.GeolocationSchema.optional(),
    deviceFingerprint: zod_1.z.string().optional(),
    // Compliance fields
    complianceRelevant: zod_1.z.boolean().default(false),
    complianceFrameworks: zod_1.z
        .array(zod_1.z.enum([
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
    ]))
        .default([]),
    dataClassification: zod_1.z
        .enum(['public', 'internal', 'confidential', 'restricted', 'top_secret'])
        .optional(),
    retentionPeriodDays: zod_1.z.number().int().positive().optional(),
    legalHold: zod_1.z.boolean().optional(),
    gdprLawfulBasis: zod_1.z.string().optional(),
    hipaaRequirement: zod_1.z.string().optional(),
    // Performance metrics
    duration: zod_1.z.number().nonnegative().optional(),
    errorCode: zod_1.z.string().optional(),
    errorMessage: zod_1.z.string().optional(),
    stackTrace: zod_1.z.string().optional(),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    redacted: zod_1.z.boolean().optional(),
});
/**
 * Input schema for creating audit events (minimal required fields)
 */
exports.AuditEventInputSchema = exports.AuditEventSchema.pick({
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
    details: zod_1.z.record(zod_1.z.unknown()).default({}),
    complianceRelevant: zod_1.z.boolean().default(false),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).default([]),
    // All other fields are optional
    ...exports.AuditEventSchema.omit({
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
/**
 * Default configuration values
 */
exports.DEFAULT_CONFIG = {
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
