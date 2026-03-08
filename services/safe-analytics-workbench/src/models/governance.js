"use strict";
/**
 * Safe Analytics Workbench - Governance Types
 *
 * Types for approval workflows, audit logging, and compliance tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ANOMALY_CONFIG = exports.SecurityAlertType = exports.DEFAULT_LIFECYCLE_RULES = exports.LifecycleEvent = exports.ComplianceFramework = exports.AuditResult = exports.AuditAction = exports.DEFAULT_APPROVAL_WORKFLOWS = exports.ApproverRole = exports.ApprovalStatus = exports.ApprovalType = void 0;
const types_1 = require("./types");
// ============================================================================
// Approval Types
// ============================================================================
var ApprovalType;
(function (ApprovalType) {
    /** New workspace creation */
    ApprovalType["WORKSPACE_CREATION"] = "WORKSPACE_CREATION";
    /** Elevated permissions request */
    ApprovalType["ELEVATED_ACCESS"] = "ELEVATED_ACCESS";
    /** Access to raw/sensitive data */
    ApprovalType["RAW_DATA_ACCESS"] = "RAW_DATA_ACCESS";
    /** Data export request */
    ApprovalType["EXPORT_REQUEST"] = "EXPORT_REQUEST";
    /** Workspace TTL extension */
    ApprovalType["EXTENSION_REQUEST"] = "EXTENSION_REQUEST";
    /** Query on sensitive data */
    ApprovalType["SENSITIVE_QUERY"] = "SENSITIVE_QUERY";
    /** Resource limit increase */
    ApprovalType["RESOURCE_INCREASE"] = "RESOURCE_INCREASE";
    /** Re-activation from suspended state */
    ApprovalType["REACTIVATION"] = "REACTIVATION";
})(ApprovalType || (exports.ApprovalType = ApprovalType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["DENIED"] = "DENIED";
    ApprovalStatus["EXPIRED"] = "EXPIRED";
    ApprovalStatus["CANCELLED"] = "CANCELLED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var ApproverRole;
(function (ApproverRole) {
    ApproverRole["DATA_OWNER"] = "DATA_OWNER";
    ApproverRole["SECURITY"] = "SECURITY";
    ApproverRole["COMPLIANCE"] = "COMPLIANCE";
    ApproverRole["MANAGER"] = "MANAGER";
    ApproverRole["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
})(ApproverRole || (exports.ApproverRole = ApproverRole = {}));
// Default approval workflows by type
exports.DEFAULT_APPROVAL_WORKFLOWS = {
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
var AuditAction;
(function (AuditAction) {
    // Workspace lifecycle
    AuditAction["WORKSPACE_CREATE"] = "WORKSPACE_CREATE";
    AuditAction["WORKSPACE_ACCESS"] = "WORKSPACE_ACCESS";
    AuditAction["WORKSPACE_UPDATE"] = "WORKSPACE_UPDATE";
    AuditAction["WORKSPACE_ARCHIVE"] = "WORKSPACE_ARCHIVE";
    AuditAction["WORKSPACE_DELETE"] = "WORKSPACE_DELETE";
    AuditAction["WORKSPACE_SUSPEND"] = "WORKSPACE_SUSPEND";
    AuditAction["WORKSPACE_REACTIVATE"] = "WORKSPACE_REACTIVATE";
    // Query operations
    AuditAction["QUERY_EXECUTE"] = "QUERY_EXECUTE";
    AuditAction["QUERY_CANCEL"] = "QUERY_CANCEL";
    AuditAction["QUERY_SAVE"] = "QUERY_SAVE";
    AuditAction["QUERY_DELETE"] = "QUERY_DELETE";
    // Data operations
    AuditAction["DATA_ACCESS"] = "DATA_ACCESS";
    AuditAction["DATA_EXPORT"] = "DATA_EXPORT";
    AuditAction["DATA_DOWNLOAD"] = "DATA_DOWNLOAD";
    AuditAction["SCHEMA_BROWSE"] = "SCHEMA_BROWSE";
    // Collaboration
    AuditAction["COLLABORATOR_ADD"] = "COLLABORATOR_ADD";
    AuditAction["COLLABORATOR_REMOVE"] = "COLLABORATOR_REMOVE";
    AuditAction["COLLABORATOR_UPDATE"] = "COLLABORATOR_UPDATE";
    // Approval workflow
    AuditAction["APPROVAL_REQUEST"] = "APPROVAL_REQUEST";
    AuditAction["APPROVAL_DECISION"] = "APPROVAL_DECISION";
    AuditAction["APPROVAL_ESCALATE"] = "APPROVAL_ESCALATE";
    AuditAction["APPROVAL_CANCEL"] = "APPROVAL_CANCEL";
    // Policy and security
    AuditAction["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    AuditAction["POLICY_EVALUATION"] = "POLICY_EVALUATION";
    AuditAction["SECURITY_ALERT"] = "SECURITY_ALERT";
    AuditAction["ANOMALY_DETECTED"] = "ANOMALY_DETECTED";
    // Configuration
    AuditAction["CONFIG_CHANGE"] = "CONFIG_CHANGE";
    AuditAction["RESOURCE_CHANGE"] = "RESOURCE_CHANGE";
    // Notebook operations
    AuditAction["NOTEBOOK_CREATE"] = "NOTEBOOK_CREATE";
    AuditAction["NOTEBOOK_UPDATE"] = "NOTEBOOK_UPDATE";
    AuditAction["NOTEBOOK_DELETE"] = "NOTEBOOK_DELETE";
    AuditAction["NOTEBOOK_EXECUTE"] = "NOTEBOOK_EXECUTE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditResult;
(function (AuditResult) {
    AuditResult["SUCCESS"] = "SUCCESS";
    AuditResult["FAILURE"] = "FAILURE";
    AuditResult["DENIED"] = "DENIED";
    AuditResult["PARTIAL"] = "PARTIAL";
})(AuditResult || (exports.AuditResult = AuditResult = {}));
// ============================================================================
// Compliance Types
// ============================================================================
var ComplianceFramework;
(function (ComplianceFramework) {
    ComplianceFramework["SOC2"] = "SOC2";
    ComplianceFramework["GDPR"] = "GDPR";
    ComplianceFramework["HIPAA"] = "HIPAA";
    ComplianceFramework["PCI_DSS"] = "PCI_DSS";
    ComplianceFramework["CCPA"] = "CCPA";
    ComplianceFramework["INTERNAL"] = "INTERNAL";
})(ComplianceFramework || (exports.ComplianceFramework = ComplianceFramework = {}));
// ============================================================================
// Lifecycle Types
// ============================================================================
var LifecycleEvent;
(function (LifecycleEvent) {
    LifecycleEvent["CREATED"] = "CREATED";
    LifecycleEvent["ACTIVATED"] = "ACTIVATED";
    LifecycleEvent["IDLE_DETECTED"] = "IDLE_DETECTED";
    LifecycleEvent["IDLE_WARNING"] = "IDLE_WARNING";
    LifecycleEvent["SUSPENDED"] = "SUSPENDED";
    LifecycleEvent["ARCHIVED"] = "ARCHIVED";
    LifecycleEvent["REACTIVATED"] = "REACTIVATED";
    LifecycleEvent["EXTENDED"] = "EXTENDED";
    LifecycleEvent["DELETED"] = "DELETED";
    LifecycleEvent["COMPLIANCE_CHECK"] = "COMPLIANCE_CHECK";
    LifecycleEvent["COST_ALERT"] = "COST_ALERT";
    LifecycleEvent["ANOMALY_DETECTED"] = "ANOMALY_DETECTED";
})(LifecycleEvent || (exports.LifecycleEvent = LifecycleEvent = {}));
// Default lifecycle rules
exports.DEFAULT_LIFECYCLE_RULES = [
    {
        id: 'idle-warning',
        name: 'Idle Warning',
        description: 'Notify owner when workspace is idle for 24 hours',
        enabled: true,
        workspaceTypes: Object.values(types_1.WorkspaceType),
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
        workspaceTypes: [types_1.WorkspaceType.AD_HOC],
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
        workspaceTypes: Object.values(types_1.WorkspaceType),
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
        workspaceTypes: Object.values(types_1.WorkspaceType),
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
        workspaceTypes: Object.values(types_1.WorkspaceType),
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
        workspaceTypes: Object.values(types_1.WorkspaceType),
        trigger: { type: 'SCHEDULE', value: '0 0 * * 0' },
        action: { type: 'COMPLIANCE_CHECK' },
        notifications: [],
    },
];
var SecurityAlertType;
(function (SecurityAlertType) {
    SecurityAlertType["UNUSUAL_QUERY_VOLUME"] = "UNUSUAL_QUERY_VOLUME";
    SecurityAlertType["UNUSUAL_EXPORT_VOLUME"] = "UNUSUAL_EXPORT_VOLUME";
    SecurityAlertType["PII_ACCESS_SPIKE"] = "PII_ACCESS_SPIKE";
    SecurityAlertType["OFF_HOURS_ACCESS"] = "OFF_HOURS_ACCESS";
    SecurityAlertType["PERMISSION_ESCALATION"] = "PERMISSION_ESCALATION";
    SecurityAlertType["POLICY_BYPASS_ATTEMPT"] = "POLICY_BYPASS_ATTEMPT";
    SecurityAlertType["DATA_EXFILTRATION_ATTEMPT"] = "DATA_EXFILTRATION_ATTEMPT";
    SecurityAlertType["BRUTE_FORCE_ATTEMPT"] = "BRUTE_FORCE_ATTEMPT";
    SecurityAlertType["UNUSUAL_IP"] = "UNUSUAL_IP";
})(SecurityAlertType || (exports.SecurityAlertType = SecurityAlertType = {}));
exports.DEFAULT_ANOMALY_CONFIG = {
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
