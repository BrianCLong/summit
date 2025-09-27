export interface ComplianceRiskEntry {
  type: 'late_writes' | 'backfill';
  status: 'ok' | 'breach';
  allowed_days: number;
  projected_shift_days: number;
  delta_days: number;
  projected_horizon: string;
}

export interface PurposeTimeline {
  purpose: string;
  retention_days: number;
  baseline_deletion_horizon: string;
  late_write_horizon: string;
  backfill_horizon: string;
  compliance_risk: ComplianceRiskEntry[];
}

export interface DependencyImpact {
  name: string;
  type: 'index' | 'feature' | string;
  purpose: string;
  retention_days: number;
  latency_days: number;
  deletion_horizon: string;
  alignment_delta_days: number;
  impact: string;
}

export interface DatasetPlan {
  name: string;
  last_arrival: string;
  purposes: PurposeTimeline[];
  dependencies: DependencyImpact[];
}

export interface RetentionPlan {
  generated_at: string;
  clock_shift: {
    late_write_slip_days: number;
    backfill_days: number;
  };
  datasets: DatasetPlan[];
}

export interface TimelineRow {
  dataset: string;
  purpose: string;
  baselineHorizon: string;
  lateWriteHorizon: string;
  backfillHorizon: string;
  riskLevel: 'ok' | 'elevated' | 'breach';
  blockers: string[];
}

export interface DependencyRow {
  dataset: string;
  name: string;
  purpose: string;
  type: string;
  impact: string;
  alignmentDeltaDays: number;
}
