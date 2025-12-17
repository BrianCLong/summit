/**
 * Safe Analytics Workbench - Governance Types
 *
 * Types for approval workflows, audit logging, and compliance tracking.
 */

import {
  DataClassification,
  ExportManifest,
  UserRole,
  WorkspaceType,
} from './types';

// ============================================================================
// Approval Types
// ============================================================================

export enum ApprovalType {
  /** New workspace creation */
  WORKSPACE_CREATION = 'WORKSPACE_CREATION',

  /** Elevated permissions request */
  ELEVATED_ACCESS = 'ELEVATED_ACCESS',

  /** Access to raw/sensitive data */
  RAW_DATA_ACCESS = 'RAW_DATA_ACCESS',

  /** Data export request */
  EXPORT_REQUEST = 'EXPORT_REQUEST',

  /** Workspace TTL extension */
  EXTENSION_REQUEST = 'EXTENSION_REQUEST',

  /** Query on sensitive data */
  SENSITIVE_QUERY = 'SENSITIVE_QUERY',

  /** Resource limit increase */
  RESOURCE_INCREASE = 'RESOURCE_INCREASE',

  /** Re-activation from suspended state */
  REACTIVATION = 'REACTIVATION',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ApproverRole {
  DATA_OWNER = 'DATA_OWNER',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  MANAGER = 'MANAGER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export interface ApproverConfig {
  /** Role required for approval */
  role: ApproverRole;

  /** Whether this approval is required (vs optional) */
  required: boolean;

  /** Hours before escalation if no response */
  escalationTimeoutHours: number;

  /** Specific user IDs (optional - if not set, any user with role can approve) */
  specificApprovers?: string[];
}

export interface ApprovalDecision {
  deciderId: string;
  deciderRole: ApproverRole;
  decision: 'APPROVE' | 'DENY';
  reason?: string;
  conditions?: ApprovalCondition[];
  decidedAt: Date;
}

export interface ApprovalCondition {
  type: 'TIME_LIMIT' | 'ROW_LIMIT' | 'COLUMN_RESTRICTION' | 'AUDIT_REQUIRED' | 'CUSTOM';
  value: string | number;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;

  // Context
  workspaceId?: string;
  tenantId: string;

  // Requestor
  requestorId: string;
  requestorRole: UserRole;

  // Request details
  justification: string;
  requestedAt: Date;
  expiresAt: Date;

  // Approval configuration
  requiredApprovers: ApproverConfig[];

  // Decisions
  decisions: ApprovalDecision[];

  // Outcome
  finalDecision?: 'APPROVED' | 'DENIED';
  finalDecisionAt?: Date;
  appliedConditions?: ApprovalCondition[];

  // Metadata
  metadata: Record<string, any>;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;

  /** Trigger conditions for this workflow */
  triggers: ApprovalTrigger[];

  /** Required approver configuration */
  approverChain: ApproverConfig[];

  /** Default expiration in hours */
  defaultExpirationHours: number;

  /** Auto-approve if no response after hours */
  autoApproveAfterHours?: number;

  /** Enabled */
  enabled: boolean;
}

export interface ApprovalTrigger {
  type: ApprovalType;
  conditions?: ApprovalTriggerCondition[];
}

export interface ApprovalTriggerCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN';
  value: any;
}

// Default approval workflows by type
export const DEFAULT_APPROVAL_WORKFLOWS: Record<ApprovalType, ApproverConfig[]> = {
  [ApprovalType.WORKSPACE_CREATION]: [
    { role: ApproverRole.MANAGER, required: true, escalationTimeoutHours: 24 },
  ],
  [ApprovalType.ELEVATED_ACCESS]: [
    { role: ApproverRole.DATA_OWNER, required: true, escalationTimeoutHours: 24 },
    { role: ApproverRole.SECURITY, required: true, escalationTimeoutHours: 48 },
  ],
  [ApprovalType.RAW_DATA_ACCESS]: [
    { role: ApproverRole.DATA_OWNER, required: true, escalationTimeoutHours: 24 },
    { role: ApproverRole.COMPLIANCE, required: true, escalationTimeoutHours: 48 },
  ],
  [ApprovalType.EXPORT_REQUEST]: [
    { role: ApproverRole.DATA_OWNER, required: true, escalationTimeoutHours: 12 },
  ],
  [ApprovalType.EXTENSION_REQUEST]: [
    { role: ApproverRole.MANAGER, required: true, escalationTimeoutHours: 24 },
  ],
  [ApprovalType.SENSITIVE_QUERY]: [
    { role: ApproverRole.COMPLIANCE, required: true, escalationTimeoutHours: 4 },
  ],
  [ApprovalType.RESOURCE_INCREASE]: [
    { role: ApproverRole.PLATFORM_ADMIN, required: true, escalationTimeoutHours: 24 },
  ],
  [ApprovalType.REACTIVATION]: [
    { role: ApproverRole.SECURITY, required: true, escalationTimeoutHours: 12 },
    { role: ApproverRole.MANAGER, required: true, escalationTimeoutHours: 24 },
  ],
};

