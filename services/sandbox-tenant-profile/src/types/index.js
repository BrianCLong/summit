"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxErrorCode = exports.SandboxUsageMetricsSchema = exports.PromotionRequestSchema = exports.LinkbackAttemptSchema = exports.UpdateSandboxRequestSchema = exports.CreateSandboxRequestSchema = exports.SandboxTenantProfileSchema = exports.IntegrationRestrictionsSchema = exports.AuditConfigSchema = exports.UIIndicatorConfigSchema = exports.DataAccessPolicySchema = exports.ConnectorRestrictionSchema = exports.SandboxResourceQuotaSchema = exports.PromotionStatus = exports.SandboxStatus = exports.SandboxIndicatorMode = exports.ConnectorType = exports.DataAccessMode = exports.SandboxIsolationLevel = exports.TenantType = void 0;
exports.validateSandboxProfile = validateSandboxProfile;
exports.validateCreateRequest = validateCreateRequest;
exports.validatePromotionRequest = validatePromotionRequest;
exports.isSandboxTenant = isSandboxTenant;
exports.getDefaultConnectorRestrictions = getDefaultConnectorRestrictions;
const zod_1 = require("zod");
/**
 * Sandbox Tenant Profile Types
 *
 * Defines the complete type system for sandbox tenants, ensuring
 * strict isolation from production environments.
 */
// ============================================================================
// Enums and Constants
// ============================================================================
/**
 * Tenant types supported by the platform
 */
var TenantType;
(function (TenantType) {
    TenantType["PRODUCTION"] = "production";
    TenantType["SANDBOX"] = "sandbox";
    TenantType["DATALAB"] = "datalab";
    TenantType["STAGING"] = "staging";
})(TenantType || (exports.TenantType = TenantType = {}));
/**
 * Sandbox isolation levels determining security boundaries
 */
var SandboxIsolationLevel;
(function (SandboxIsolationLevel) {
    SandboxIsolationLevel["STANDARD"] = "standard";
    SandboxIsolationLevel["ENHANCED"] = "enhanced";
    SandboxIsolationLevel["AIRGAPPED"] = "airgapped";
    SandboxIsolationLevel["RESEARCH"] = "research";
})(SandboxIsolationLevel || (exports.SandboxIsolationLevel = SandboxIsolationLevel = {}));
/**
 * Data access modes for sandbox environments
 */
var DataAccessMode;
(function (DataAccessMode) {
    DataAccessMode["SYNTHETIC_ONLY"] = "synthetic_only";
    DataAccessMode["ANONYMIZED"] = "anonymized";
    DataAccessMode["SAMPLED"] = "sampled";
    DataAccessMode["STRUCTURE_ONLY"] = "structure_only";
})(DataAccessMode || (exports.DataAccessMode = DataAccessMode = {}));
/**
 * Connector types that can be restricted in sandbox
 */
var ConnectorType;
(function (ConnectorType) {
    ConnectorType["DATABASE"] = "database";
    ConnectorType["API"] = "api";
    ConnectorType["FILE_SYSTEM"] = "file_system";
    ConnectorType["STREAMING"] = "streaming";
    ConnectorType["EXTERNAL_SERVICE"] = "external_service";
    ConnectorType["FEDERATION"] = "federation";
})(ConnectorType || (exports.ConnectorType = ConnectorType = {}));
/**
 * Visual indicator modes for sandbox UI
 */
var SandboxIndicatorMode;
(function (SandboxIndicatorMode) {
    SandboxIndicatorMode["BANNER"] = "banner";
    SandboxIndicatorMode["WATERMARK"] = "watermark";
    SandboxIndicatorMode["BADGE"] = "badge";
    SandboxIndicatorMode["FULL"] = "full";
})(SandboxIndicatorMode || (exports.SandboxIndicatorMode = SandboxIndicatorMode = {}));
/**
 * Sandbox lifecycle states
 */
var SandboxStatus;
(function (SandboxStatus) {
    SandboxStatus["PROVISIONING"] = "provisioning";
    SandboxStatus["ACTIVE"] = "active";
    SandboxStatus["SUSPENDED"] = "suspended";
    SandboxStatus["EXPIRED"] = "expired";
    SandboxStatus["ARCHIVED"] = "archived";
    SandboxStatus["TERMINATED"] = "terminated";
})(SandboxStatus || (exports.SandboxStatus = SandboxStatus = {}));
/**
 * Promotion workflow states
 */
var PromotionStatus;
(function (PromotionStatus) {
    PromotionStatus["DRAFT"] = "draft";
    PromotionStatus["PENDING_REVIEW"] = "pending_review";
    PromotionStatus["UNDER_REVIEW"] = "under_review";
    PromotionStatus["APPROVED"] = "approved";
    PromotionStatus["REJECTED"] = "rejected";
    PromotionStatus["PROMOTED"] = "promoted";
    PromotionStatus["ROLLED_BACK"] = "rolled_back";
})(PromotionStatus || (exports.PromotionStatus = PromotionStatus = {}));
// ============================================================================
// Zod Schemas
// ============================================================================
/**
 * Resource quotas for sandbox environments
 */
