"use strict";
/**
 * Safe Analytics Workbench - Core Types
 *
 * Type definitions for workspace models, data access patterns,
 * and governance structures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookKernel = exports.CollaboratorPermission = exports.DEFAULT_EGRESS_POLICIES = exports.PIIType = exports.ColumnClassification = exports.QueryExecutionMode = exports.ProvisioningMethod = exports.DatasetTier = exports.DEFAULT_TTL_HOURS = exports.DEFAULT_RESOURCE_CONFIGS = exports.UserRole = exports.WorkspaceStatus = exports.WorkspaceType = void 0;
// ============================================================================
// Workspace Types
// ============================================================================
var WorkspaceType;
(function (WorkspaceType) {
    /** Temporary exploration workspace - 24h default TTL */
    WorkspaceType["AD_HOC"] = "AD_HOC";
    /** Scheduled analysis with persistence - 90d default TTL */
    WorkspaceType["RECURRING_REPORT"] = "RECURRING_REPORT";
    /** ML/statistical model development - 30d default TTL */
    WorkspaceType["MODEL_DEVELOPMENT"] = "MODEL_DEVELOPMENT";
    /** Compliance/audit deep dives - 7d default TTL */
    WorkspaceType["AUDIT_INVESTIGATION"] = "AUDIT_INVESTIGATION";
    /** Collaborative team workspaces - 180d default TTL */
    WorkspaceType["SHARED_ANALYSIS"] = "SHARED_ANALYSIS";
})(WorkspaceType || (exports.WorkspaceType = WorkspaceType = {}));
var WorkspaceStatus;
(function (WorkspaceStatus) {
    /** Awaiting approval */
    WorkspaceStatus["PENDING"] = "PENDING";
    /** Currently in use */
    WorkspaceStatus["ACTIVE"] = "ACTIVE";
    /** No recent activity */
    WorkspaceStatus["IDLE"] = "IDLE";
    /** Suspended due to policy violation or extended idle */
    WorkspaceStatus["SUSPENDED"] = "SUSPENDED";
    /** Read-only, artifacts preserved */
    WorkspaceStatus["ARCHIVED"] = "ARCHIVED";
    /** Purged, no longer accessible */
    WorkspaceStatus["DELETED"] = "DELETED";
})(WorkspaceStatus || (exports.WorkspaceStatus = WorkspaceStatus = {}));
var UserRole;
(function (UserRole) {
    /** Query, visualize, export with limits */
    UserRole["ANALYST"] = "ANALYST";
    /** Full compute, model training, elevated export */
    UserRole["DATA_SCIENTIST"] = "DATA_SCIENTIST";
    /** Admin access, debugging, performance tuning */
    UserRole["ENGINEER"] = "ENGINEER";
    /** Read-only, full history access, no export */
    UserRole["AUDITOR"] = "AUDITOR";
    /** Manage workspace settings, invite collaborators */
    UserRole["WORKSPACE_OWNER"] = "WORKSPACE_OWNER";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.DEFAULT_RESOURCE_CONFIGS = {
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
exports.DEFAULT_TTL_HOURS = {
    [WorkspaceType.AD_HOC]: 24,
    [WorkspaceType.RECURRING_REPORT]: 90 * 24,
    [WorkspaceType.MODEL_DEVELOPMENT]: 30 * 24,
    [WorkspaceType.AUDIT_INVESTIGATION]: 7 * 24,
    [WorkspaceType.SHARED_ANALYSIS]: 180 * 24,
};
// ============================================================================
// Data Access Types
// ============================================================================
var DatasetTier;
(function (DatasetTier) {
    /** Original source data - requires explicit approval */
    DatasetTier["RAW"] = "RAW";
    /** Cleaned, validated datasets - role-based access */
    DatasetTier["CURATED"] = "CURATED";
    /** De-identified/aggregated - self-service */
    DatasetTier["ANONYMIZED"] = "ANONYMIZED";
    /** Generated test data - open access */
    DatasetTier["SYNTHETIC"] = "SYNTHETIC";
})(DatasetTier || (exports.DatasetTier = DatasetTier = {}));
var ProvisioningMethod;
(function (ProvisioningMethod) {
    /** Read-only view, no data copy */
    ProvisioningMethod["LIVE_VIEW"] = "LIVE_VIEW";
    /** Point-in-time snapshot */
    ProvisioningMethod["SNAPSHOT"] = "SNAPSHOT";
    /** Filtered/sampled subset */
    ProvisioningMethod["SAMPLE"] = "SAMPLE";
    /** Time-limited access token */
    ProvisioningMethod["TOKEN_ACCESS"] = "TOKEN_ACCESS";
    /** Materialized subset */
    ProvisioningMethod["MATERIALIZED"] = "MATERIALIZED";
})(ProvisioningMethod || (exports.ProvisioningMethod = ProvisioningMethod = {}));
var QueryExecutionMode;
(function (QueryExecutionMode) {
    /** Sync execution, result streaming */
    QueryExecutionMode["INTERACTIVE"] = "INTERACTIVE";
    /** Async execution, result persistence */
    QueryExecutionMode["BATCH"] = "BATCH";
    /** Cron-triggered execution */
    QueryExecutionMode["SCHEDULED"] = "SCHEDULED";
    /** Delta processing */
    QueryExecutionMode["INCREMENTAL"] = "INCREMENTAL";
})(QueryExecutionMode || (exports.QueryExecutionMode = QueryExecutionMode = {}));
var ColumnClassification;
(function (ColumnClassification) {
    ColumnClassification["PUBLIC"] = "PUBLIC";
    ColumnClassification["INTERNAL"] = "INTERNAL";
    ColumnClassification["CONFIDENTIAL"] = "CONFIDENTIAL";
    ColumnClassification["RESTRICTED"] = "RESTRICTED";
    ColumnClassification["PII"] = "PII";
    ColumnClassification["SENSITIVE"] = "SENSITIVE";
})(ColumnClassification || (exports.ColumnClassification = ColumnClassification = {}));
var PIIType;
(function (PIIType) {
    PIIType["NAME"] = "NAME";
    PIIType["EMAIL"] = "EMAIL";
    PIIType["PHONE"] = "PHONE";
    PIIType["SSN"] = "SSN";
    PIIType["ADDRESS"] = "ADDRESS";
    PIIType["DATE_OF_BIRTH"] = "DATE_OF_BIRTH";
    PIIType["FINANCIAL"] = "FINANCIAL";
    PIIType["HEALTH"] = "HEALTH";
    PIIType["BIOMETRIC"] = "BIOMETRIC";
    PIIType["CUSTOM"] = "CUSTOM";
})(PIIType || (exports.PIIType = PIIType = {}));
exports.DEFAULT_EGRESS_POLICIES = {
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
var CollaboratorPermission;
(function (CollaboratorPermission) {
    CollaboratorPermission["VIEW"] = "VIEW";
    CollaboratorPermission["QUERY"] = "QUERY";
    CollaboratorPermission["EXPORT"] = "EXPORT";
    CollaboratorPermission["MANAGE_DATA"] = "MANAGE_DATA";
    CollaboratorPermission["INVITE"] = "INVITE";
    CollaboratorPermission["ADMIN"] = "ADMIN";
})(CollaboratorPermission || (exports.CollaboratorPermission = CollaboratorPermission = {}));
var NotebookKernel;
(function (NotebookKernel) {
    NotebookKernel["PYTHON_3"] = "PYTHON_3";
    NotebookKernel["R"] = "R";
    NotebookKernel["SQL"] = "SQL";
    NotebookKernel["SCALA"] = "SCALA";
})(NotebookKernel || (exports.NotebookKernel = NotebookKernel = {}));