// ============================================================================
// Audit Types
// ============================================================================

export enum AuditAction {
  // Workspace lifecycle
  WORKSPACE_CREATE = 'WORKSPACE_CREATE',
  WORKSPACE_ACCESS = 'WORKSPACE_ACCESS',
  WORKSPACE_UPDATE = 'WORKSPACE_UPDATE',
  WORKSPACE_ARCHIVE = 'WORKSPACE_ARCHIVE',
  WORKSPACE_DELETE = 'WORKSPACE_DELETE',
  WORKSPACE_SUSPEND = 'WORKSPACE_SUSPEND',
  WORKSPACE_REACTIVATE = 'WORKSPACE_REACTIVATE',

  // Query operations
  QUERY_EXECUTE = 'QUERY_EXECUTE',
  QUERY_CANCEL = 'QUERY_CANCEL',
  QUERY_SAVE = 'QUERY_SAVE',
  QUERY_DELETE = 'QUERY_DELETE',

  // Data operations
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DOWNLOAD = 'DATA_DOWNLOAD',
  SCHEMA_BROWSE = 'SCHEMA_BROWSE',

  // Collaboration
  COLLABORATOR_ADD = 'COLLABORATOR_ADD',
  COLLABORATOR_REMOVE = 'COLLABORATOR_REMOVE',
  COLLABORATOR_UPDATE = 'COLLABORATOR_UPDATE',

  // Approval workflow
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  APPROVAL_DECISION = 'APPROVAL_DECISION',
  APPROVAL_ESCALATE = 'APPROVAL_ESCALATE',
  APPROVAL_CANCEL = 'APPROVAL_CANCEL',

  // Policy and security
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  POLICY_EVALUATION = 'POLICY_EVALUATION',
  SECURITY_ALERT = 'SECURITY_ALERT',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',

  // Configuration
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  RESOURCE_CHANGE = 'RESOURCE_CHANGE',

  // Notebook operations
  NOTEBOOK_CREATE = 'NOTEBOOK_CREATE',
  NOTEBOOK_UPDATE = 'NOTEBOOK_UPDATE',
  NOTEBOOK_DELETE = 'NOTEBOOK_DELETE',
  NOTEBOOK_EXECUTE = 'NOTEBOOK_EXECUTE',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  DENIED = 'DENIED',
  PARTIAL = 'PARTIAL',
}

export interface AuditEvent {
  id: string;
  timestamp: Date;

  // Actor information
  userId: string;
  userRole: UserRole;
  clientIp: string;
  userAgent?: string;
  sessionId?: string;

  // Action details
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  result: AuditResult;

  // Context
  workspaceId?: string;
  tenantId: string;

  // Request details
  parameters: Record<string, any>;

  // For queries: sanitized SQL (no literals)
  sanitizedQuery?: string;

  // For data access: what was accessed
  dataAccessSummary?: DataAccessSummary;

  // For exports: manifest
  exportManifest?: ExportManifest;

  // Policy evaluation
  policyDecision?: PolicyDecision;

  // Timing
  durationMs?: number;

  // Error details (if failed)
  errorCode?: string;
  errorMessage?: string;

