import { CONTEXT_PACKS } from './context_packs';
import { EVIDENCE_ID_REGEX } from './config';
import { INDICATOR_BY_ID } from './indicator_registry';
import { IndicatorObservation, RiskLevel, ThreatContext } from './types';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function classifyRiskLevel(score: number): RiskLevel {
  if (score >= 0.85) return 'CRITICAL';
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.5) return 'ELEVATED';
  if (score >= 0.25) return 'GUARDED';
  return 'LOW';
}

export function computeScoreBreakdown(
  context: ThreatContext,
  observations: IndicatorObservation[],
) {
  let base = 0;
  let protective = 0;
  let unknownHighImportance = 0;
  const triggered: string[] = [];
  const evidence = new Set<string>();
  const families = new Set<string>();

  for (const obs of observations) {
    const indicator = INDICATOR_BY_ID.get(obs.indicator_id);
    if (!indicator) continue;

    const confidence = clamp(obs.confidence, 0.5, 1);
    const known = obs.known ?? true;
    if (!known && indicator.high_importance) unknownHighImportance += 1;
    const contribution = obs.value * indicator.default_weight * confidence;

    if (obs.value > 0) {
      triggered.push(obs.indicator_id);
      families.add(indicator.family);
      for (const evidenceId of obs.evidence_ids) {
        if (EVIDENCE_ID_REGEX.test(evidenceId)) evidence.add(evidenceId);
      }
    }

    if (indicator.direction === 'risk_down') {
      protective += contribution;
    } else {
      base += contribution;
    }
  }

  const contextPrior = CONTEXT_PACKS[context].prior;
  let interactionBonus = 0;
  if (families.has('threat_communications') && families.has('planning')) {
    interactionBonus += 1.8;
  }
  if (families.has('approach') && families.has('capability_access')) {
    interactionBonus += 2.2;
  }
  if (families.has('escalation') && families.has('history')) interactionBonus += 2.5;
  if (families.has('fixation') && families.has('triggering_stressors')) {
    interactionBonus += 2.0;
  }

  const suppressionCap = 0.35 * (base + contextPrior + interactionBonus);
  const protectiveSuppression = Math.min(suppressionCap, protective);
  const uncertaintyPenalty = 0.08 * unknownHighImportance;
  const raw =
    base + contextPrior + interactionBonus - protectiveSuppression - uncertaintyPenalty;
  const riskScore = clamp(sigmoid(0.18 * (raw - 12)), 0, 1);
  const confidence = clamp(
    0.55 +
      0.45 *
        (observations.reduce((a, o) => a + clamp(o.confidence, 0.5, 1), 0) / 120),
    0.55,
    0.98,
  );

  return {
    risk_score: Number(riskScore.toFixed(4)),
    confidence: Number(confidence.toFixed(4)),
    triggered_indicators: triggered.sort(),
    evidence_ids: [...evidence].sort(),
    contributing_factors: [...families].sort(),
    suppressing_factors:
      protectiveSuppression > 0 ? ['protective_factors_present'] : [],
    score_breakdown: {
      base: Number(base.toFixed(4)),
      context_prior: contextPrior,
      interaction_bonus: Number(interactionBonus.toFixed(4)),
      protective_suppression: Number(protectiveSuppression.toFixed(4)),
      uncertainty_penalty: Number(uncertaintyPenalty.toFixed(4)),
    },
  };
}
