/**
 * Safe Analytics Workbench - Core Types
 *
 * Type definitions for workspace models, data access patterns,
 * and governance structures.
 */

// ============================================================================
// Workspace Types
// ============================================================================

export enum WorkspaceType {
  /** Temporary exploration workspace - 24h default TTL */
  AD_HOC = 'AD_HOC',

  /** Scheduled analysis with persistence - 90d default TTL */
  RECURRING_REPORT = 'RECURRING_REPORT',

  /** ML/statistical model development - 30d default TTL */
  MODEL_DEVELOPMENT = 'MODEL_DEVELOPMENT',

  /** Compliance/audit deep dives - 7d default TTL */
  AUDIT_INVESTIGATION = 'AUDIT_INVESTIGATION',

  /** Collaborative team workspaces - 180d default TTL */
  SHARED_ANALYSIS = 'SHARED_ANALYSIS',
}

export enum WorkspaceStatus {
  /** Awaiting approval */
  PENDING = 'PENDING',

  /** Currently in use */
  ACTIVE = 'ACTIVE',

  /** No recent activity */
  IDLE = 'IDLE',

  /** Suspended due to policy violation or extended idle */
  SUSPENDED = 'SUSPENDED',

  /** Read-only, artifacts preserved */
  ARCHIVED = 'ARCHIVED',

  /** Purged, no longer accessible */
  DELETED = 'DELETED',
}

export enum UserRole {
  /** Query, visualize, export with limits */
  ANALYST = 'ANALYST',

  /** Full compute, model training, elevated export */
  DATA_SCIENTIST = 'DATA_SCIENTIST',

  /** Admin access, debugging, performance tuning */
  ENGINEER = 'ENGINEER',

  /** Read-only, full history access, no export */
  AUDITOR = 'AUDITOR',

  /** Manage workspace settings, invite collaborators */
  WORKSPACE_OWNER = 'WORKSPACE_OWNER',
}

// ============================================================================
// Workspace Configuration
// ============================================================================

export interface ResourceConfig {
  /** Virtual CPU cores */
  vcpu: number;

  /** Memory in GB */
  memoryGb: number;

  /** Storage in GB */
  storageGb: number;

  /** Maximum query execution time in seconds */
  queryTimeoutSeconds: number;

  /** Maximum concurrent queries */
  maxConcurrentQueries: number;

  /** Daily query volume limit */
  dailyQueryLimit: number;
}

export interface WorkspaceConfig {
  /** Resource allocation */
  resources: ResourceConfig;

  /** Idle timeout before marking IDLE (in hours) */
  idleTimeoutHours: number;

  /** Days before archiving from IDLE state */
  archiveAfterIdleDays: number;

  /** Days to retain in ARCHIVED state */
  retentionDays: number;

  /** Auto-extend on activity */
  autoExtend: boolean;

  /** Egress policy for this workspace */
  egressPolicy: EgressPolicy;
}

export const DEFAULT_RESOURCE_CONFIGS: Record<WorkspaceType, ResourceConfig> = {
  [WorkspaceType.AD_HOC]: {
    vcpu: 2,
    memoryGb: 4,
    storageGb: 10,
    queryTimeoutSeconds: 300,
    maxConcurrentQueries: 3,
    dailyQueryLimit: 100,
  },
  [WorkspaceType.RECURRING_REPORT]: {
    vcpu: 4,
    memoryGb: 8,
    storageGb: 50,
    queryTimeoutSeconds: 1800,
    maxConcurrentQueries: 5,
    dailyQueryLimit: 500,
  },
  [WorkspaceType.MODEL_DEVELOPMENT]: {
    vcpu: 8,
    memoryGb: 32,
    storageGb: 200,
    queryTimeoutSeconds: 7200,
    maxConcurrentQueries: 10,
    dailyQueryLimit: 1000,
  },
  [WorkspaceType.AUDIT_INVESTIGATION]: {
    vcpu: 2,
    memoryGb: 4,
    storageGb: 20,
    queryTimeoutSeconds: 900,
    maxConcurrentQueries: 3,
    dailyQueryLimit: 200,
  },
  [WorkspaceType.SHARED_ANALYSIS]: {
    vcpu: 4,
    memoryGb: 16,
    storageGb: 100,
    queryTimeoutSeconds: 1800,
    maxConcurrentQueries: 8,
    dailyQueryLimit: 800,
  },
};