  // Correlation
  traceId?: string;
  spanId?: string;
  parentEventId?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

export type AuditResourceType =
  | 'WORKSPACE'
  | 'QUERY'
  | 'EXPORT'
  | 'DATASET'
  | 'NOTEBOOK'
  | 'APPROVAL'
  | 'COLLABORATOR'
  | 'CONFIG'
  | 'POLICY';

export interface DataAccessSummary {
  datasetId: string;
  datasetName: string;
  tier: string;
  classification: DataClassification;
  columnsAccessed: string[];
  rowsAccessed?: number;
  bytesAccessed?: number;
  filterApplied?: string;
  maskedColumns?: string[];
}

export interface PolicyDecision {
  policyId: string;
  policyName: string;
  decision: 'ALLOW' | 'DENY';
  evaluationTimeMs: number;
  matchedRules: string[];
  deniedRules?: string[];
  conditions?: Record<string, any>;
}

export interface AuditFilter {
  actions?: AuditAction[];
  resourceTypes?: AuditResourceType[];
  results?: AuditResult[];
  userIds?: string[];
  workspaceIds?: string[];
  tenantIds?: string[];
  startTime?: Date;
  endTime?: Date;
  searchTerm?: string;
}

// ============================================================================
// Compliance Types
// ============================================================================

export enum ComplianceFramework {
  SOC2 = 'SOC2',
  GDPR = 'GDPR',
  HIPAA = 'HIPAA',
  PCI_DSS = 'PCI_DSS',
  CCPA = 'CCPA',
  INTERNAL = 'INTERNAL',
}

export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFramework;
  requirementId: string;
  description: string;
  category: string;
  controls: string[];
}

export interface ComplianceCheck {
  id: string;
  workspaceId: string;
  checkedAt: Date;
  checkedBy: string;

  framework: ComplianceFramework;
  requirements: ComplianceCheckResult[];

  overallScore: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE';

  findings: ComplianceFinding[];
  recommendations: string[];
}

export interface ComplianceCheckResult {
  requirementId: string;
  status: 'MET' | 'NOT_MET' | 'PARTIAL' | 'NOT_APPLICABLE';
  evidence?: string;
  notes?: string;
}

export interface ComplianceFinding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  requirementId: string;
  description: string;
  currentState: string;
  requiredState: string;
  remediation: string;
  dueDate?: Date;
  assignee?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK';
}

// ============================================================================
// Lifecycle Types
// ============================================================================

export enum LifecycleEvent {
  CREATED = 'CREATED',
  ACTIVATED = 'ACTIVATED',
  IDLE_DETECTED = 'IDLE_DETECTED',
  IDLE_WARNING = 'IDLE_WARNING',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
  REACTIVATED = 'REACTIVATED',
  EXTENDED = 'EXTENDED',
  DELETED = 'DELETED',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  COST_ALERT = 'COST_ALERT',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
}

export interface LifecycleRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  /** Which workspace types this applies to */
  workspaceTypes: WorkspaceType[];

  /** Trigger condition */
  trigger: LifecycleTrigger;

  /** Action to take */
  action: LifecycleAction;

  /** Notification configuration */
  notifications: NotificationConfig[];
}

export interface LifecycleTrigger {
  type:
    | 'IDLE_DURATION'
    | 'AGE'
    | 'COST_THRESHOLD'
    | 'STORAGE_THRESHOLD'
    | 'EXPIRATION'
    | 'SCHEDULE';
  value: number | string;
  unit?: 'HOURS' | 'DAYS' | 'PERCENT' | 'BYTES';
}

export interface LifecycleAction {
  type:
    | 'NOTIFY'
    | 'SUSPEND'
    | 'ARCHIVE'
    | 'DELETE'
    | 'THROTTLE'
    | 'EXTEND'
    | 'COMPLIANCE_CHECK';
  parameters?: Record<string, any>;
}

export interface NotificationConfig {
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'IN_APP';
  recipients: string[];
  template: string;
}

