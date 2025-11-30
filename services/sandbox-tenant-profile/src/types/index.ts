import { z } from 'zod';

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
export enum TenantType {
  PRODUCTION = 'production',
  SANDBOX = 'sandbox',
  DATALAB = 'datalab',
  STAGING = 'staging',
}

/**
 * Sandbox isolation levels determining security boundaries
 */
export enum SandboxIsolationLevel {
  STANDARD = 'standard',        // Basic isolation, synthetic data only
  ENHANCED = 'enhanced',        // Network restrictions, audit logging
  AIRGAPPED = 'airgapped',      // No external connectivity
  RESEARCH = 'research',        // Academic/research use, strict anonymization
}

/**
 * Data access modes for sandbox environments
 */
export enum DataAccessMode {
  SYNTHETIC_ONLY = 'synthetic_only',           // Only synthetic/generated data
  ANONYMIZED = 'anonymized',                   // De-identified real data
  SAMPLED = 'sampled',                         // Small sample with anonymization
  STRUCTURE_ONLY = 'structure_only',           // Schema/structure, no actual data
}

/**
 * Connector types that can be restricted in sandbox
 */
export enum ConnectorType {
  DATABASE = 'database',
  API = 'api',
  FILE_SYSTEM = 'file_system',
  STREAMING = 'streaming',
  EXTERNAL_SERVICE = 'external_service',
  FEDERATION = 'federation',
}

/**
 * Visual indicator modes for sandbox UI
 */
export enum SandboxIndicatorMode {
  BANNER = 'banner',           // Top banner warning
  WATERMARK = 'watermark',     // Background watermark
  BADGE = 'badge',             // Corner badge
  FULL = 'full',               // All indicators combined
}

/**
 * Sandbox lifecycle states
 */
export enum SandboxStatus {
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  TERMINATED = 'terminated',
}

/**
 * Promotion workflow states
 */
export enum PromotionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROMOTED = 'promoted',
  ROLLED_BACK = 'rolled_back',
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Resource quotas for sandbox environments
 */
export const SandboxResourceQuotaSchema = z.object({
  maxCpuMs: z.number().min(100).max(300000).default(30000),
  maxMemoryMb: z.number().min(64).max(4096).default(512),
  maxStorageGb: z.number().min(0.1).max(100).default(5),
  maxExecutionsPerHour: z.number().min(1).max(10000).default(100),
  maxConcurrentSandboxes: z.number().min(1).max(100).default(5),
  maxDataExportMb: z.number().min(0).max(1024).default(0), // 0 = disabled
  maxNetworkBytesPerHour: z.number().min(0).max(1073741824).default(0), // 0 = disabled
});

export type SandboxResourceQuota = z.infer<typeof SandboxResourceQuotaSchema>;

/**
 * Connector restrictions for sandbox
 */
export const ConnectorRestrictionSchema = z.object({
  connectorType: z.nativeEnum(ConnectorType),
  allowed: z.boolean().default(false),
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  requireApproval: z.boolean().default(true),
  auditAllAccess: z.boolean().default(true),
});

export type ConnectorRestriction = z.infer<typeof ConnectorRestrictionSchema>;

/**
 * Data access policy for sandbox
 */
export const DataAccessPolicySchema = z.object({
  mode: z.nativeEnum(DataAccessMode).default(DataAccessMode.SYNTHETIC_ONLY),
  maxRecords: z.number().min(0).max(1000000).default(10000),
  allowedEntityTypes: z.array(z.string()).default([]),
  blockedEntityTypes: z.array(z.string()).default([]),
  piiHandling: z.enum(['block', 'redact', 'hash', 'synthetic']).default('block'),
  allowLinkbackToProduction: z.boolean().default(false),
  requireAnonymizationAudit: z.boolean().default(true),
  retentionDays: z.number().min(1).max(365).default(30),
});

export type DataAccessPolicy = z.infer<typeof DataAccessPolicySchema>;

/**
 * UI indicator configuration
 */
export const UIIndicatorConfigSchema = z.object({
  mode: z.nativeEnum(SandboxIndicatorMode).default(SandboxIndicatorMode.FULL),
  bannerText: z.string().default('SANDBOX ENVIRONMENT - NOT PRODUCTION'),
  bannerColor: z.string().default('#FF6B35'),
  watermarkText: z.string().default('SANDBOX'),
  watermarkOpacity: z.number().min(0.05).max(0.5).default(0.1),
  showDataSourceWarning: z.boolean().default(true),
  confirmBeforeExport: z.boolean().default(true),
});

export type UIIndicatorConfig = z.infer<typeof UIIndicatorConfigSchema>;

/**
 * Audit configuration for sandbox
 */
