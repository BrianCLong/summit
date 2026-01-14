import { CandidateArtifact, EvaluationMetrics, SafetyGate } from './types';

export class DefaultSafetyGate<TCandidate, TContext> implements SafetyGate<TCandidate, TContext> {
  constructor(private readonly allowlist: string[] = []) {}

  preEval(candidate: CandidateArtifact<TCandidate>, context: TContext) {
    void this.allowlist;
    void candidate;
    void context;
    return { ok: true, reasons: [] };
  }

  postEval(candidate: CandidateArtifact<TCandidate>, metrics: EvaluationMetrics, context: TContext) {
    void candidate;
    void context;
    if (metrics.safetyFlags && metrics.safetyFlags.length > 0) {
      return { ok: false, reasons: metrics.safetyFlags };
    }
    return { ok: true, reasons: [] };
  }
}
