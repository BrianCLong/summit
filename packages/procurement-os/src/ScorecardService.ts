import { VendorScorecard, RiskTier } from "./types";

export class ScorecardService {
  buildScorecard(
    vendor: string,
    metrics: {
      spend: number;
      usage: number;
      reliability: number;
      risk: number;
      businessValue: number;
      tier: RiskTier;
    }
  ): VendorScorecard {
    const normalizedUsage = this.normalize(metrics.usage);
    const normalizedReliability = this.normalize(metrics.reliability);
    const normalizedRisk = 1 - this.normalize(metrics.risk);
    const normalizedBusinessValue = this.normalize(metrics.businessValue);

    const score =
      normalizedUsage * 0.2 +
      normalizedReliability * 0.25 +
      normalizedRisk * 0.25 +
      normalizedBusinessValue * 0.3;

    return {
      vendor,
      spend: metrics.spend,
      usage: metrics.usage,
      reliability: metrics.reliability,
      risk: metrics.risk,
      businessValue: metrics.businessValue,
      tier: metrics.tier,
      score,
      renewalRecommendation: this.recommendation(score, metrics.tier),
    };
  }

  private normalize(value: number): number {
    if (value < 0) return 0;
    if (value > 100) return 1;
    return value / 100;
  }

  private recommendation(score: number, tier: RiskTier): VendorScorecard["renewalRecommendation"] {
    if (score >= 0.8 && tier >= 2) return "renew";
    if (score >= 0.6) return "re-negotiate";
    if (score >= 0.4) return "replace";
    return "retire";
  }
}