export const AuditConfigSchema = z.object({
  logAllQueries: z.boolean().default(true),
  logAllMutations: z.boolean().default(true),
  logDataAccess: z.boolean().default(true),
  logExportAttempts: z.boolean().default(true),
  logLinkbackAttempts: z.boolean().default(true),
  alertOnSuspiciousActivity: z.boolean().default(true),
  retainAuditLogsDays: z.number().min(30).max(2555).default(90),
  exportAuditFormat: z.enum(['json', 'csv', 'parquet']).default('json'),
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;

/**
 * Integration restrictions
 */
export const IntegrationRestrictionsSchema = z.object({
  allowFederation: z.boolean().default(false),
  allowExternalExports: z.boolean().default(false),
  allowWebhooks: z.boolean().default(false),
  allowApiKeys: z.boolean().default(false),
  allowedIntegrations: z.array(z.string()).default([]),
  blockedIntegrations: z.array(z.string()).default(['*']),
  maxExternalCalls: z.number().min(0).max(1000).default(0),
});

export type IntegrationRestrictions = z.infer<typeof IntegrationRestrictionsSchema>;

/**
 * Complete Sandbox Tenant Profile configuration
 */
export const SandboxTenantProfileSchema = z.object({
  // Identity
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tenantType: z.nativeEnum(TenantType).default(TenantType.SANDBOX),

  // Ownership and access
  parentTenantId: z.string().uuid().optional(), // Production tenant this sandbox is associated with
  ownerId: z.string(),
  teamIds: z.array(z.string()).default([]),
  allowedUserIds: z.array(z.string()).default([]),

  // Isolation configuration
  isolationLevel: z.nativeEnum(SandboxIsolationLevel).default(SandboxIsolationLevel.ENHANCED),

  // Resource management
  resourceQuotas: SandboxResourceQuotaSchema.default({}),

  // Data access
  dataAccessPolicy: DataAccessPolicySchema.default({}),

  // Connector restrictions
  connectorRestrictions: z.array(ConnectorRestrictionSchema).default([
    { connectorType: ConnectorType.DATABASE, allowed: true, allowlist: [], blocklist: [], requireApproval: false, auditAllAccess: true },
    { connectorType: ConnectorType.API, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
    { connectorType: ConnectorType.FILE_SYSTEM, allowed: true, allowlist: [], blocklist: [], requireApproval: true, auditAllAccess: true },
    { connectorType: ConnectorType.STREAMING, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
    { connectorType: ConnectorType.EXTERNAL_SERVICE, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
    { connectorType: ConnectorType.FEDERATION, allowed: false, allowlist: [], blocklist: ['*'], requireApproval: true, auditAllAccess: true },
  ]),

  // UI configuration
  uiIndicators: UIIndicatorConfigSchema.default({}),

  // Audit configuration
  auditConfig: AuditConfigSchema.default({}),

  // Integration restrictions
  integrationRestrictions: IntegrationRestrictionsSchema.default({}),

  // Compliance
  complianceFrameworks: z.array(z.string()).default([]),
  dataClassification: z.enum(['unclassified', 'cui', 'sensitive', 'regulated']).default('unclassified'),

  // Lifecycle
  status: z.nativeEnum(SandboxStatus).default(SandboxStatus.PROVISIONING),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
  lastAccessedAt: z.date().optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type SandboxTenantProfile = z.infer<typeof SandboxTenantProfileSchema>;

/**
 * Sandbox creation request
 */
export const CreateSandboxRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentTenantId: z.string().uuid().optional(),
  isolationLevel: z.nativeEnum(SandboxIsolationLevel).optional(),
  resourceQuotas: SandboxResourceQuotaSchema.partial().optional(),
  dataAccessPolicy: DataAccessPolicySchema.partial().optional(),
  expiresInDays: z.number().min(1).max(365).default(30),
  teamIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateSandboxRequest = z.infer<typeof CreateSandboxRequestSchema>;

/**
 * Sandbox update request
 */
export const UpdateSandboxRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  resourceQuotas: SandboxResourceQuotaSchema.partial().optional(),
  dataAccessPolicy: DataAccessPolicySchema.partial().optional(),
  uiIndicators: UIIndicatorConfigSchema.partial().optional(),
  status: z.nativeEnum(SandboxStatus).optional(),
  expiresAt: z.date().optional(),
  teamIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateSandboxRequest = z.infer<typeof UpdateSandboxRequestSchema>;

/**
 * Linkback attempt log entry
 */
export const LinkbackAttemptSchema = z.object({
  id: z.string().uuid(),
  sandboxId: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  sourceType: z.enum(['entity', 'relationship', 'investigation', 'query', 'export']),
  sourceId: z.string(),
  targetProductionId: z.string().optional(),
  blocked: z.boolean(),
  reason: z.string(),
  riskScore: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).default({}),
});

export type LinkbackAttempt = z.infer<typeof LinkbackAttemptSchema>;

/**
 * Promotion request for lab-to-production
 */
export const PromotionRequestSchema = z.object({
  id: z.string().uuid(),
  sandboxId: z.string().uuid(),
  requesterId: z.string(),
  targetTenantId: z.string().uuid(),

  // What to promote
  promotionType: z.enum(['query', 'workflow', 'script', 'configuration', 'model']),
  artifactId: z.string(),
  artifactName: z.string(),
  artifactVersion: z.string().optional(),

  // Review process
  status: z.nativeEnum(PromotionStatus).default(PromotionStatus.DRAFT),
  reviewers: z.array(z.string()).default([]),
  approvals: z.array(z.object({
    reviewerId: z.string(),
    decision: z.enum(['approve', 'reject', 'request_changes']),
    comments: z.string().optional(),
    timestamp: z.date(),
  })).default([]),

  // Validation results
  validationResults: z.object({
    securityScan: z.object({ passed: z.boolean(), findings: z.array(z.string()) }).optional(),
    performanceTest: z.object({ passed: z.boolean(), metrics: z.record(z.number()) }).optional(),
    complianceCheck: z.object({ passed: z.boolean(), violations: z.array(z.string()) }).optional(),
    dataLeakageScan: z.object({ passed: z.boolean(), risks: z.array(z.string()) }).optional(),
  }).default({}),

  // Metadata
  justification: z.string().min(10).max(2000),
  rollbackPlan: z.string().max(2000).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  promotedAt: z.date().optional(),
});

export type PromotionRequest = z.infer<typeof PromotionRequestSchema>;

/**
 * Sandbox usage metrics
 */
export const SandboxUsageMetricsSchema = z.object({
  sandboxId: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  queryCount: z.number().default(0),
  mutationCount: z.number().default(0),
  dataAccessCount: z.number().default(0),
  exportAttempts: z.number().default(0),
  linkbackAttempts: z.number().default(0),
  cpuTimeMs: z.number().default(0),
  memoryPeakMb: z.number().default(0),
  storageUsedGb: z.number().default(0),
  uniqueUsers: z.number().default(0),
  activeSessionMinutes: z.number().default(0),
});

export type SandboxUsageMetrics = z.infer<typeof SandboxUsageMetricsSchema>;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Sandbox-specific error codes
 */
export enum SandboxErrorCode {
  INVALID_CONFIGURATION = 'SANDBOX_INVALID_CONFIGURATION',
  QUOTA_EXCEEDED = 'SANDBOX_QUOTA_EXCEEDED',
  ACCESS_DENIED = 'SANDBOX_ACCESS_DENIED',
  LINKBACK_BLOCKED = 'SANDBOX_LINKBACK_BLOCKED',
  EXPORT_BLOCKED = 'SANDBOX_EXPORT_BLOCKED',
  CONNECTOR_BLOCKED = 'SANDBOX_CONNECTOR_BLOCKED',
  FEDERATION_BLOCKED = 'SANDBOX_FEDERATION_BLOCKED',
  PII_DETECTED = 'SANDBOX_PII_DETECTED',
  EXPIRED = 'SANDBOX_EXPIRED',
  SUSPENDED = 'SANDBOX_SUSPENDED',
  PROMOTION_FAILED = 'SANDBOX_PROMOTION_FAILED',
}

/**
 * Sandbox error with contextual information
 */
export interface SandboxError {
  code: SandboxErrorCode;
  message: string;
  sandboxId?: string;
  userId?: string;
  operation?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a sandbox tenant profile
 */
export function validateSandboxProfile(profile: unknown): SandboxTenantProfile {
  return SandboxTenantProfileSchema.parse(profile);
}

/**
 * Validate a create sandbox request
 */
export function validateCreateRequest(request: unknown): CreateSandboxRequest {
  return CreateSandboxRequestSchema.parse(request);
}

/**
 * Validate a promotion request
 */
export function validatePromotionRequest(request: unknown): PromotionRequest {
  return PromotionRequestSchema.parse(request);
}

/**
 * Check if tenant type is sandbox
 */
export function isSandboxTenant(tenantType: TenantType): boolean {
  return tenantType === TenantType.SANDBOX || tenantType === TenantType.DATALAB;
}

/**
 * Get default connector restrictions for isolation level
 */
export function getDefaultConnectorRestrictions(
  level: SandboxIsolationLevel
): ConnectorRestriction[] {
  const base: ConnectorRestriction[] = [
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
