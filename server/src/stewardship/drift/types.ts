export enum DriftType {
  MODEL = 'MODEL',
  AGENT = 'AGENT',
  RISK = 'RISK',
  COST = 'COST',
}

export enum DriftSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface DriftSignal {
  type: DriftType;
  severity: DriftSeverity;
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DriftDetector {
  detect(): Promise<DriftSignal[]>;
}