export const DEFAULT_TTL_HOURS: Record<WorkspaceType, number> = {
  [WorkspaceType.AD_HOC]: 24,
  [WorkspaceType.RECURRING_REPORT]: 90 * 24,
  [WorkspaceType.MODEL_DEVELOPMENT]: 30 * 24,
  [WorkspaceType.AUDIT_INVESTIGATION]: 7 * 24,
  [WorkspaceType.SHARED_ANALYSIS]: 180 * 24,
};

// ============================================================================
// Data Access Types
// ============================================================================

export enum DatasetTier {
  /** Original source data - requires explicit approval */
  RAW = 'RAW',

  /** Cleaned, validated datasets - role-based access */
  CURATED = 'CURATED',

  /** De-identified/aggregated - self-service */
  ANONYMIZED = 'ANONYMIZED',

  /** Generated test data - open access */
  SYNTHETIC = 'SYNTHETIC',
}

export enum ProvisioningMethod {
  /** Read-only view, no data copy */
  LIVE_VIEW = 'LIVE_VIEW',

  /** Point-in-time snapshot */
  SNAPSHOT = 'SNAPSHOT',

  /** Filtered/sampled subset */
  SAMPLE = 'SAMPLE',

  /** Time-limited access token */
  TOKEN_ACCESS = 'TOKEN_ACCESS',

  /** Materialized subset */
  MATERIALIZED = 'MATERIALIZED',
}

export enum QueryExecutionMode {
  /** Sync execution, result streaming */
  INTERACTIVE = 'INTERACTIVE',

  /** Async execution, result persistence */
  BATCH = 'BATCH',

  /** Cron-triggered execution */
  SCHEDULED = 'SCHEDULED',

  /** Delta processing */
  INCREMENTAL = 'INCREMENTAL',
}

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  tier: DatasetTier;
  ownerBusinessUnit: string;
  schema: DatasetSchema;
  classification: DataClassification;
  tags: string[];
  rowCount?: number;
  sizeBytes?: number;
  lastUpdated: Date;
}

export interface DatasetSchema {
  columns: ColumnDefinition[];
  partitionKeys?: string[];
  sortKeys?: string[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  classification?: ColumnClassification;
  piiType?: PIIType;
}

export enum ColumnClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  PII = 'PII',
  SENSITIVE = 'SENSITIVE',
}

export enum PIIType {
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SSN = 'SSN',
  ADDRESS = 'ADDRESS',
  DATE_OF_BIRTH = 'DATE_OF_BIRTH',
  FINANCIAL = 'FINANCIAL',
  HEALTH = 'HEALTH',
  BIOMETRIC = 'BIOMETRIC',
  CUSTOM = 'CUSTOM',
}

export interface DataClassification {
  level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  containsPII: boolean;
  piiTypes: PIIType[];
  retentionClass: string;
  encryptionRequired: boolean;
}

export interface DatasetAccess {
  datasetId: string;
  datasetInfo: DatasetInfo;
  provisioningMethod: ProvisioningMethod;
  grantedAt: Date;
  expiresAt?: Date;
  accessLevel: 'READ' | 'READ_WRITE';
  rowFilter?: string;
  columnMask?: Record<string, MaskingRule>;
}

export interface MaskingRule {
  type: 'REDACT' | 'MASK' | 'HASH' | 'TRUNCATE' | 'GENERALIZE';
  config?: Record<string, any>;
}

// ============================================================================
// Egress & Export Types
// ============================================================================

