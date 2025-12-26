import { PilotConfig } from './pilot';

/**
 * Canonical tenant identity shared across API, ingestion, and RAG flows.
 */
export type TenantEnvironment = 'prod' | 'staging' | 'dev';

export type TenantPrivilegeTier = 'standard' | 'elevated' | 'break-glass';

export interface TenantContext {
  tenantId: string;
  environment: TenantEnvironment;
  privilegeTier: TenantPrivilegeTier;
  subject?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
  inferredEnvironment?: boolean;
  inferredPrivilege?: boolean;
}

export interface TenantPolicyInput {
  action: string;
  resourceTenantId?: string;
  environment?: TenantEnvironment;
}

export interface TenantPolicyDecision {
  allowed: boolean;
  reason?: string;
  status?: number;
  warning?: string;
}

// Re-introducing TenantConfig for logical configuration including Pilot
export interface TenantConfig {
  id: string;
  name: string;
  active: boolean;
  maintenanceMode?: boolean;
  features?: Record<string, boolean>;
  settings?: Record<string, any>;
  quotas?: {
    apiRequestsPerMinute?: number;
    storageLimit?: number; // in MB
    usersLimit?: number;
  };
  tier?: 'free' | 'pro' | 'enterprise' | 'pilot';
  pilotProgram?: PilotConfig;
}
