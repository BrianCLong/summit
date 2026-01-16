import { ToolType } from './toolType.js';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface EvidenceNoiseSignals {
  source_agreement_score: number;
  retrieval_entropy: number;
  contradiction_count: number;
  provenance_coverage: number;
  recency_risk: number;
  recency_known: boolean;
}

export interface VerificationSignals {
  exec_error: number;
  parse_error: number;
  assertion_fail: number;
  test_fail: number;
}

export interface ProvenanceCoverage {
  coverage: number;
  sources_with_provenance: number;
  total_sources: number;
}

export interface ConfidenceReport {
  p_correct: number;
  tool_types_used: ToolType[];
  noise_signals: EvidenceNoiseSignals;
  verification_signals: VerificationSignals;
  contradiction_count: number;
  provenance_coverage: ProvenanceCoverage;
  risk_tier: RiskTier;
  notes: string[];
  timestamp: string;
}

export const createEmptyVerificationSignals = (): VerificationSignals => ({
  exec_error: 0,
  parse_error: 0,
  assertion_fail: 0,
  test_fail: 0,
});

export const validateConfidenceReport = (report: ConfidenceReport): string[] => {
  const errors: string[] = [];
  if (Number.isNaN(report.p_correct) || report.p_correct < 0 || report.p_correct > 1) {
    errors.push('p_correct must be between 0 and 1.');
  }
  if (!Array.isArray(report.tool_types_used) || report.tool_types_used.length === 0) {
    errors.push('tool_types_used must contain at least one tool type.');
  }
  if (!report.timestamp) {
    errors.push('timestamp is required.');
  }
  if (report.noise_signals.source_agreement_score < 0 || report.noise_signals.source_agreement_score > 1) {
    errors.push('noise_signals.source_agreement_score must be between 0 and 1.');
  }
  if (report.noise_signals.retrieval_entropy < 0 || report.noise_signals.retrieval_entropy > 1) {
    errors.push('noise_signals.retrieval_entropy must be between 0 and 1.');
  }
  if (report.noise_signals.provenance_coverage < 0 || report.noise_signals.provenance_coverage > 1) {
    errors.push('noise_signals.provenance_coverage must be between 0 and 1.');
  }
  if (report.provenance_coverage.coverage < 0 || report.provenance_coverage.coverage > 1) {
    errors.push('provenance_coverage.coverage must be between 0 and 1.');
  }
  if (report.provenance_coverage.total_sources < 0) {
    errors.push('provenance_coverage.total_sources must be >= 0.');
  }
  if (report.provenance_coverage.sources_with_provenance < 0) {
    errors.push('provenance_coverage.sources_with_provenance must be >= 0.');
  }
  return errors;
};