exports.SandboxResourceQuotaSchema = zod_1.z.object({
    maxCpuMs: zod_1.z.number().min(100).max(300000).default(30000),
    maxMemoryMb: zod_1.z.number().min(64).max(4096).default(512),
    maxStorageGb: zod_1.z.number().min(0.1).max(100).default(5),
    maxExecutionsPerHour: zod_1.z.number().min(1).max(10000).default(100),
    maxConcurrentSandboxes: zod_1.z.number().min(1).max(100).default(5),
    maxDataExportMb: zod_1.z.number().min(0).max(1024).default(0), // 0 = disabled
    maxNetworkBytesPerHour: zod_1.z.number().min(0).max(1073741824).default(0), // 0 = disabled
});
/**
 * Connector restrictions for sandbox
 */
exports.ConnectorRestrictionSchema = zod_1.z.object({
    connectorType: zod_1.z.nativeEnum(ConnectorType),
    allowed: zod_1.z.boolean().default(false),
    allowlist: zod_1.z.array(zod_1.z.string()).default([]),
    blocklist: zod_1.z.array(zod_1.z.string()).default([]),
    requireApproval: zod_1.z.boolean().default(true),
    auditAllAccess: zod_1.z.boolean().default(true),
});
/**
 * Data access policy for sandbox
 */
exports.DataAccessPolicySchema = zod_1.z.object({
    mode: zod_1.z.nativeEnum(DataAccessMode).default(DataAccessMode.SYNTHETIC_ONLY),
    maxRecords: zod_1.z.number().min(0).max(1000000).default(10000),
    allowedEntityTypes: zod_1.z.array(zod_1.z.string()).default([]),
    blockedEntityTypes: zod_1.z.array(zod_1.z.string()).default([]),
    piiHandling: zod_1.z.enum(['block', 'redact', 'hash', 'synthetic']).default('block'),
    allowLinkbackToProduction: zod_1.z.boolean().default(false),
    requireAnonymizationAudit: zod_1.z.boolean().default(true),
    retentionDays: zod_1.z.number().min(1).max(365).default(30),
});
/**
 * UI indicator configuration
 */
exports.UIIndicatorConfigSchema = zod_1.z.object({
    mode: zod_1.z.nativeEnum(SandboxIndicatorMode).default(SandboxIndicatorMode.FULL),
    bannerText: zod_1.z.string().default('SANDBOX ENVIRONMENT - NOT PRODUCTION'),
    bannerColor: zod_1.z.string().default('#FF6B35'),
    watermarkText: zod_1.z.string().default('SANDBOX'),
    watermarkOpacity: zod_1.z.number().min(0.05).max(0.5).default(0.1),
    showDataSourceWarning: zod_1.z.boolean().default(true),
    confirmBeforeExport: zod_1.z.boolean().default(true),
});
/**
 * Audit configuration for sandbox
 */
exports.AuditConfigSchema = zod_1.z.object({
    logAllQueries: zod_1.z.boolean().default(true),
    logAllMutations: zod_1.z.boolean().default(true),
    logDataAccess: zod_1.z.boolean().default(true),
    logExportAttempts: zod_1.z.boolean().default(true),
    logLinkbackAttempts: zod_1.z.boolean().default(true),
    alertOnSuspiciousActivity: zod_1.z.boolean().default(true),
    retainAuditLogsDays: zod_1.z.number().min(30).max(2555).default(90),
    exportAuditFormat: zod_1.z.enum(['json', 'csv', 'parquet']).default('json'),
});
/**
 * Integration restrictions
 */
exports.IntegrationRestrictionsSchema = zod_1.z.object({
    allowFederation: zod_1.z.boolean().default(false),
    allowExternalExports: zod_1.z.boolean().default(false),
    allowWebhooks: zod_1.z.boolean().default(false),
    allowApiKeys: zod_1.z.boolean().default(false),
    allowedIntegrations: zod_1.z.array(zod_1.z.string()).default([]),
    blockedIntegrations: zod_1.z.array(zod_1.z.string()).default(['*']),
    maxExternalCalls: zod_1.z.number().min(0).max(1000).default(0),
});
/**
 * Complete Sandbox Tenant Profile configuration
 */
