"use strict";
/**
 * CompanyOS Tenant Types
 *
 * Implements A1: Tenant Lifecycle Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_STATUS_TRANSITIONS = exports.DEFAULT_FEATURES = exports.DEFAULT_QUOTAS = exports.AuditEventOutcome = exports.AuditEventCategory = exports.TenantAdminRole = exports.TenantTier = exports.TenantStatus = void 0;
// ============================================================================
// Enums
// ============================================================================
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["PENDING"] = "PENDING";
    TenantStatus["ACTIVE"] = "ACTIVE";
    TenantStatus["SUSPENDED"] = "SUSPENDED";
    TenantStatus["DELETION_REQUESTED"] = "DELETION_REQUESTED";
    TenantStatus["DELETED"] = "DELETED";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
var TenantTier;
(function (TenantTier) {
    TenantTier["STARTER"] = "STARTER";
    TenantTier["BRONZE"] = "BRONZE";
    TenantTier["SILVER"] = "SILVER";
    TenantTier["GOLD"] = "GOLD";
    TenantTier["ENTERPRISE"] = "ENTERPRISE";
})(TenantTier || (exports.TenantTier = TenantTier = {}));
var TenantAdminRole;
(function (TenantAdminRole) {
    TenantAdminRole["ADMIN"] = "ADMIN";
    TenantAdminRole["OWNER"] = "OWNER";
    TenantAdminRole["BILLING_ADMIN"] = "BILLING_ADMIN";
    TenantAdminRole["SECURITY_REVIEWER"] = "SECURITY_REVIEWER";
})(TenantAdminRole || (exports.TenantAdminRole = TenantAdminRole = {}));
var AuditEventCategory;
(function (AuditEventCategory) {
    AuditEventCategory["TENANT_LIFECYCLE"] = "tenant_lifecycle";
    AuditEventCategory["USER_MANAGEMENT"] = "user_management";
    AuditEventCategory["FEATURE_FLAGS"] = "feature_flags";
    AuditEventCategory["SECURITY"] = "security";
    AuditEventCategory["BILLING"] = "billing";
    AuditEventCategory["DATA_ACCESS"] = "data_access";
    AuditEventCategory["CONFIGURATION"] = "configuration";
})(AuditEventCategory || (exports.AuditEventCategory = AuditEventCategory = {}));
var AuditEventOutcome;
(function (AuditEventOutcome) {
    AuditEventOutcome["SUCCESS"] = "success";
    AuditEventOutcome["FAILURE"] = "failure";
    AuditEventOutcome["DENIED"] = "denied";
})(AuditEventOutcome || (exports.AuditEventOutcome = AuditEventOutcome = {}));
// ============================================================================
// Constants
// ============================================================================
exports.DEFAULT_QUOTAS = {
    [TenantTier.STARTER]: {
        apiCallsPerHour: 1000,
        storageGb: 10,
        usersMax: 5,
        exportCallsPerDay: 5,
    },
    [TenantTier.BRONZE]: {
        apiCallsPerHour: 5000,
        storageGb: 50,
        usersMax: 25,
        exportCallsPerDay: 20,
    },
    [TenantTier.SILVER]: {
        apiCallsPerHour: 10000,
        storageGb: 100,
        usersMax: 100,
        exportCallsPerDay: 50,
    },
    [TenantTier.GOLD]: {
        apiCallsPerHour: 50000,
        storageGb: 500,
        usersMax: 500,
        exportCallsPerDay: 200,
    },
    [TenantTier.ENTERPRISE]: {
        apiCallsPerHour: 100000,
        storageGb: 2000,
        usersMax: 10000,
        exportCallsPerDay: 1000,
    },
};
exports.DEFAULT_FEATURES = {
    [TenantTier.STARTER]: {
        copilotEnabled: false,
        advancedAnalytics: false,
        customIntegrations: false,
        ssoEnabled: false,
        auditLogExport: false,
        apiAccessEnabled: true,
    },
    [TenantTier.BRONZE]: {
        copilotEnabled: true,
        advancedAnalytics: false,
        customIntegrations: false,
        ssoEnabled: false,
        auditLogExport: false,
        apiAccessEnabled: true,
    },
    [TenantTier.SILVER]: {
        copilotEnabled: true,
        advancedAnalytics: true,
        customIntegrations: false,
        ssoEnabled: true,
        auditLogExport: false,
        apiAccessEnabled: true,
    },
    [TenantTier.GOLD]: {
        copilotEnabled: true,
        advancedAnalytics: true,
        customIntegrations: true,
        ssoEnabled: true,
        auditLogExport: true,
        apiAccessEnabled: true,
    },
    [TenantTier.ENTERPRISE]: {
        copilotEnabled: true,
        advancedAnalytics: true,
        customIntegrations: true,
        ssoEnabled: true,
        auditLogExport: true,
        apiAccessEnabled: true,
    },
};
// Valid status transitions
exports.VALID_STATUS_TRANSITIONS = {
    [TenantStatus.PENDING]: [TenantStatus.ACTIVE, TenantStatus.DELETED],
    [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.DELETION_REQUESTED],
    [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.DELETION_REQUESTED],
    [TenantStatus.DELETION_REQUESTED]: [TenantStatus.DELETED, TenantStatus.ACTIVE],
    [TenantStatus.DELETED]: [], // Terminal state
};
