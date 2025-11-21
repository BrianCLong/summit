import type { RatingResult, SandboxResult, StaticAnalysisResult } from './types.js';

const POLICY_VERSION = 'sum-rating-v1';

export function rateSubmission(analysis: StaticAnalysisResult, sandbox: SandboxResult): RatingResult {
  if (!analysis.passed) {
    return {
      rating: 'rejected',
      score: 0,
      rationale: collectRationale(analysis, sandbox),
    };
  }

  if (sandbox.status !== 'success') {
    return {
      rating: 'high-risk',
      score: 20,
      rationale: collectRationale(analysis, sandbox),
    };
  }

  const errorCount = analysis.issues.filter((i) => i.severity === 'error').length;
  const warningCount = analysis.issues.filter((i) => i.severity === 'warning').length;
  const taintScore = analysis.taintPaths.length * 5;
  const baseScore = Math.max(100 - errorCount * 40 - warningCount * 10 - taintScore, 5);

  let rating: RatingResult['rating'] = 'low-risk';
  if (baseScore < 40) {
    rating = 'high-risk';
  } else if (baseScore < 70) {
    rating = 'medium-risk';
  }

  return {
    rating,
    score: baseScore,
    rationale: collectRationale(analysis, sandbox),
  };
}

function collectRationale(analysis: StaticAnalysisResult, sandbox: SandboxResult): string[] {
  const reasons = new Set<string>();
  if (!analysis.passed) {
    analysis.issues.forEach((issue) => reasons.add(`${issue.rule}: ${issue.message}`));
  }
  if (analysis.taintPaths.length > 0) {
    analysis.taintPaths.forEach((path) => reasons.add(`Taint path detected: ${path}`));
  }
  if (sandbox.status !== 'success') {
    reasons.add(`Sandbox status: ${sandbox.status}`);
    if (sandbox.error) {
      reasons.add(`Sandbox error: ${sandbox.error}`);
    }
  }
  if (reasons.size === 0) {
    reasons.add('Submission meets SUM safety guidelines');
  }
  return Array.from(reasons).sort();
}

export function ratingPolicyVersion(): string {
  return POLICY_VERSION;
}
