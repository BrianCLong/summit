import type { EvidenceItem, PGHypothesis } from './types';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function matchPlaybook(params: {
  playbook: any;
  actionSignaturesById: Record<string, any>;
  evidence: EvidenceItem[];
}): PGHypothesis {
  const { playbook, actionSignaturesById, evidence } = params;

  const considered = playbook.steps.map((step: any) => step.id as string);
  const matchedIndicators: Array<{ indicatorId: string; evidenceId: string; score: number }> = [];
  const missingEvidence: string[] = [];

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const step of playbook.steps) {
    const signature = actionSignaturesById[step.actionSignatureId];
    if (!signature) {
      missingEvidence.push(`missing_action_signature:${step.actionSignatureId}`);
      continue;
    }

    for (const indicator of signature.indicators ?? []) {
      const weight = Number(indicator.weight ?? 0);
      totalWeight += weight;

      const foundEvidence = evidence.find((evidenceItem) =>
        evidenceItem.signal
          .toLowerCase()
          .includes(String(indicator.signal).toLowerCase())
      );

      if (foundEvidence) {
        matchedWeight += weight;
        matchedIndicators.push({
          indicatorId: indicator.id,
          evidenceId: foundEvidence.id,
          score: clamp01(weight)
        });
      } else {
        missingEvidence.push(`indicator_not_seen:${indicator.id}`);
      }
    }
  }

  const confidence = totalWeight > 0 ? clamp01(matchedWeight / totalWeight) : 0;

  const plausibleStepIds = playbook.steps
    .filter((step: any) => {
      const signature = actionSignaturesById[step.actionSignatureId];
      if (!signature) return false;
      const indicatorIds = new Set((signature.indicators ?? []).map((indicator: any) => indicator.id));
      return matchedIndicators.some((matchedIndicator) =>
        indicatorIds.has(matchedIndicator.indicatorId)
      );
    })
    .map((step: any) => step.id as string);

  const notes =
    'Analytic hypothesis: evidence exhibits partial overlap with this playbook\'s observable indicator set. ' +
    'This output is non-prescriptive: it does not recommend actions, only highlights evidentiary fit and gaps.';

  return {
    playbookId: playbook.id,
    branch: {
      stepIdsConsidered: considered,
      stepIdsPlausible: plausibleStepIds
    },
    confidence,
    matchedIndicators,
    missingEvidence,
    notes
  };
}
