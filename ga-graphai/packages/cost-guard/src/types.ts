export interface TenantBudgetProfile {
  tenantId: string;
  maxRru: number;
  maxLatencyMs: number;
  concurrencyLimit: number;
}

export interface WorkloadQueueSignal {
  queueDepth: number;
  p95LatencyMs: number;
  costPerJobUsd: number;
  budgetConsumptionRatio?: number;
  saturationRatio?: number;
}

export type QueueScalingAction = 'scale_up' | 'scale_down' | 'hold';

export interface QueueScalingDecision {
  action: QueueScalingAction;
  score: number;
  recommendedReplicas: number;
  reason: string;
  inputs: WorkloadQueueSignal;
}

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

export interface BudgetThresholds {
  warnRatio: number;
  enforceRatio: number;
}

export interface WorkspaceBudgetConfig {
  workspace: string;
  owner: string;
  monthlyCap: number;
  throttleLimits?: {
    maxRru?: number;
    maxLatencyMs?: number;
  };
  rollover?: boolean;
}

export interface BudgetDecision {
  workspace: string;
  action: 'allow' | 'deny' | 'simulate';
  remaining: number;
  appealed?: boolean;
  reason: string;
  obligations: string[];
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

export interface QueueRuntimeSignals {
  queueName: string;
  backlog: number;
  inflight: number;
  arrivalRatePerSecond: number;
  serviceRatePerSecondPerWorker: number;
  observedP95LatencyMs: number;
  costPerJobUsd: number;
  spendRatePerMinuteUsd: number;
}

export interface QueueSloConfig {
  targetP95Ms: number;
  maxCostPerMinuteUsd: number;
  backlogTargetSeconds: number;
  minReplicas: number;
  maxReplicas: number;
  scaleStep: number;
  stabilizationSeconds: number;
  maxScaleStep?: number;
  errorBudgetMinutes?: number;
  latencyBurnThreshold?: number;
  costBurnThreshold?: number;
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

export interface QueueScalingTelemetry {
  latencyPressure: number;
  backlogPressure: number;
  costPressure: number;
  backlogSeconds: number;
  sloTargetSeconds: number;
  sloBurnRate: number;
  costBurnRate: number;
  adaptiveScaleStep: number;
}

export interface QueueScalingDecision {
  action: ScalingAction;
  recommendedReplicas: number;
  reason: string;
  telemetry: QueueScalingTelemetry;
  kedaMetric: {
    metricName: string;
    labels: Record<string, string>;
    value: number;
    query: string;
  };
  alerts: QueueAlertConfig;
}

export interface KedaTrigger {
  type: string;
  metadata: Record<string, string>;
  authenticationRef?: { name: string };
}

export interface KedaScaledObjectSpec {
  apiVersion: string;
  kind: 'ScaledObject';
  metadata: { name: string; namespace: string; labels?: Record<string, string> };
  spec: {
    scaleTargetRef: { name: string };
    pollingInterval?: number;
    cooldownPeriod?: number;
    minReplicaCount?: number;
    maxReplicaCount?: number;
    fallback?: { failureThreshold: number; replicas: number };
    advanced?: { horizontalPodAutoscalerConfig?: Record<string, unknown> };
    triggers: KedaTrigger[];
  };
}

export interface QueueAlertConfig {
  fastBurnRateQuery: string;
  slowBurnRateQuery: string;
  costAnomalyQuery: string;
  labels: Record<string, string>;
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
