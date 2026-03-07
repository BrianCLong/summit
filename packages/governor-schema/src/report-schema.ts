// packages/governor-schema/src/report-schema.ts

export type GovernorMode = 'advisory' | 'required' | 'auto_remediate';

export interface GovernorFinding {
  evidence_id: string; // EV-GOV-[A-Z]+-\d{4}
  item_claim_ids?: string[];
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  message: string;
}

export interface BaseReport {
  repo_commit: string;
  policy_version: string;
  governor_mode: GovernorMode;
}

export interface ReviewReport extends BaseReport {
  findings: GovernorFinding[];
}

export interface DriftReport extends BaseReport {
  violations: GovernorFinding[];
}

export interface DepsRiskReport extends BaseReport {
  risks: GovernorFinding[];
}

export interface RemediationPlan extends BaseReport {
  patches: Array<{
    finding_evidence_id: string;
    patch: string;
  }>;
}

export interface MetricStamp {
  timestamp: string; // Only unstable timestamp
  latency_ms: number;
  memory_bytes: number;
}
