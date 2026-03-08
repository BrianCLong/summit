"use strict";
/**
 * CompanyOS Tenant Types
 *
 * Core type definitions for the Tenant Control Plane
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_FEATURE_FLAGS = void 0;
// Standard feature flags available for tenants
exports.TENANT_FEATURE_FLAGS = {
    AI_COPILOT_ACCESS: 'ai_copilot_access',
    BILLING_ENABLED: 'billing_enabled',
    ADVANCED_ANALYTICS: 'advanced_analytics',
    EXPORT_ENABLED: 'export_enabled',
    API_ACCESS: 'api_access',
    SSO_ENABLED: 'sso_enabled',
    CUSTOM_BRANDING: 'custom_branding',
    AUDIT_LOG_EXPORT: 'audit_log_export',
};
