/**
 * Evidence completeness scoring rubric.
 *
 * The rubric is intentionally deterministic: each criterion contributes a fixed weight
 * that always sums to 1.0 for a given profile. Missing criteria are captured verbosely
 * to support downstream auditing and remediation.
 */
export type EvidenceScoreProfile = 'receipt' | 'policyDecision';

export type EvidenceScoreResult = {
  score: number;
  missing: string[];
};

export type EvidenceScoreSeverity = 'ok' | 'warn' | 'error';

export type EvidenceScoreEvaluation = EvidenceScoreResult & {
  threshold: number;
  severity: EvidenceScoreSeverity;
  triggered: boolean;
};

interface EvidenceCriterion {
  id: string;
  weight: number;
  description: string;
  evaluate: (input: any) => boolean;
}

const receiptRubric: EvidenceCriterion[] = [
  {
    id: 'receiptId',
    weight: 0.1,
    description: 'Receipt identifier present',
    evaluate: (receipt) => Boolean(receipt?.receiptId),
  },
  {
    id: 'runId',
    weight: 0.12,
    description: 'Run identifier present',
    evaluate: (receipt) => Boolean(receipt?.runId),
  },
  {
    id: 'summary.runbook',
    weight: 0.1,
    description: 'Runbook name captured',
    evaluate: (receipt) => Boolean(receipt?.summary?.runbook),
  },
  {
    id: 'summary.status',
    weight: 0.08,
    description: 'Execution status recorded',
    evaluate: (receipt) => Boolean(receipt?.summary?.status),
  },
  {
    id: 'summary.startedAt',
    weight: 0.08,
    description: 'Start timestamp present',
    evaluate: (receipt) => Boolean(receipt?.summary?.startedAt),
  },
  {
    id: 'summary.endedAt',
    weight: 0.08,
    description: 'End timestamp present',
    evaluate: (receipt) => Boolean(receipt?.summary?.endedAt),
  },
  {
    id: 'signer.kid',
    weight: 0.05,
    description: 'Signer key id captured',
    evaluate: (receipt) => Boolean(receipt?.signer?.kid),
  },
  {
    id: 'signature',
    weight: 0.07,
    description: 'HMAC signature attached',
    evaluate: (receipt) => Boolean(receipt?.signature),
  },
  {
    id: 'evidence.artifacts',
    weight: 0.2,
    description: 'Artifacts listed with identifiers and hashes',
    evaluate: (receipt) =>
      Array.isArray(receipt?.evidence?.artifacts) &&
      receipt.evidence.artifacts.length > 0 &&
      receipt.evidence.artifacts.every(
        (artifact: any) => Boolean(artifact?.id) && Boolean(artifact?.sha256),
      ),
  },
  {
    id: 'hashes.inputsOutputs',
    weight: 0.12,
    description: 'Canonical input/output hashes present',
    evaluate: (receipt) => Boolean(receipt?.inputsHash) && Boolean(receipt?.outputsHash),
  },
];

const policyDecisionRubric: EvidenceCriterion[] = [
  {
    id: 'decision.id',
    weight: 0.25,
    description: 'Policy decision identifier present',
    evaluate: (decision) => Boolean(decision?.decisionId || decision?.id),
  },
  {
    id: 'decision.subject',
    weight: 0.2,
    description: 'Subject of policy decision recorded',
    evaluate: (decision) => Boolean(decision?.subject),
  },
  {
    id: 'decision.outcome',
    weight: 0.2,
    description: 'Outcome captured',
    evaluate: (decision) => Boolean(decision?.outcome),
  },
  {
    id: 'decision.evidence',
    weight: 0.2,
    description: 'Evidence references linked',
    evaluate: (decision) => Array.isArray(decision?.evidence) && decision.evidence.length > 0,
  },
  {
    id: 'decision.timestamp',
    weight: 0.15,
    description: 'Decision timestamp present',
    evaluate: (decision) => Boolean(decision?.timestamp),
  },
];

const rubricByProfile: Record<EvidenceScoreProfile, EvidenceCriterion[]> = {
  receipt: receiptRubric,
  policyDecision: policyDecisionRubric,
};

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function scoreEvidenceCompleteness(
  input: any,
  profile: EvidenceScoreProfile = 'receipt',
): EvidenceScoreResult {
  const rubric = rubricByProfile[profile];
  if (!rubric) {
    return { score: 0, missing: [] };
  }

  let score = 0;
  const missing: string[] = [];

  for (const criterion of rubric) {
    if (criterion.evaluate(input)) {
      score += criterion.weight;
    } else {
      missing.push(criterion.id);
    }
  }

  return { score: Number(score.toFixed(4)), missing };
}

export function evaluateEvidenceScore(
  result: EvidenceScoreResult,
  threshold: number,
  mode: Exclude<EvidenceScoreSeverity, 'ok'> = 'warn',
): EvidenceScoreEvaluation {
  const normalizedThreshold = clampToRange(Number.isFinite(threshold) ? threshold : 0, 0, 1);
  const triggered = result.score < normalizedThreshold;
  const severity: EvidenceScoreSeverity = triggered
    ? mode === 'error'
      ? 'error'
      : 'warn'
    : 'ok';

  return {
    ...result,
    threshold: normalizedThreshold,
    severity,
    triggered,
  };
}
