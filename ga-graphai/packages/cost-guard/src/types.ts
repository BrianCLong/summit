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

export type QueueScalingAction = "scale_up" | "scale_down" | "hold";

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

export type CostGuardAction = "allow" | "throttle" | "kill";

export interface CostGuardDecision {
  action: CostGuardAction;
  reason: string;
  reasonCode?: string;
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
  reasonCode?: string;
}

export type PolicyGateAction = "allow" | "deny" | "warn";

export interface PolicyGateInput {
  tenantId: string;
  action: "read" | "write" | "export";
  budgetTags?: string[];
  abacTags?: string[];
  estimatedCostUsd?: number;
  requiresApproval?: boolean;
  allowlistTags?: string[];
  denylistTags?: string[];
}

export interface PolicyGateDecision {
  action: PolicyGateAction;
  reasons: string[];
  evaluatedAt: string;
  tags: string[];
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

export type ScalingAction = "scale_up" | "scale_down" | "hold";

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
  kind: "ScaledObject";
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
  strategy: "rebalance" | "maintain";
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

export interface JourneyStepTarget {
  journey: string;
  steps: Record<string, number>;
}

export interface JourneyTelemetrySample {
  journey: string;
  step: string;
  p95: number;
  errorRate: number;
  sampleRate: number;
  cacheHit: boolean;
  payloadBytes: number;
  tenant?: string;
}

export interface PerformanceBudgetResult {
  status: "pass" | "breach" | "warn";
  reason: string;
  targetMs: number;
  observedMs: number;
  annotations: Record<string, string | number | boolean>;
}

export type OffenderKind = "endpoint" | "query" | "page";

export interface OffenderRecord {
  id: string;
  kind: OffenderKind;
  p95Ms: number;
  errorRate: number;
  volume: number;
  owner?: string;
  lastDeployId?: string;
  exemplarTraceUrl?: string;
}

export interface OffenderBoard {
  slowestEndpoints: OffenderRecord[];
  slowestQueries: OffenderRecord[];
  slowestPages: OffenderRecord[];
}

export interface CacheConfig {
  defaultTtlMs: number;
  jitterPct: number;
  negativeTtlMs: number;
}

export interface CacheEntry<TValue> {
  key: string;
  tenantId: string;
  value: TValue;
  checksum: string;
  expiresAt: number;
  negative: boolean;
}

export interface CacheRetrieval<TValue> {
  value: TValue;
  negative?: boolean;
}

export interface ResponseShapeOptions {
  allowedFields: string[];
  pageSizeLimit: number;
  tenantTier: "standard" | "premium" | "strategic";
  compressionThresholdBytes: number;
  version: string;
  partial?: boolean;
  offset?: number;
  limit?: number;
}

export interface ShapedResponse {
  version: string;
  checksum: string;
  partial: boolean;
  data: Record<string, unknown> | null;
  pagination: { offset: number; limit: number; total?: number };
  compressed?: Buffer;
  encoding?: "gzip" | "brotli";
}

export interface JobDefinition<TResult = unknown> {
  idempotencyKey: string;
  tenantId: string;
  classification: "cpu" | "io";
  handler: () => Promise<TResult>;
}

export interface JobExecutionResult<TResult = unknown> {
  id: string;
  tenantId: string;
  status: "success";
  durationMs: number;
  classification: JobDefinition["classification"];
  result: TResult;
}

export interface JobSchedulerConfig {
  defaultConcurrency: number;
  perTenantConcurrency: number;
  dedupeWindowMs: number;
}

export interface TelemetryBudgetConfig {
  logsPerMinute: number;
  metricsPerMinute: number;
  tracesPerMinute: number;
  cardinalityLimit: number;
}

export interface TelemetrySignal {
  kind: "logs" | "metrics" | "traces";
  labels?: Record<string, string>;
}

export interface TelemetryIngestResult {
  accepted: boolean;
  action: "allow" | "throttle" | "reject";
  reason: string;
}

export interface ReleaseMarker {
  owner: string;
  version: string;
  commitSha: string;
  emittedAt: string;
  annotations: Record<string, string>;
}
