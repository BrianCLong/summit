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

export enum CostDomain {
  AGENT_RUNS = 'agent_runs',
  COORDINATION = 'coordination',
  EVALUATION = 'evaluation',
  WRITE_ACTIONS = 'write_actions',
  MARKETPLACE = 'marketplace',
  CI_ASSURANCE = 'ci_assurance',
}

export interface BudgetConfig {
  domain: CostDomain;
  limit: number;
  period: 'daily' | 'monthly';
  currency: string; // e.g., 'USD', 'CREDITS'
  alertThresholds: number[]; // e.g., [0.5, 0.8, 1.0]
}

export interface BudgetStatus extends BudgetConfig {
  currentSpending: number;
  forecastedSpending: number;
  periodStart: Date;
  periodEnd: Date;
}
