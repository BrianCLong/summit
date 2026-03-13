import type { EvidenceItem, PGHypothesis } from "./types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function matchPlaybook(params: {
  playbook: any;
  actionSignaturesById: Record<string, any>;
  evidence: EvidenceItem[];
}): PGHypothesis {
  const { playbook, actionSignaturesById, evidence } = params;

  const considered = playbook.steps.map((s: any) => s.id as string);

  const matchedIndicators: Array<{ indicatorId: string; evidenceId: string; score: number }> = [];
  const missingEvidence: string[] = [];

  // Extremely simple baseline:
  // - An indicator matches if evidence.signal contains indicator.signal (case-insensitive)
  // - Confidence = normalized sum of matched indicator weights
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const step of playbook.steps) {
    const sig = actionSignaturesById[step.actionSignatureId];
    if (!sig) {
      missingEvidence.push(`missing_action_signature:${step.actionSignatureId}`);
      continue;
    }

    for (const ind of sig.indicators ?? []) {
      const w = Number(ind.weight ?? 0);
      totalWeight += w;

      const found = evidence.find(ev =>
        ev.signal.toLowerCase().includes(String(ind.signal).toLowerCase())
      );

      if (found) {
        matchedWeight += w;
        matchedIndicators.push({
          indicatorId: ind.id,
          evidenceId: found.id,
          score: clamp01(w) // placeholder: score == weight
        });
      } else {
        missingEvidence.push(`indicator_not_seen:${ind.id}`);
      }
    }
  }

  const confidence = totalWeight > 0 ? clamp01(matchedWeight / totalWeight) : 0;

  // Plausible steps: any step with >= 1 matched indicator in its signature
  const plausibleStepIds = playbook.steps
    .filter((step: any) => {
      const sig = actionSignaturesById[step.actionSignatureId];
      if (!sig) return false;
      const indIds = new Set((sig.indicators ?? []).map((i: any) => i.id));
      return matchedIndicators.some(mi => indIds.has(mi.indicatorId));
    })
    .map((s: any) => s.id as string);

  const notes =
    "Analytic hypothesis: evidence exhibits partial overlap with this playbook’s observable indicator set. " +
    "This output is non-prescriptive: it does not recommend actions, only highlights evidentiary fit and gaps.";

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
