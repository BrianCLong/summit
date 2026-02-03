export class SystemicRiskIndex {
  /**
   * Calculates the Systemic Risk Index (SRI) based on cascading impact.
   * @param factors - A dictionary of risk factors and their weights.
   * @returns The calculated SRI score (0-100).
   */
  public calculate(factors: Record<string, number>): number {
    let totalRisk = 0;
    let totalWeight = 0;

    for (const [factor, score] of Object.entries(factors)) {
      // Heuristic weight application (simplified for MVP)
      const weight = this.getWeightForFactor(factor);
      totalRisk += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? (totalRisk / totalWeight) * 100 : 0;
  }

  private getWeightForFactor(factor: string): number {
    const weights: Record<string, number> = {
      "institutional_trust": 2.0,
      "market_stability": 1.5,
      "social_cohesion": 1.8,
      "platform_integrity": 1.0
    };
    return weights[factor] || 1.0;
  }
}
