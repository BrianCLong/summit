export type ResourceType = 'cpu' | 'memory' | 'storage' | 'tokens' | 'requests';

export type WorkloadClass =
  | 'READ_ONLY'
  | 'PLANNING'
  | 'EVALUATION'
  | 'WRITE_ACTION'
  | 'MULTI_AGENT'
  | 'PLUGIN';

export interface ResourceLimit {
  limit: number;
  period: 'second' | 'minute' | 'hour' | 'day' | 'month';
}

export interface UsageRecord {
  resource: ResourceType;
  workloadClass?: WorkloadClass;
  amount: number;
  timestamp: Date;
}

export interface TenantQuota {
  tenantId: string;
  limits: Record<ResourceType, ResourceLimit>;
  workloadLimits?: Partial<Record<WorkloadClass, ResourceLimit>>;
}

export interface AllocationRequest {
  tenantId: string;
  workloadClass?: WorkloadClass;
  resources: Partial<Record<ResourceType, number>>;
  priority: number;
  jobId: string;
}

export interface AllocationResult {
  granted: boolean;
  reason?: string;
}

export enum CostDomain {
  AGENT_RUNS = 'agent_runs',
  COORDINATION = 'coordination',
  EVALUATION = 'evaluation',
  WRITE_ACTIONS = 'write_actions',
  MARKETPLACE = 'marketplace',
  CI_ASSURANCE = 'ci_assurance',
  API_REQUEST = 'api_request',
}

export interface CostAttribution {
    agentId?: string;
    capability?: string;
    tenantId: string;
}

export interface BudgetConfig {
  domain: CostDomain;
  limit: number;
  period: 'daily' | 'monthly';
  currency: string; // e.g., 'USD', 'CREDITS'
  alertThresholds: number[]; // e.g., [0.5, 0.8, 1.0]
  hardStop: boolean; // Enforce hard stop when budget exceeded
}

export interface BudgetStatus extends BudgetConfig {
  currentSpending: number;
  forecastedSpending: number;
  periodStart: Date;
  periodEnd: Date;
  triggeredThresholds?: number[];
}

export type PlanTier = 'starter' | 'standard' | 'premium' | 'enterprise';

export interface PlanLimits {
  api_rpm: number;
  ingest_eps: number;
  egress_gb_day: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
}
