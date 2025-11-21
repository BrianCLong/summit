/**
 * Difference-in-Differences Estimator
 */

import type { TreatmentEffect } from '../types/index.js';

export class DifferenceInDifferences {
  /**
   * Estimate treatment effect using DiD
   */
  estimate(
    treatmentGroupPre: number[],
    treatmentGroupPost: number[],
    controlGroupPre: number[],
    controlGroupPost: number[]
  ): TreatmentEffect {
    // Calculate means
    const treatmentPreMean = this.mean(treatmentGroupPre);
    const treatmentPostMean = this.mean(treatmentGroupPost);
    const controlPreMean = this.mean(controlGroupPre);
    const controlPostMean = this.mean(controlGroupPost);

    // DiD estimator
    const treatmentDiff = treatmentPostMean - treatmentPreMean;
    const controlDiff = controlPostMean - controlPreMean;
    const did = treatmentDiff - controlDiff;

    // Calculate standard error
    const se = this.calculateStandardError(
      treatmentGroupPre,
      treatmentGroupPost,
      controlGroupPre,
      controlGroupPost
    );

    // Confidence interval
    const confidence: [number, number] = [
      did - 1.96 * se,
      did + 1.96 * se,
    ];

    const pValue = this.calculatePValue(did, se);

    return {
      ate: did,
      att: did,
      confidence,
      pValue,
    };
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private variance(arr: number[]): number {
    const m = this.mean(arr);
    return arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (arr.length - 1);
  }

  private calculateStandardError(
    treatmentPre: number[],
    treatmentPost: number[],
    controlPre: number[],
    controlPost: number[]
  ): number {
    const varTreatmentPre = this.variance(treatmentPre);
    const varTreatmentPost = this.variance(treatmentPost);
    const varControlPre = this.variance(controlPre);
    const varControlPost = this.variance(controlPost);

    const se = Math.sqrt(
      varTreatmentPre / treatmentPre.length +
      varTreatmentPost / treatmentPost.length +
      varControlPre / controlPre.length +
      varControlPost / controlPost.length
    );

    return se;
  }

  private calculatePValue(effect: number, se: number): number {
    const zScore = Math.abs(effect / se);
    return zScore > 1.96 ? 0.05 : 0.10;
  }
}
