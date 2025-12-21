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

export interface ChargebackTagSet {
  service: string;
  team: string;
  tenant: string;
  tier: string;
  env: 'prod' | 'staging' | 'dev' | 'preview' | (string & {});
  budget_owner: string;
  kill_switch_id: string;
  ledger_account: string;
}

export interface TaggableResource {
  id: string;
  tags: Partial<ChargebackTagSet>;
  annotations?: { ttlHours?: number };
}

export interface ChargebackValidation {
  isValid: boolean;
  missing: (keyof ChargebackTagSet)[];
  violations: string[];
  normalized: ChargebackTagSet;
  expiresAt?: Date;
}

export interface BudgetControl {
  domainId: string;
  monthlyBudgetUsd: number;
  owner?: string;
  onCallContact?: string;
}

export interface SpendSnapshot {
  actualMonthToDateUsd: number;
  projectedMonthToDateUsd?: number;
}

export interface BudgetAlert {
  domainId: string;
  threshold: 'normal' | '50' | '80' | '100';
  action: 'track' | 'notify' | 'escalate' | 'freeze';
  owner: string;
  onCall: string;
  message: string;
  nextCheckMinutes: number;
  freezeRequired: boolean;
  projected: number;
  actual: number;
  budget: number;
  varianceUsd: number;
  variancePct: number;
}

export interface CostRecord {
  domainId: string;
  resourceId: string;
  amountUsd: number;
  owner?: string;
  notes?: string;
}

export interface CostLedgerInput {
  currentWeekCosts: CostRecord[];
  previousWeekCosts: CostRecord[];
  topN?: number;
  notes?: string[];
}

export interface CostLedgerEntry {
  domainId: string;
  currentUsd: number;
  previousUsd: number;
  deltaUsd: number;
  deltaPct: number;
}

export interface CostLedger {
  generatedAt: Date;
  entries: CostLedgerEntry[];
  topMovers: {
    domainId: string;
    resourceId: string;
    deltaUsd: number;
    deltaPct: number;
    owner?: string;
    notes?: string;
  }[];
  accuracyTarget: string;
  notes: string[];
}

export interface KillSwitchDefinition {
  id: string;
  owner: string;
  description: string;
  tier: '0' | '1' | '2';
  lastTestedAt?: Date;
  testIntervalHours?: number;
}

export interface KillSwitchValidation {
  dueForTest: KillSwitchDefinition[];
  healthy: KillSwitchDefinition[];
  message: string;
}

export interface TelemetryPolicy {
  envRetentionDays: Record<string, number>;
  traceSampling: Record<string, number>;
  allowUnstructuredLogs: boolean;
  maxLabelCardinality: number;
}

export interface TelemetryPolicyDecision {
  retentionDays: number;
  traceSample: number;
  labels: ChargebackTagSet;
  violations: string[];
  maxLabelCardinality: number;
}

export interface VendorContract {
  vendor: string;
  owner: string;
  monthlyCostUsd: number;
  renewalDate: Date;
  utilizationRatio: number;
  overlapCategory?: string;
}

export interface VendorRecommendation {
  vendor: string;
  owner: string;
  monthlyCostUsd: number;
  daysToRenewal: number;
  recommendation: 'renegotiate' | 'monitor';
  rationale: string;
}
