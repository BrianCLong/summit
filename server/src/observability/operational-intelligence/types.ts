export type SignalKind = 'metric' | 'log' | 'trace';

type Severity = 'info' | 'warn' | 'error' | 'critical';

type TraceStatus = 'ok' | 'error' | 'fault';

export interface BaseSignal {
  id: string;
  kind: SignalKind;
  service: string;
  timestamp: number;
  correlationId?: string;
  traceId?: string;
  severity?: Severity;
  attributes?: Record<string, unknown>;
}

export interface MetricSignal extends BaseSignal {
  kind: 'metric';
  name: string;
  value: number;
  unit?: string;
  expected?: {
    p95?: number;
    upperBound?: number;
    lowerBound?: number;
  };
}

export interface LogSignal extends BaseSignal {
  kind: 'log';
  message: string;
  stack?: string;
}

export interface TraceSignal extends BaseSignal {
  kind: 'trace';
  spanId: string;
  durationMs: number;
  operation: string;
  status?: TraceStatus;
}

export type ObservabilitySignal = MetricSignal | LogSignal | TraceSignal;

export interface CorrelatedSignalGroup {
  correlationId: string;
  services: Set<string>;
  traceIds: Set<string>;
  windowStart: number;
  windowEnd: number;
  signals: ObservabilitySignal[];
}

export interface HealthSnapshot {
  from: number;
  to: number;
  errorRate: number;
  latencyP95: number;
  throughput: number;
  signalsAnalyzed: number;
  serviceHealth: Record<string, {
    errorRate: number;
    latencyP95: number;
  }>;
}

export interface RootCauseInsight {
  correlationId: string;
  probableService: string;
  confidence: number;
  contributingSignals: Array<{
    id: string;
    kind: SignalKind;
    weight: number;
    detail: string;
  }>;
  impactedServices: string[];
  remediations: string[];
}

export interface AnomalyPrediction {
  signal: MetricSignal;
  predictedValue: number;
  probability: number;
  isLikelyAnomaly: boolean;
  rationale: string;
}

export interface FailureStep {
  description: string;
  expectedSignals: Array<{
    service: string;
    name?: string;
    kind?: SignalKind;
    severity?: Severity;
  }>;
  successCriteria: string;
}

export interface FailureScenario {
  id: string;
  name: string;
  owner: string;
  blastRadius: 'service' | 'regional' | 'global';
  steps: FailureStep[];
  expectedRecoveryMinutes: number;
}

export interface SimulationResult {
  scenarioId: string;
  completed: boolean;
  outcomes: Array<{
    step: string;
    matchedSignals: ObservabilitySignal[];
    notes: string;
  }>;
  recoveryEtaMinutes?: number;
}

export interface ServiceDependencyEdge {
  from: string;
  to: string;
  criticality: number; // 0-1 weighting
}
