export interface TenantBudgetProfile {
  tenantId: string;
  maxRru: number;
  maxLatencyMs: number;
  concurrencyLimit: number;
}

export type CostCategory = 'infrastructure' | 'inference' | 'storage';

export interface QueryPlanSummary {
  estimatedRru: number;
  estimatedLatencyMs: number;
  depth: number;
  operations: number;
  containsCartesianProduct: boolean;
}

export interface PlanBudgetInput {
  tenantId: string;
  plan: QueryPlanSummary;
  profile?: TenantBudgetProfile;
  activeQueries: number;
  recentLatencyP95: number;
}

export interface BudgetThreshold {
  limit: number;
  alertThreshold: number;
}

export interface BudgetPolicy {
  categories: Record<CostCategory, BudgetThreshold>;
  anomalyStdDevTolerance: number;
  historyWindow: number;
  throttleOnBreach: boolean;
}

export interface SpendObservation {
  category: CostCategory;
  serviceId: string;
  feature: string;
  cost: number;
  timestamp: number;
}

export interface BudgetAlert {
  category: CostCategory;
  serviceId: string;
  feature: string;
  utilization: number;
  status: 'ok' | 'alert' | 'breach';
  action: CostGuardAction;
  reason: string;
  anomalies: string[];
  totals: {
    categorySpend: number;
    featureSpend: number;
  };
}

export type CostGuardAction = 'allow' | 'throttle' | 'kill';

export interface CostGuardDecision {
  action: CostGuardAction;
  reason: string;
  nextCheckMs: number;
  metrics: {
    projectedRru: number;
    projectedLatencyMs: number;
    saturation: number;
  };
}

export interface SlowQueryRecord {
  queryId: string;
  tenantId: string;
  startedAt: number;
  observedLatencyMs: number;
  reason: string;
}

export interface WorkloadSample {
  timestamp: number;
  cpuUtilization: number;
  memoryUtilization: number;
  throughputPerNode: number;
}

export interface ClusterNodeState {
  nodeId: string;
  cpuUtilization: number;
  memoryUtilization: number;
  activeSessions: number;
  maxSessions: number;
}

export interface ScalingForecast {
  cpuUtilization: number;
  memoryUtilization: number;
  throughputPerNode: number;
}

export type ScalingAction = 'scale_up' | 'scale_down' | 'hold';

export interface ScalingDecision {
  action: ScalingAction;
  recommendedNodes: number;
  reason: string;
  confidence: number;
  loadIndex: number;
  forecast: ScalingForecast;
}

export interface WorkloadAllocation {
  nodeId: string;
  targetSessions: number;
  delta: number;
}

export interface WorkloadBalancingPlan {
  strategy: 'rebalance' | 'maintain';
  reason: string;
  confidence: number;
  allocations: WorkloadAllocation[];
}

export interface ResourceOptimizationConfig {
  smoothingFactor: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  targetThroughputPerNode: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  minNodes: number;
  maxNodes: number;
  rebalanceTolerance: number;
  confidenceWindow: number;
}
