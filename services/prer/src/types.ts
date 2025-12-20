export interface MetricDefinition {
  name: string;
  baselineRate: number;
  minDetectableEffect: number;
}

export interface StopRule {
  maxDurationDays: number;
  maxUnits?: number;
}

export interface AnalysisPlan {
  method: 'difference-in-proportions';
  alpha: number;
  desiredPower: number;
}

export interface PowerCalculation {
  variantSampleSize: number;
  totalSampleSize: number;
  baselineRate: number;
  minDetectableEffect: number;
}

export type AuditStatus = 'SUCCESS' | 'REJECTED';

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  status: AuditStatus;
  detail: string;
}

export interface ExportRecord {
  id: string;
  createdAt: string;
  digest: string;
  payload: string;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  metrics: MetricDefinition[];
  stopRule: StopRule;
  analysisPlan: AnalysisPlan;
  status: 'draft' | 'registered' | 'running' | 'completed';
  createdAt: string;
  lockedAt?: string;
  powerAnalysis: Record<string, PowerCalculation>;
  auditLog: AuditEntry[];
  exports: ExportRecord[];
  results: Record<string, Array<{ variant: string; value: number }>>;
}