export type ExportFormat = 'CSV' | 'JSON' | 'PARQUET' | 'XLSX';
export type ExportDestination = 'LOCAL' | 'S3' | 'GCS' | 'EMAIL';

export interface EgressPolicy {
  /** Maximum rows per export */
  maxRowsPerExport: number;

  /** Maximum bytes per export */
  maxBytesPerExport: number;

  /** Daily export limit (total rows) */
  dailyExportLimit: number;

  /** Allowed export formats */
  allowedFormats: ExportFormat[];

  /** Allowed destinations */
  allowedDestinations: ExportDestination[];

  /** Require approval for exports */
  requireApproval: boolean;

  /** Sensitive column handling */
  sensitiveColumnPolicy: 'MASK' | 'REDACT' | 'HASH' | 'BLOCK';

  /** PII detection enabled */
  piiDetectionEnabled: boolean;

  /** Watermarking enabled */
  watermarkingEnabled: boolean;
}

export const DEFAULT_EGRESS_POLICIES: Record<UserRole, EgressPolicy> = {
  [UserRole.ANALYST]: {
    maxRowsPerExport: 10000,
    maxBytesPerExport: 50 * 1024 * 1024, // 50 MB
    dailyExportLimit: 100000,
    allowedFormats: ['CSV', 'XLSX'],
    allowedDestinations: ['LOCAL'],
    requireApproval: false,
    sensitiveColumnPolicy: 'MASK',
    piiDetectionEnabled: true,
    watermarkingEnabled: true,
  },
  [UserRole.DATA_SCIENTIST]: {
    maxRowsPerExport: 1000000,
    maxBytesPerExport: 1024 * 1024 * 1024, // 1 GB
    dailyExportLimit: 10000000,
    allowedFormats: ['CSV', 'JSON', 'PARQUET'],
    allowedDestinations: ['LOCAL', 'S3'],
    requireApproval: false,
    sensitiveColumnPolicy: 'HASH',
    piiDetectionEnabled: true,
    watermarkingEnabled: true,
  },
  [UserRole.ENGINEER]: {
    maxRowsPerExport: 10000000,
    maxBytesPerExport: 10 * 1024 * 1024 * 1024, // 10 GB
    dailyExportLimit: 100000000,
    allowedFormats: ['CSV', 'JSON', 'PARQUET', 'XLSX'],
    allowedDestinations: ['LOCAL', 'S3', 'GCS'],
    requireApproval: true,
    sensitiveColumnPolicy: 'REDACT',
    piiDetectionEnabled: true,
    watermarkingEnabled: false,
  },
  [UserRole.AUDITOR]: {
    maxRowsPerExport: 0, // No exports allowed
    maxBytesPerExport: 0,
    dailyExportLimit: 0,
    allowedFormats: [],
    allowedDestinations: [],
    requireApproval: true,
    sensitiveColumnPolicy: 'BLOCK',
    piiDetectionEnabled: true,
    watermarkingEnabled: true,
  },
  [UserRole.WORKSPACE_OWNER]: {
    maxRowsPerExport: 100000,
    maxBytesPerExport: 500 * 1024 * 1024, // 500 MB
    dailyExportLimit: 1000000,
    allowedFormats: ['CSV', 'JSON', 'XLSX'],
    allowedDestinations: ['LOCAL', 'S3'],
    requireApproval: false,
    sensitiveColumnPolicy: 'MASK',
    piiDetectionEnabled: true,
    watermarkingEnabled: true,
  },
};

export interface ExportRequest {
  id: string;
  workspaceId: string;
  queryId: string;
  format: ExportFormat;
  destination: ExportDestination;
  destinationPath?: string;
  filters?: Record<string, any>;
  columnSelection?: string[];
  requestedAt: Date;
  requestedBy: string;
}

export interface ExportResult {
  id: string;
  requestId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DENIED';
  format: ExportFormat;
  rowCount?: number;
  byteSize?: number;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  error?: string;
  completedAt?: Date;
  watermark?: string;
}

