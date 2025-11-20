/**
 * Learning to Rank (LTR) implementation
 * Simplified LambdaMART-inspired model
 */

import type { LTRModel, TrainingExample, RankingFeatures } from '../types.js';
import * as fs from 'fs/promises';

export class LinearRanker implements LTRModel {
  readonly name: string = 'linear-ranker';
  readonly type: 'linear' = 'linear';
  readonly features: string[];

  private weights: Map<string, number>;
  private trained: boolean = false;

  constructor(features: string[]) {
    this.features = features;
    this.weights = new Map();

    // Initialize weights
    for (const feature of features) {
      this.weights.set(feature, 0);
    }
  }

  /**
   * Train the ranker using gradient descent
   */
  async train(examples: TrainingExample[]): Promise<void> {
    const learningRate = 0.01;
    const iterations = 100;

    // Group examples by query
    const queriesMap = new Map<string, TrainingExample[]>();
    for (const example of examples) {
      if (!queriesMap.has(example.queryId)) {
        queriesMap.set(example.queryId, []);
      }
      queriesMap.get(example.queryId)!.push(example);
    }

    // Training loop
    for (let iter = 0; iter < iterations; iter++) {
      let totalLoss = 0;

      for (const [queryId, queryExamples] of queriesMap) {
        // Sort by true relevance
        const sorted = [...queryExamples].sort((a, b) => b.relevance - a.relevance);

        // Compute pairwise gradients
        for (let i = 0; i < sorted.length - 1; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            const higher = sorted[i];
            const lower = sorted[j];

            if (higher.relevance <= lower.relevance) continue;

            const higherScore = this.computeScore(higher.features);
            const lowerScore = this.computeScore(lower.features);

            // If ranking is wrong, update weights
            if (higherScore <= lowerScore) {
              const gradient = this.computeGradient(higher.features, lower.features);

              // Update weights
              for (const [feature, grad] of gradient) {
                const currentWeight = this.weights.get(feature) || 0;
                this.weights.set(feature, currentWeight + learningRate * grad);
              }

              totalLoss += 1;
            }
          }
        }
      }

      if (iter % 10 === 0) {
        console.log(`Iteration ${iter}, Loss: ${totalLoss}`);
      }
    }

    this.trained = true;
    console.log('Training completed');
  }

  /**
   * Predict relevance score
   */
  predict(features: RankingFeatures): number {
    return this.computeScore(features);
  }

  /**
   * Compute score from features
   */
  private computeScore(features: RankingFeatures): number {
    let score = 0;

    for (const feature of this.features) {
      const featureValue = this.getFeatureValue(features, feature);
      const weight = this.weights.get(feature) || 0;
      score += weight * featureValue;
    }

    return score;
  }

  /**
   * Compute gradient for pairwise update
   */
  private computeGradient(
    higherFeatures: RankingFeatures,
    lowerFeatures: RankingFeatures,
  ): Map<string, number> {
    const gradient = new Map<string, number>();

    for (const feature of this.features) {
      const higherValue = this.getFeatureValue(higherFeatures, feature);
      const lowerValue = this.getFeatureValue(lowerFeatures, feature);

      gradient.set(feature, higherValue - lowerValue);
    }

    return gradient;
  }

  /**
   * Get feature value from features object
   */
  private getFeatureValue(features: RankingFeatures, featureName: string): number {
    if (featureName in features) {
      const value = (features as any)[featureName];
      return typeof value === 'number' ? value : 0;
    }

    if (features.custom && featureName in features.custom) {
      return features.custom[featureName];
    }

    return 0;
  }

  /**
   * Save model to file
   */
  async save(path: string): Promise<void> {
    const model = {
      name: this.name,
      type: this.type,
      features: this.features,
      weights: Object.fromEntries(this.weights),
    };

    await fs.writeFile(path, JSON.stringify(model, null, 2));
    console.log(`Model saved to ${path}`);
  }

  /**
   * Load model from file
   */
  async load(path: string): Promise<void> {
    const content = await fs.readFile(path, 'utf-8');
    const model = JSON.parse(content);

    if (model.type !== this.type) {
      throw new Error(`Model type mismatch: expected ${this.type}, got ${model.type}`);
    }

    this.weights = new Map(Object.entries(model.weights));
    this.trained = true;

    console.log(`Model loaded from ${path}`);
  }

  /**
   * Get feature importances
   */
  getFeatureImportances(): Map<string, number> {
    const importances = new Map<string, number>();

    for (const [feature, weight] of this.weights) {
      importances.set(feature, Math.abs(weight));
    }

    // Normalize
    const total = Array.from(importances.values()).reduce((sum, val) => sum + val, 0);

    if (total > 0) {
      for (const [feature, importance] of importances) {
        importances.set(feature, importance / total);
      }
    }

    return importances;
  }
}
