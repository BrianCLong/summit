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