export interface ExportManifest {
  exportId: string;
  columns: string[];
  rowCount: number;
  byteSize: number;
  checksum: string;
  classification: DataClassification;
  maskedColumns: string[];
  redactedColumns: string[];
}

// ============================================================================
// Workspace Entity
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: WorkspaceType;
  status: WorkspaceStatus;

  // Ownership
  ownerId: string;
  tenantId: string;

  // Configuration
  config: WorkspaceConfig;

  // Data access
  datasetAccess: DatasetAccess[];

  // Lifecycle timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
  expiresAt?: Date;
  archivedAt?: Date;
  deletedAt?: Date;

  // Governance
  approvalId?: string;
  suspensionReason?: string;

  // Metrics
  queryCount: number;
  exportCount: number;
  computeHoursUsed: number;
  storageUsedBytes: number;

  // Tags and metadata
  tags: string[];
  metadata: Record<string, any>;
}

export interface WorkspaceCollaborator {
  userId: string;
  role: UserRole;
  addedAt: Date;
  addedBy: string;
  permissions: CollaboratorPermission[];
}

export enum CollaboratorPermission {
  VIEW = 'VIEW',
  QUERY = 'QUERY',
  EXPORT = 'EXPORT',
  MANAGE_DATA = 'MANAGE_DATA',
  INVITE = 'INVITE',
  ADMIN = 'ADMIN',
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryRequest {
  id: string;
  workspaceId: string;
  sql: string;
  parameters?: Record<string, any>;
  executionMode: QueryExecutionMode;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  timeoutSeconds?: number;
  maxRows?: number;
  requestedAt: Date;
  requestedBy: string;
}

export interface QueryResult {
  id: string;
  requestId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  columns?: ColumnDefinition[];
  rows?: any[][];
  rowCount?: number;
  bytesScanned?: number;
  executionTimeMs?: number;
  error?: string;
  warnings?: string[];
  startedAt?: Date;
  completedAt?: Date;
  cachedResult?: boolean;
}

export interface SavedQuery {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  sql: string;
  parameters?: QueryParameter[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}

export interface QueryParameter {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY';
  defaultValue?: any;
  required: boolean;
  description?: string;
}

// ============================================================================
// Notebook Types
// ============================================================================

export interface Notebook {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  content: NotebookContent;
  kernel: NotebookKernel;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastExecutedAt?: Date;
  version: number;
}

export interface NotebookContent {
  cells: NotebookCell[];
  metadata: Record<string, any>;
}

export interface NotebookCell {
  id: string;
  type: 'CODE' | 'MARKDOWN' | 'SQL';
  source: string;
  outputs?: CellOutput[];
  executionCount?: number;
  metadata?: Record<string, any>;
}

export interface CellOutput {
  type: 'EXECUTE_RESULT' | 'STREAM' | 'DISPLAY_DATA' | 'ERROR';
  data?: Record<string, any>;
  text?: string;
  error?: {
    name: string;
    message: string;
    traceback: string[];
  };
}

export enum NotebookKernel {
  PYTHON_3 = 'PYTHON_3',
  R = 'R',
  SQL = 'SQL',
  SCALA = 'SCALA',
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  type: WorkspaceType;
  justification: string;
  datasetRequests?: DatasetAccessRequest[];
  collaborators?: CollaboratorInput[];
  resourceOverrides?: Partial<ResourceConfig>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DatasetAccessRequest {
  datasetId: string;
  provisioningMethod: ProvisioningMethod;
  accessLevel: 'READ' | 'READ_WRITE';
  rowFilter?: string;
  justification: string;
}

export interface CollaboratorInput {
  userId: string;
  role: UserRole;
  permissions: CollaboratorPermission[];
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  resourceOverrides?: Partial<ResourceConfig>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface WorkspaceFilter {
  types?: WorkspaceType[];
  statuses?: WorkspaceStatus[];
  ownerIds?: string[];
  tenantIds?: string[];
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  searchTerm?: string;
}

export interface Pagination {
  offset: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
