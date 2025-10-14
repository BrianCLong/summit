export type AssetKind =
  | 'microservice'
  | 'data-pipeline'
  | 'job-runner'
  | 'queue'
  | 'external-api'
  | 'infrastructure';

export interface AssetEndpoint {
  type: string;
  url: string;
  healthUrl?: string;
  capabilities?: string[];
}

export interface AssetCapability {
  name: string;
  description?: string;
  qualityOfService?: {
    latencyMs?: number;
    throughput?: number;
    reliability?: number;
    costPerUnit?: number;
  };
}

export interface AssetDescriptor {
  id: string;
  name: string;
  kind: AssetKind;
  cloud?: string;
  region?: string;
  version?: string;
  owner?: string;
  labels?: Record<string, string>;
  metadata?: Record<string, unknown>;
  capabilities?: AssetCapability[];
  endpoints?: AssetEndpoint[];
  lastSeen?: Date;
}

export interface DiscoveryProvider {
  id: string;
  description?: string;
  scan(): Promise<AssetDescriptor[]>;
  supportsIncremental?: boolean;
}

export type DiscoveryEventType = 'registered' | 'updated' | 'removed';

export interface DiscoveryEvent {
  type: DiscoveryEventType;
  asset: AssetDescriptor;
  previous?: AssetDescriptor;
}

export interface HealthSignal {
  assetId: string;
  metric: string;
  value: number;
  unit?: string;
  timestamp: Date;
  tags?: Record<string, string>;
  source?: string;
}

export interface HealthSnapshot {
  assetId: string;
  lastUpdated: Date;
  metrics: Record<string, number>;
  annotations: string[];
}

export type AnomalyTrend = 'spike' | 'drop' | 'drift' | 'oscillation';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalySignal {
  assetId: string;
  metric: string;
  severity: AnomalySeverity;
  score: number;
  trend: AnomalyTrend;
  message: string;
  timestamp: Date;
  window: number[];
}

export interface JobSpec {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiredCapabilities: string[];
  requirements?: {
    regions?: string[];
    clouds?: string[];
    complianceTags?: string[];
    maxLatencyMs?: number;
    budgetPerHour?: number;
    minReliability?: number;
    dataSovereignty?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface RoutingDecision {
  assetId: string;
  assetName: string;
  score: number;
  estimatedLatencyMs?: number;
  estimatedCostPerHour?: number;
  compliance?: string[];
  reasoning: string[];
}

export interface RoutingPlan {
  job: JobSpec;
  primary: RoutingDecision;
  fallbacks: RoutingDecision[];
}

export interface PolicyInput {
  asset: AssetDescriptor;
  intent: string;
  job?: JobSpec;
  signal?: HealthSignal | AnomalySignal;
  context?: Record<string, unknown>;
}

export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  directives?: Record<string, unknown>;
}

export interface PolicyHook {
  id: string;
  description?: string;
  evaluate(input: PolicyInput): PolicyEvaluation | Promise<PolicyEvaluation>;
}

export interface SelfHealingAction {
  type: string;
  targetAssetId?: string;
  payload?: Record<string, unknown>;
  estimatedImpact: 'low' | 'medium' | 'high';
  runbook?: string;
}

export interface SelfHealingPlan {
  strategyId: string;
  description: string;
  actions: SelfHealingAction[];
}

export interface SelfHealingContext {
  asset: AssetDescriptor;
  anomaly: AnomalySignal;
  snapshot: HealthSnapshot;
  policies: PolicyHook[];
}

export interface SelfHealingResult {
  strategyId: string;
  executed: boolean;
  actions: SelfHealingAction[];
  notes?: string;
}

export interface ResponseStrategy {
  id: string;
  description: string;
  supports(asset: AssetDescriptor): boolean;
  shouldTrigger(context: SelfHealingContext): boolean;
  execute(context: SelfHealingContext): Promise<SelfHealingResult>;
  cooldownMs?: number;
}

export interface OptimizationSample {
  assetId: string;
  timestamp: Date;
  latencyMs?: number;
  costPerHour?: number;
  throughput?: number;
  errorRate?: number;
  saturation?: number;
  computeUtilization?: number;
}

export interface AssetPerformanceSnapshot {
  assetId: string;
  latencyMs?: number;
  costPerHour?: number;
  throughput?: number;
  errorRate?: number;
  saturation?: number;
  computeUtilization?: number;
  lastUpdated: Date;
  sampleCount: number;
}

export interface OptimizationRecommendation {
  assetId: string;
  actions: string[];
  justification: string;
  confidence: number;
}

export interface IncidentReport {
  id: string;
  asset: AssetDescriptor;
  anomaly: AnomalySignal;
  snapshot: HealthSnapshot;
  plans: SelfHealingPlan[];
  timestamp: Date;
}
