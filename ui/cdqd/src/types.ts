export interface DetectionResult {
  algorithm: string;
  score: number;
  threshold: number;
  details?: Record<string, unknown>;
}

export interface Anomaly {
  id: string;
  sequence: number;
  timestamp: string;
  target: string;
  entity?: string;
  metric?: string;
  value?: number;
  expected?: number;
  type: 'metric' | 'rule';
  ruleId?: string;
  ruleDescription?: string;
  explanations: DetectionResult[];
  payload?: Record<string, unknown>;
}

export interface AnomalyResponse {
  anomalies: Anomaly[];
}

export interface ReplayResult {
  matched: boolean;
  anomalies: Anomaly[];
}

export interface MetricConfig {
  seasonLength: number;
  alpha: number;
  beta: number;
  gamma: number;
  sensitivity: number;
  residualWindow: number;
  robustZWindow: number;
  robustZThreshold: number;
}

export type MetricConfigMap = Record<string, MetricConfig>;

export interface ConfigResponse {
  metrics: MetricConfigMap;
  rules: Record<string, unknown>;
  suppressions: unknown[];
}

export interface SuppressionInput {
  target: string;
  entity?: string;
  start: string;
  end: string;
  reason: string;
}

