import { YieldFact, YieldLink } from '../../../graphrag/ren/ecf';

export class YieldScoreCalculator {
  public calculateScore(facts: YieldFact[], links: YieldLink[]): number {
    let score = 0;

    for (const fact of facts) {
      let weight = 0.1;
      switch (fact.sensitivity) {
        case 'critical': weight = 1.0; break;
        case 'high': weight = 0.7; break;
        case 'medium': weight = 0.4; break;
        case 'low': weight = 0.1; break;
      }
      score += weight * fact.confidence;
    }

    // Boost score based on corroboration links
    for (const link of links) {
      score += 0.2 * link.strength;
    }

    return Math.min(score, 100); // Cap at 100
  }
}
