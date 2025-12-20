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
