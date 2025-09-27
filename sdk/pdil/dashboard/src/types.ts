export interface PromptRunSummary {
  passed: boolean;
  taxonomy: string | null;
  severity: number;
}

export interface OutcomeSummary {
  case_id: string;
  baseline: PromptRunSummary;
  candidate: PromptRunSummary;
  coverage_delta: number;
  business_impact: number;
}

export interface ReplayAssessment {
  total_risk: number;
  coverage_delta: number;
  taxonomy_counts: Record<string, number>;
  regressions: string[];
}

export interface ReplayReport {
  seed: number;
  assessment: ReplayAssessment;
  outcomes: OutcomeSummary[];
}

export interface RankedOutcome extends OutcomeSummary {
  risk_contribution: number;
  taxonomy: string;
}
