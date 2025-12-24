
export enum AnomalyType {
  TEMPORAL = 'temporal',
  SPATIAL = 'spatial',
  NETWORK = 'network',
  BEHAVIORAL = 'behavioral',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface DetectionContext {
  type: AnomalyType;
  entityId: string;
  timestamp: number;
  data: any; // Flexible payload depending on type
  metadata?: Record<string, any>;
}

export interface Explanation {
  description: string;
  contributingFactors: Array<{
    factor: string;
    weight: number;
    value?: any;
  }>;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number; // 0 to 1
  severity: Severity;
  type: AnomalyType;
  entityId: string;
  timestamp: number;
  explanation?: Explanation;
  metadata?: Record<string, any>;
}

export interface Detector {
  type: AnomalyType;
  detect(context: DetectionContext): Promise<AnomalyResult>;
}

export interface Feedback {
  anomalyId: string; // Could be a hash of entityId + timestamp + type
  isFalsePositive: boolean;
  comments?: string;
  timestamp: number;
  userId?: string;
}