// Default lifecycle rules
export const DEFAULT_LIFECYCLE_RULES: LifecycleRule[] = [
  {
    id: 'idle-warning',
    name: 'Idle Warning',
    description: 'Notify owner when workspace is idle for 24 hours',
    enabled: true,
    workspaceTypes: Object.values(WorkspaceType),
    trigger: { type: 'IDLE_DURATION', value: 24, unit: 'HOURS' },
    action: { type: 'NOTIFY' },
    notifications: [
      {
        type: 'EMAIL',
        recipients: ['${workspace.owner.email}'],
        template: 'workspace-idle-warning',
      },
    ],
  },
  {
    id: 'idle-suspend',
    name: 'Idle Suspension',
    description: 'Suspend workspace after 7 days of idle',
    enabled: true,
    workspaceTypes: [WorkspaceType.AD_HOC],
    trigger: { type: 'IDLE_DURATION', value: 7, unit: 'DAYS' },
    action: { type: 'SUSPEND' },
    notifications: [
      {
        type: 'EMAIL',
        recipients: ['${workspace.owner.email}'],
        template: 'workspace-suspended',
      },
    ],
  },
  {
    id: 'auto-archive',
    name: 'Auto Archive',
    description: 'Archive workspace 30 days after suspension',
    enabled: true,
    workspaceTypes: Object.values(WorkspaceType),
    trigger: { type: 'IDLE_DURATION', value: 30, unit: 'DAYS' },
    action: { type: 'ARCHIVE' },
    notifications: [
      {
        type: 'EMAIL',
        recipients: ['${workspace.owner.email}'],
        template: 'workspace-archived',
      },
    ],
  },
  {
    id: 'cost-alert',
    name: 'Cost Alert',
    description: 'Alert when workspace exceeds 80% of cost budget',
    enabled: true,
    workspaceTypes: Object.values(WorkspaceType),
    trigger: { type: 'COST_THRESHOLD', value: 80, unit: 'PERCENT' },
    action: { type: 'NOTIFY' },
    notifications: [
      {
        type: 'EMAIL',
        recipients: ['${workspace.owner.email}', 'platform-team@company.com'],
        template: 'workspace-cost-alert',
      },
    ],
  },
  {
    id: 'expiration-warning',
    name: 'Expiration Warning',
    description: 'Warn 7 days before workspace expires',
    enabled: true,
    workspaceTypes: Object.values(WorkspaceType),
    trigger: { type: 'EXPIRATION', value: 7, unit: 'DAYS' },
    action: { type: 'NOTIFY' },
    notifications: [
      {
        type: 'EMAIL',
        recipients: ['${workspace.owner.email}'],
        template: 'workspace-expiring',
      },
    ],
  },
  {
    id: 'weekly-compliance',
    name: 'Weekly Compliance Check',
    description: 'Run compliance check every Sunday at midnight',
    enabled: true,
    workspaceTypes: Object.values(WorkspaceType),
    trigger: { type: 'SCHEDULE', value: '0 0 * * 0' },
    action: { type: 'COMPLIANCE_CHECK' },
    notifications: [],
  },
];

// ============================================================================
// Security Types
// ============================================================================

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: SecurityAlertType;
  workspaceId?: string;
  userId: string;
  description: string;
  evidence: Record<string, any>;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignee?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export enum SecurityAlertType {
  UNUSUAL_QUERY_VOLUME = 'UNUSUAL_QUERY_VOLUME',
  UNUSUAL_EXPORT_VOLUME = 'UNUSUAL_EXPORT_VOLUME',
  PII_ACCESS_SPIKE = 'PII_ACCESS_SPIKE',
  OFF_HOURS_ACCESS = 'OFF_HOURS_ACCESS',
  PERMISSION_ESCALATION = 'PERMISSION_ESCALATION',
  POLICY_BYPASS_ATTEMPT = 'POLICY_BYPASS_ATTEMPT',
  DATA_EXFILTRATION_ATTEMPT = 'DATA_EXFILTRATION_ATTEMPT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  UNUSUAL_IP = 'UNUSUAL_IP',
}

export interface AnomalyDetectionConfig {
  enabled: boolean;

  /** Baseline window in days */
  baselineWindowDays: number;

  /** Standard deviations from mean to trigger alert */
  sensitivityThreshold: number;

  /** Minimum samples for baseline */
  minBaselineSamples: number;

  /** Metrics to monitor */
  monitoredMetrics: AnomalyMetric[];
}

export interface AnomalyMetric {
  name: string;
  type: 'QUERY_VOLUME' | 'EXPORT_VOLUME' | 'DATA_ACCESS' | 'ROW_COUNT' | 'BYTE_COUNT';
  aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MAX';
  timeWindowMinutes: number;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  enabled: true,
  baselineWindowDays: 30,
  sensitivityThreshold: 3,
  minBaselineSamples: 100,
  monitoredMetrics: [
    { name: 'query_count', type: 'QUERY_VOLUME', aggregation: 'COUNT', timeWindowMinutes: 60 },
    { name: 'export_bytes', type: 'EXPORT_VOLUME', aggregation: 'SUM', timeWindowMinutes: 60 },
    { name: 'pii_access', type: 'DATA_ACCESS', aggregation: 'COUNT', timeWindowMinutes: 60 },
    { name: 'row_export', type: 'ROW_COUNT', aggregation: 'SUM', timeWindowMinutes: 1440 },
  ],
};
