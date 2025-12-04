export type PlanTier = 'starter' | 'standard' | 'premium' | 'enterprise';

export interface PlanLimits {
  api_rpm: number;
  ingest_eps: number;
  egress_gb_day: number;
}

export interface TenantQuota {
  tenantId: string;
  plan: PlanTier;
  customLimits?: Partial<PlanLimits>;
}

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
}
