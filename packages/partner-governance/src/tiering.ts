import { PartnerSegment, TierCriteria, TierScore, TierWeights } from "./types";

export const DEFAULT_WEIGHTS: TierWeights = {
  revenueInfluence: 0.4,
  deliveryQuality: 0.25,
  securityPosture: 0.2,
  supportMaturity: 0.15,
};

export const SEGMENT_THRESHOLDS: Record<PartnerSegment, number> = {
  [PartnerSegment.STRATEGIC]: 4.0,
  [PartnerSegment.GROWTH]: 2.5,
  [PartnerSegment.LONG_TAIL]: 0,
};

export function scoreTier(
  criteria: TierCriteria,
  weights: TierWeights = DEFAULT_WEIGHTS
): TierScore {
  const weightedScore =
    criteria.revenueInfluence * weights.revenueInfluence +
    criteria.deliveryQuality * weights.deliveryQuality +
    criteria.securityPosture * weights.securityPosture +
    criteria.supportMaturity * weights.supportMaturity;

  const maxScore =
    5 * weights.revenueInfluence +
    5 * weights.deliveryQuality +
    5 * weights.securityPosture +
    5 * weights.supportMaturity;

  return {
    weightedScore,
    normalizedScore: parseFloat(((weightedScore / maxScore) * 5).toFixed(2)),
    criteriaBreakdown: {
      revenueInfluence: criteria.revenueInfluence * weights.revenueInfluence,
      deliveryQuality: criteria.deliveryQuality * weights.deliveryQuality,
      securityPosture: criteria.securityPosture * weights.securityPosture,
      supportMaturity: criteria.supportMaturity * weights.supportMaturity,
    },
  };
}

export function determineSegment(score: TierScore): PartnerSegment {
  if (score.normalizedScore >= SEGMENT_THRESHOLDS[PartnerSegment.STRATEGIC]) {
    return PartnerSegment.STRATEGIC;
  }
  if (score.normalizedScore >= SEGMENT_THRESHOLDS[PartnerSegment.GROWTH]) {
    return PartnerSegment.GROWTH;
  }
  return PartnerSegment.LONG_TAIL;
}
