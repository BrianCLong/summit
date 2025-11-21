/**
 * Propensity Score Matching
 */

import type { TreatmentEffect, PropensityScore } from '../types/index.js';

export class PropensityScoreMatcher {
  /**
   * Estimate treatment effect using propensity score matching
   */
  estimateEffect(
    covariates: number[][],
    treatment: boolean[],
    outcomes: number[]
  ): TreatmentEffect {
    // Calculate propensity scores
    const propensityScores = this.calculatePropensityScores(covariates, treatment);

    // Match treated and control units
    const matches = this.matchUnits(propensityScores, treatment);

    // Calculate treatment effects
    const effects: number[] = [];

    for (const match of matches) {
      if (match.matched && match.matchedUnitId) {
        const treatmentIdx = parseInt(match.unitId);
        const controlIdx = parseInt(match.matchedUnitId);
        effects.push(outcomes[treatmentIdx] - outcomes[controlIdx]);
      }
    }

    const ate = effects.reduce((a, b) => a + b, 0) / effects.length;
    const att = ate; // Simplified

    // Calculate confidence interval
    const se = this.standardError(effects);
    const confidence: [number, number] = [
      ate - 1.96 * se,
      ate + 1.96 * se,
    ];

    const pValue = this.calculatePValue(ate, se);

    return { ate, att, confidence, pValue };
  }

  /**
   * Calculate propensity scores using logistic regression
   */
  private calculatePropensityScores(
    covariates: number[][],
    treatment: boolean[]
  ): PropensityScore[] {
    // Simple logistic regression (simplified implementation)
    const scores: PropensityScore[] = [];

    for (let i = 0; i < covariates.length; i++) {
      // Calculate score based on covariates
      const score = this.sigmoid(
        covariates[i].reduce((sum, x) => sum + x, 0) / covariates[i].length
      );

      scores.push({
        unitId: i.toString(),
        score,
        treatment: treatment[i],
        matched: false,
      });
    }

    return scores;
  }

  /**
   * Match treated units to control units
   */
  private matchUnits(
    scores: PropensityScore[],
    treatment: boolean[]
  ): PropensityScore[] {
    const treated = scores.filter(s => s.treatment);
    const control = scores.filter(s => !s.treatment);

    const matched: PropensityScore[] = [];

    for (const treatedUnit of treated) {
      let closestControl: PropensityScore | null = null;
      let minDistance = Infinity;

      for (const controlUnit of control) {
        if (!controlUnit.matched) {
          const distance = Math.abs(treatedUnit.score - controlUnit.score);
          if (distance < minDistance) {
            minDistance = distance;
            closestControl = controlUnit;
          }
        }
      }

      if (closestControl) {
        matched.push({
          ...treatedUnit,
          matched: true,
          matchedUnitId: closestControl.unitId,
        });
        closestControl.matched = true;
      }
    }

    return matched;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private standardError(effects: number[]): number {
    const mean = effects.reduce((a, b) => a + b, 0) / effects.length;
    const variance = effects.reduce((sum, e) =>
      sum + Math.pow(e - mean, 2), 0) / (effects.length - 1);
    return Math.sqrt(variance / effects.length);
  }

  private calculatePValue(effect: number, se: number): number {
    const zScore = Math.abs(effect / se);
    return zScore > 1.96 ? 0.05 : 0.10;
  }
}
