/**
 * Logistic Risk Scoring Model
 */

import type { RiskScore, RiskFactor } from '../types/index.js';

export class LogisticRiskScorer {
  private coefficients: number[] = [];
  private intercept: number = 0;
  private featureNames: string[] = [];
  private fitted: boolean = false;

  /**
   * Fit logistic regression model
   */
  fit(features: number[][], labels: number[], featureNames?: string[]): void {
    this.featureNames = featureNames || features[0].map((_, i) => `feature_${i}`);

    // Initialize coefficients
    this.coefficients = new Array(features[0].length).fill(0);
    this.intercept = 0;

    // Gradient descent
    const learningRate = 0.01;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      const predictions = this.predictProba(features);

      // Update intercept
      let interceptGrad = 0;
      for (let i = 0; i < labels.length; i++) {
        interceptGrad += predictions[i] - labels[i];
      }
      this.intercept -= learningRate * interceptGrad / labels.length;

      // Update coefficients
      for (let j = 0; j < this.coefficients.length; j++) {
        let grad = 0;
        for (let i = 0; i < labels.length; i++) {
          grad += (predictions[i] - labels[i]) * features[i][j];
        }
        this.coefficients[j] -= learningRate * grad / labels.length;
      }
    }

    this.fitted = true;
  }

  /**
   * Calculate risk score for entity
   */
  score(entityId: string, features: number[]): RiskScore {
    if (!this.fitted) {
      throw new Error('Model must be fitted before scoring');
    }

    const probability = this.predictProbaSingle(features);
    const score = this.probabilityToScore(probability);
    const riskLevel = this.scoreToRiskLevel(score);
    const factors = this.calculateRiskFactors(features);

    return {
      entityId,
      score,
      probability,
      riskLevel,
      factors,
      timestamp: new Date(),
    };
  }

  /**
   * Batch scoring
   */
  scoreBatch(entityIds: string[], features: number[][]): RiskScore[] {
    return entityIds.map((id, i) => this.score(id, features[i]));
  }

  /**
   * Predict probabilities
   */
  private predictProba(features: number[][]): number[] {
    return features.map(f => this.predictProbaSingle(f));
  }

  /**
   * Predict probability for single sample
   */
  private predictProbaSingle(features: number[]): number {
    let logit = this.intercept;

    for (let i = 0; i < features.length; i++) {
      logit += this.coefficients[i] * features[i];
    }

    return this.sigmoid(logit);
  }

  /**
   * Convert probability to score (0-1000)
   */
  private probabilityToScore(probability: number): number {
    // Convert to 0-1000 scale with 500 as neutral
    return Math.round(500 + 500 * (1 - 2 * probability));
  }

  /**
   * Convert score to risk level
   */
  private scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 750) return 'low';
    if (score >= 500) return 'medium';
    if (score >= 250) return 'high';
    return 'critical';
  }

  /**
   * Calculate risk factors contribution
   */
  private calculateRiskFactors(features: number[]): RiskFactor[] {
    return this.featureNames.map((name, i) => ({
      name,
      weight: this.coefficients[i],
      value: features[i],
      contribution: this.coefficients[i] * features[i],
    }));
  }

  /**
   * Sigmoid function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
