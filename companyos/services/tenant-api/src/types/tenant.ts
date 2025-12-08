/**
 * CompanyOS Tenant Types
 *
 * Core type definitions for the Tenant Control Plane
 */

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'archived';
export type DataClassification = 'unclassified' | 'cui' | 'secret' | 'top-secret';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  dataRegion: string;
  classification: DataClassification;
  status: TenantStatus;
  isActive: boolean;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface TenantSettings {
  maxUsers?: number;
  allowedRegions?: string[];
  customBranding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
  [key: string]: unknown;
}

export interface TenantFeature {
  id: string;
  tenantId: string;
  flagName: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface TenantAuditEvent {
  id: string;
  tenantId?: string;
  eventType: string;
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  actorIp?: string;
  resourceType: string;
  resourceId?: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'enable'
  | 'disable'
  | 'login'
  | 'logout';

// GraphQL Input types
export interface CreateTenantInput {
  name: string;
  slug: string;
  description?: string;
  dataRegion?: string;
  classification?: DataClassification;
  settings?: TenantSettings;
}

export interface UpdateTenantInput {
  name?: string;
  description?: string;
  dataRegion?: string;
  classification?: DataClassification;
  status?: TenantStatus;
  settings?: TenantSettings;
}

export interface SetFeatureFlagInput {
  tenantId: string;
  flagName: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Standard feature flags available for tenants
export const TENANT_FEATURE_FLAGS = {
  AI_COPILOT_ACCESS: 'ai_copilot_access',
  BILLING_ENABLED: 'billing_enabled',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_ENABLED: 'export_enabled',
  API_ACCESS: 'api_access',
  SSO_ENABLED: 'sso_enabled',
  CUSTOM_BRANDING: 'custom_branding',
  AUDIT_LOG_EXPORT: 'audit_log_export',
} as const;

export type TenantFeatureFlagName =
  (typeof TENANT_FEATURE_FLAGS)[keyof typeof TENANT_FEATURE_FLAGS];

// Effective feature flags resolved for a tenant
export interface EffectiveFeatureFlags {
  aiCopilotAccess: boolean;
  billingEnabled: boolean;
  advancedAnalytics: boolean;
  exportEnabled: boolean;
  apiAccess: boolean;
  ssoEnabled: boolean;
  customBranding: boolean;
  auditLogExport: boolean;
  raw: Record<string, boolean>;
}
