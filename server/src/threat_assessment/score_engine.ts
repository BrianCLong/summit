import { getRecommendations } from './recommendations';
import { classifyRiskLevel, computeScoreBreakdown } from './score_math';
import { IndicatorObservation, ThreatAssessmentResult, ThreatContext } from './types';

const FLOOR_INDICATORS = new Set([
  'TA_ACCESS_002',
  'TA_APPROACH_001',
  'TA_COMM_006',
  'TA_PLAN_012',
  'TA_CTX_012',
]);

export function assessThreatCase(
  caseId: string,
  context: ThreatContext,
  observations: IndicatorObservation[],
): ThreatAssessmentResult {
  const breakdown = computeScoreBreakdown(context, observations);
  let riskLevel = classifyRiskLevel(breakdown.risk_score);
  const hasFloor = observations.some(
    (obs) => FLOOR_INDICATORS.has(obs.indicator_id) && obs.value >= 1,
  );

  if (hasFloor && (riskLevel === 'LOW' || riskLevel === 'GUARDED')) {
    riskLevel = 'ELEVATED';
  }
  if (breakdown.confidence < 0.65 && breakdown.risk_score < 0.85) {
    riskLevel = 'REVIEW_REQUIRED';
  }

  return {
    case_id: caseId,
    context,
    risk_score: breakdown.risk_score,
    risk_level: riskLevel,
    confidence: breakdown.confidence,
    score_breakdown: breakdown.score_breakdown,
    triggered_indicators: breakdown.triggered_indicators,
    contributing_factors: breakdown.contributing_factors,
    suppressing_factors: breakdown.suppressing_factors,
    evidence_ids: breakdown.evidence_ids,
    recommendations: getRecommendations(riskLevel),
  };
}