exports.SandboxTenantProfileSchema = zod_1.z.object({
    // Identity
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    tenantType: zod_1.z.nativeEnum(TenantType).default(TenantType.SANDBOX),
    // Ownership and access
    parentTenantId: zod_1.z.string().uuid().optional(), // Production tenant this sandbox is associated with
    ownerId: zod_1.z.string(),
    teamIds: zod_1.z.array(zod_1.z.string()).default([]),
    allowedUserIds: zod_1.z.array(zod_1.z.string()).default([]),
    // Isolation configuration
    isolationLevel: zod_1.z.nativeEnum(SandboxIsolationLevel).default(SandboxIsolationLevel.ENHANCED),
    // Resource management
    resourceQuotas: exports.SandboxResourceQuotaSchema.default({}),
    // Data access
    dataAccessPolicy: exports.DataAccessPolicySchema.default({}),
    // Connector restrictions
    connectorRestrictions: zod_1.z.array(exports.ConnectorRestrictionSchema).default([
        { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
        { connectorType: ConnectorType.API, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
        { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
        { connectorType: ConnectorType.STREAMING, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
        { connectorType: ConnectorType.EXTERNAL_SERVICE, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
        { connectorType: ConnectorType.FEDERATION, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
    ]),
    // UI configuration
    uiIndicators: exports.UIIndicatorConfigSchema.default({}),
    // Audit configuration
    auditConfig: exports.AuditConfigSchema.default({}),
    // Integration restrictions
    integrationRestrictions: exports.IntegrationRestrictionsSchema.default({}),
    // Compliance
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).default([]),
    dataClassification: zod_1.z.enum(['unclassified', 'cui', 'sensitive', 'regulated']).default('unclassified'),
    // Lifecycle
    status: zod_1.z.nativeEnum(SandboxStatus).default(SandboxStatus.PROVISIONING),
    createdAt: zod_1.z.date().default(() => new Date()),
    updatedAt: zod_1.z.date().default(() => new Date()),
    expiresAt: zod_1.z.date().optional(),
    lastAccessedAt: zod_1.z.date().optional(),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
/**
 * Sandbox creation request
 */
exports.CreateSandboxRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    parentTenantId: zod_1.z.string().uuid().optional(),
    isolationLevel: zod_1.z.nativeEnum(SandboxIsolationLevel).optional(),
    resourceQuotas: exports.SandboxResourceQuotaSchema.partial().optional(),
    dataAccessPolicy: exports.DataAccessPolicySchema.partial().optional(),
    expiresInDays: zod_1.z.number().min(1).max(365).default(30),
    teamIds: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Sandbox update request
 */
exports.UpdateSandboxRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    resourceQuotas: exports.SandboxResourceQuotaSchema.partial().optional(),
    dataAccessPolicy: exports.DataAccessPolicySchema.partial().optional(),
    uiIndicators: exports.UIIndicatorConfigSchema.partial().optional(),
    status: zod_1.z.nativeEnum(SandboxStatus).optional(),
    expiresAt: zod_1.z.date().optional(),
    teamIds: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Linkback attempt log entry
 */
exports.LinkbackAttemptSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sandboxId: zod_1.z.string().uuid(),
    userId: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    sourceType: zod_1.z.enum(['entity', 'relationship', 'investigation', 'query', 'export']),
    sourceId: zod_1.z.string(),
    targetProductionId: zod_1.z.string().optional(),
    blocked: zod_1.z.boolean(),
    reason: zod_1.z.string(),
    riskScore: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
/**
 * Promotion request for lab-to-production
 */
exports.PromotionRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sandboxId: zod_1.z.string().uuid(),
    requesterId: zod_1.z.string(),
    targetTenantId: zod_1.z.string().uuid(),
    // What to promote
    promotionType: zod_1.z.enum(['query', 'workflow', 'script', 'configuration', 'model']),
    artifactId: zod_1.z.string(),
    artifactName: zod_1.z.string(),
    artifactVersion: zod_1.z.string().optional(),
    // Review process
    status: zod_1.z.nativeEnum(PromotionStatus).default(PromotionStatus.DRAFT),
    reviewers: zod_1.z.array(zod_1.z.string()).default([]),
    approvals: zod_1.z.array(zod_1.z.object({
        reviewerId: zod_1.z.string(),
        decision: zod_1.z.enum(['approve', 'reject', 'request_changes']),
        comments: zod_1.z.string().optional(),
        timestamp: zod_1.z.date(),
    })).default([]),
    // Validation results
    validationResults: zod_1.z.object({
        securityScan: zod_1.z.object({ passed: zod_1.z.boolean(), findings: zod_1.z.array(zod_1.z.string()) }).optional(),
        performanceTest: zod_1.z.object({ passed: zod_1.z.boolean(), metrics: zod_1.z.record(zod_1.z.number()) }).optional(),
        complianceCheck: zod_1.z.object({ passed: zod_1.z.boolean(), violations: zod_1.z.array(zod_1.z.string()) }).optional(),
        dataLeakageScan: zod_1.z.object({ passed: zod_1.z.boolean(), risks: zod_1.z.array(zod_1.z.string()) }).optional(),
    }).default({}),
    // Metadata
    justification: zod_1.z.string().min(10).max(2000),
    rollbackPlan: zod_1.z.string().max(2000).optional(),
    createdAt: zod_1.z.date().default(() => new Date()),
    updatedAt: zod_1.z.date().default(() => new Date()),
    promotedAt: zod_1.z.date().optional(),
});
/**
 * Sandbox usage metrics
 */
exports.SandboxUsageMetricsSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    period: zod_1.z.object({
        start: zod_1.z.date(),
        end: zod_1.z.date(),
    }),
    queryCount: zod_1.z.number().default(0),
    mutationCount: zod_1.z.number().default(0),
    dataAccessCount: zod_1.z.number().default(0),
    exportAttempts: zod_1.z.number().default(0),
    linkbackAttempts: zod_1.z.number().default(0),
    cpuTimeMs: zod_1.z.number().default(0),
    memoryPeakMb: zod_1.z.number().default(0),
    storageUsedGb: zod_1.z.number().default(0),
    uniqueUsers: zod_1.z.number().default(0),
    activeSessionMinutes: zod_1.z.number().default(0),
});
// ============================================================================
// Error Types
// ============================================================================
/**
 * Sandbox-specific error codes
 */
var SandboxErrorCode;
(function (SandboxErrorCode) {
    SandboxErrorCode["INVALID_CONFIGURATION"] = "SANDBOX_INVALID_CONFIGURATION";
    SandboxErrorCode["QUOTA_EXCEEDED"] = "SANDBOX_QUOTA_EXCEEDED";
    SandboxErrorCode["ACCESS_DENIED"] = "SANDBOX_ACCESS_DENIED";
    SandboxErrorCode["LINKBACK_BLOCKED"] = "SANDBOX_LINKBACK_BLOCKED";
    SandboxErrorCode["EXPORT_BLOCKED"] = "SANDBOX_EXPORT_BLOCKED";
    SandboxErrorCode["CONNECTOR_BLOCKED"] = "SANDBOX_CONNECTOR_BLOCKED";
    SandboxErrorCode["FEDERATION_BLOCKED"] = "SANDBOX_FEDERATION_BLOCKED";
    SandboxErrorCode["PII_DETECTED"] = "SANDBOX_PII_DETECTED";
    SandboxErrorCode["EXPIRED"] = "SANDBOX_EXPIRED";
    SandboxErrorCode["SUSPENDED"] = "SANDBOX_SUSPENDED";
    SandboxErrorCode["PROMOTION_FAILED"] = "SANDBOX_PROMOTION_FAILED";
})(SandboxErrorCode || (exports.SandboxErrorCode = SandboxErrorCode = {}));
// ============================================================================
// Validation Helpers
// ============================================================================
/**
 * Validate a sandbox tenant profile
 */
function validateSandboxProfile(profile) {
    return exports.SandboxTenantProfileSchema.parse(profile);
}
/**
 * Validate a create sandbox request
 */
function validateCreateRequest(request) {
    return exports.CreateSandboxRequestSchema.parse(request);
}
/**
 * Validate a promotion request
 */
function validatePromotionRequest(request) {
    return exports.PromotionRequestSchema.parse(request);
}
/**
 * Check if tenant type is sandbox
 */
function isSandboxTenant(tenantType) {
    return tenantType === TenantType.SANDBOX || tenantType === TenantType.DATALAB;
}
/**
 * Get default connector restrictions for isolation level
 */
function getDefaultConnectorRestrictions(level) {
    const base = [
        { connectorType: ConnectorType.FEDERATION, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
        { connectorType: ConnectorType.EXTERNAL_SERVICE, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
    ];
    switch (level) {
        case SandboxIsolationLevel.AIRGAPPED:
            return [
                ...base,
                { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: ['sandbox-db'], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.API, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
                { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: ['/sandbox/*'], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.STREAMING, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
            ];
        case SandboxIsolationLevel.RESEARCH:
            return [
                ...base,
                { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: [], blocklist: ['production-*'], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.API, allowed: true, allowlist: [], blocklist: ['production-*'], requireApproval: true, auditAllAccess: true },
                { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: [], blocklist: ['/production/*'], requireApproval: true, auditAllAccess: true },
                { connectorType: ConnectorType.STREAMING, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
            ];
        case SandboxIsolationLevel.ENHANCED:
            return [
                ...base,
                { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.API, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
                { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
                { connectorType: ConnectorType.STREAMING, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
            ];
        case SandboxIsolationLevel.STANDARD:
        default:
            return [
                ...base,
                { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.API, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
                { connectorType: ConnectorType.STREAMING, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
            ];
    }
}
