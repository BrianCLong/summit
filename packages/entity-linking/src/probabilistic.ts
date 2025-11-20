/**
 * Probabilistic record linkage
 */

import type { ProbabilisticLink, ProbabilityFactor } from './types.js';

export class ProbabilisticLinker {
  private mProbabilities: Map<string, number>; // Match probabilities
  private uProbabilities: Map<string, number>; // Non-match probabilities

  constructor() {
    this.mProbabilities = new Map();
    this.uProbabilities = new Map();
  }

  /**
   * Calculate link probability using Fellegi-Sunter model
   */
  calculateLinkProbability(
    entity1: Record<string, any>,
    entity2: Record<string, any>,
    fields: string[]
  ): ProbabilisticLink {
    const factors: ProbabilityFactor[] = [];
    let logOdds = 0;

    for (const field of fields) {
      const value1 = entity1[field];
      const value2 = entity2[field];

      if (!value1 || !value2) continue;

      const agree = this.fieldsAgree(value1, value2);
      const mProb = this.mProbabilities.get(field) || 0.9;
      const uProb = this.uProbabilities.get(field) || 0.1;

      let weight: number;
      if (agree) {
        weight = Math.log(mProb / uProb);
      } else {
        weight = Math.log((1 - mProb) / (1 - uProb));
      }

      logOdds += weight;

      factors.push({
        name: field,
        value: agree ? 1 : 0,
        weight: weight,
        contribution: weight / (Math.abs(logOdds) || 1)
      });
    }

    // Convert log odds to probability
    const probability = 1 / (1 + Math.exp(-logOdds));

    return {
      sourceEntity: entity1.id || 'unknown',
      targetEntity: entity2.id || 'unknown',
      probability,
      factors
    };
  }

  /**
   * Check if two field values agree
   */
  private fieldsAgree(value1: any, value2: any): boolean {
    if (value1 === value2) return true;

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    return false;
  }

  /**
   * Train the probabilistic model with labeled data
   */
  train(
    matchPairs: Array<[Record<string, any>, Record<string, any>]>,
    nonMatchPairs: Array<[Record<string, any>, Record<string, any>]>,
    fields: string[]
  ): void {
    // Calculate m-probabilities (probability field agrees given match)
    for (const field of fields) {
      let matchAgreeCount = 0;

      for (const [entity1, entity2] of matchPairs) {
        if (this.fieldsAgree(entity1[field], entity2[field])) {
          matchAgreeCount++;
        }
      }

      const mProb = matchAgreeCount / matchPairs.length;
      this.mProbabilities.set(field, mProb);
    }

    // Calculate u-probabilities (probability field agrees given non-match)
    for (const field of fields) {
      let nonMatchAgreeCount = 0;

      for (const [entity1, entity2] of nonMatchPairs) {
        if (this.fieldsAgree(entity1[field], entity2[field])) {
          nonMatchAgreeCount++;
        }
      }

      const uProb = nonMatchAgreeCount / nonMatchPairs.length;
      this.uProbabilities.set(field, uProb);
    }
  }

  /**
   * Set m-probability for a field
   */
  setMProbability(field: string, probability: number): void {
    this.mProbabilities.set(field, probability);
  }

  /**
   * Set u-probability for a field
   */
  setUProbability(field: string, probability: number): void {
    this.uProbabilities.set(field, probability);
  }

  /**
   * Get m-probability for a field
   */
  getMProbability(field: string): number {
    return this.mProbabilities.get(field) || 0.9;
  }

  /**
   * Get u-probability for a field
   */
  getUProbability(field: string): number {
    return this.uProbabilities.get(field) || 0.1;
  }

  /**
   * Calculate field discriminating power
   */
  calculateDiscriminatingPower(field: string): number {
    const mProb = this.getMProbability(field);
    const uProb = this.getUProbability(field);

    // Higher ratio means more discriminating
    return mProb / uProb;
  }

  /**
   * Batch link records using probabilistic matching
   */
  batchLink(
    records: Record<string, any>[],
    fields: string[],
    threshold: number = 0.7
  ): ProbabilisticLink[] {
    const links: ProbabilisticLink[] = [];

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const link = this.calculateLinkProbability(
          records[i],
          records[j],
          fields
        );

        if (link.probability >= threshold) {
          links.push(link);
        }
      }
    }

    return links.sort((a, b) => b.probability - a.probability);
  }
}

/**
 * Expectation-Maximization algorithm for unsupervised learning
 */
export class EMLinker extends ProbabilisticLinker {
  /**
   * Train using EM algorithm without labeled data
   */
  trainEM(
    pairs: Array<[Record<string, any>, Record<string, any>]>,
    fields: string[],
    maxIterations: number = 100,
    tolerance: number = 0.001
  ): void {
    // Initialize with default probabilities
    for (const field of fields) {
      this.setMProbability(field, 0.9);
      this.setUProbability(field, 0.1);
    }

    let prevLogLikelihood = -Infinity;

    for (let iter = 0; iter < maxIterations; iter++) {
      // E-step: Calculate match probabilities
      const matchProbs: number[] = [];

      for (const [entity1, entity2] of pairs) {
        const link = this.calculateLinkProbability(entity1, entity2, fields);
        matchProbs.push(link.probability);
      }

      // M-step: Update parameters
      for (const field of fields) {
        let mNumerator = 0;
        let mDenominator = 0;
        let uNumerator = 0;
        let uDenominator = 0;

        for (let i = 0; i < pairs.length; i++) {
          const [entity1, entity2] = pairs[i];
          const matchProb = matchProbs[i];
          const agree = this.fieldsAgree(entity1[field], entity2[field]) ? 1 : 0;

          mNumerator += matchProb * agree;
          mDenominator += matchProb;
          uNumerator += (1 - matchProb) * agree;
          uDenominator += 1 - matchProb;
        }

        const newMProb = mDenominator > 0 ? mNumerator / mDenominator : 0.9;
        const newUProb = uDenominator > 0 ? uNumerator / uDenominator : 0.1;

        this.setMProbability(field, newMProb);
        this.setUProbability(field, newUProb);
      }

      // Calculate log likelihood
      const logLikelihood = matchProbs.reduce(
        (sum, p) => sum + Math.log(p),
        0
      );

      // Check convergence
      if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
        break;
      }

      prevLogLikelihood = logLikelihood;
    }
  }

  private fieldsAgree(value1: any, value2: any): boolean {
    if (value1 === value2) return true;

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    return false;
  }
}
