/**
 * Gradient Boosting Classifier (XGBoost-style)
 */

import type { Dataset, PredictionResult, ModelPerformance } from '../types/index.js';

export interface GradientBoostingConfig {
  nEstimators: number;
  learningRate: number;
  maxDepth: number;
  minSamplesSplit: number;
  subsample: number;
  colsampleByTree: number;
  reg_lambda: number; // L2 regularization
  regAlpha: number; // L1 regularization
  earlyStoppingRounds?: number;
}

export class GradientBoostingClassifier {
  private config: GradientBoostingConfig;
  private trees: BoostingTree[] = [];
  private baseScore: number = 0;
  private classes: (string | number)[] = [];
  private fitted: boolean = false;

  constructor(config: Partial<GradientBoostingConfig> = {}) {
    this.config = {
      nEstimators: config.nEstimators || 100,
      learningRate: config.learningRate || 0.1,
      maxDepth: config.maxDepth || 6,
      minSamplesSplit: config.minSamplesSplit || 2,
      subsample: config.subsample || 1.0,
      colsampleByTree: config.colsampleByTree || 1.0,
      reg_lambda: config.reg_lambda || 1.0,
      regAlpha: config.regAlpha || 0.0,
      earlyStoppingRounds: config.earlyStoppingRounds,
    };
  }

  /**
   * Fit the gradient boosting model
   */
  fit(dataset: Dataset, validationData?: Dataset): void {
    const { features, labels } = dataset;
    this.classes = [...new Set(labels)];

    // Convert labels to numeric for binary classification
    const numericLabels = labels.map(l =>
      l === this.classes[0] ? 0 : 1
    );

    // Initialize predictions with base score
    this.baseScore = numericLabels.reduce((a, b) => a + b, 0) / numericLabels.length;
    let predictions = new Array(numericLabels.length).fill(this.baseScore);

    let bestValidationLoss = Infinity;
    let roundsWithoutImprovement = 0;

    // Boosting iterations
    for (let i = 0; i < this.config.nEstimators; i++) {
      // Calculate gradients and hessians
      const gradients = this.calculateGradients(numericLabels, predictions);
      const hessians = this.calculateHessians(predictions);

      // Subsample data
      const subsampleIndices = this.subsample(features.length);
      const subsampledFeatures = subsampleIndices.map(idx => features[idx]);
      const subsampledGradients = subsampleIndices.map(idx => gradients[idx]);
      const subsampledHessians = subsampleIndices.map(idx => hessians[idx]);

      // Build tree
      const tree = new BoostingTree(this.config);
      tree.fit(subsampledFeatures, subsampledGradients, subsampledHessians);
      this.trees.push(tree);

      // Update predictions
      const treePredictions = tree.predict(features);
      for (let j = 0; j < predictions.length; j++) {
        predictions[j] += this.config.learningRate * treePredictions[j];
      }

      // Early stopping
      if (validationData && this.config.earlyStoppingRounds) {
        const validationLoss = this.calculateLoss(
          validationData.labels.map(l => l === this.classes[0] ? 0 : 1),
          this.predictRaw(validationData.features)
        );

        if (validationLoss < bestValidationLoss) {
          bestValidationLoss = validationLoss;
          roundsWithoutImprovement = 0;
        } else {
          roundsWithoutImprovement++;
          if (roundsWithoutImprovement >= this.config.earlyStoppingRounds) {
            break;
          }
        }
      }
    }

    this.fitted = true;
  }

  /**
   * Predict class labels
   */
  predict(features: number[][]): PredictionResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    const rawPredictions = this.predictRaw(features);

    return rawPredictions.map(raw => {
      const probability = this.sigmoid(raw);
      const prediction = probability >= 0.5 ? this.classes[1] : this.classes[0];

      return {
        prediction,
        probability,
        confidence: Math.max(probability, 1 - probability),
      };
    });
  }

  /**
   * Predict raw scores (before sigmoid)
   */
  private predictRaw(features: number[][]): number[] {
    return features.map(sample => {
      let prediction = this.baseScore;

      for (const tree of this.trees) {
        prediction += this.config.learningRate * tree.predictSample(sample);
      }

      return prediction;
    });
  }

  /**
   * Calculate gradients (negative gradient of log loss)
   */
  private calculateGradients(labels: number[], predictions: number[]): number[] {
    return labels.map((label, i) => {
      const prob = this.sigmoid(predictions[i]);
      return label - prob;
    });
  }

  /**
   * Calculate hessians (second derivative of log loss)
   */
  private calculateHessians(predictions: number[]): number[] {
    return predictions.map(pred => {
      const prob = this.sigmoid(pred);
      return prob * (1 - prob);
    });
  }

  /**
   * Calculate log loss
   */
  private calculateLoss(labels: number[], predictions: number[]): number {
    let loss = 0;

    for (let i = 0; i < labels.length; i++) {
      const prob = this.sigmoid(predictions[i]);
      loss -= labels[i] * Math.log(prob + 1e-15) +
              (1 - labels[i]) * Math.log(1 - prob + 1e-15);
    }

    return loss / labels.length;
  }

  /**
   * Sigmoid function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Subsample data indices
   */
  private subsample(n: number): number[] {
    const sampleSize = Math.floor(n * this.config.subsample);
    const indices = Array.from({ length: n }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices.slice(0, sampleSize);
  }

  /**
   * Evaluate model
   */
  evaluate(testDataset: Dataset): ModelPerformance {
    const predictions = this.predict(testDataset.features);
    const predicted = predictions.map(p => p.prediction);
    const actual = testDataset.labels;

    let correct = 0;
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === predicted[i]) correct++;
    }

    return {
      accuracy: correct / actual.length,
    };
  }
}

/**
 * Boosting Tree with gradient and hessian support
 */
class BoostingTree {
  private config: GradientBoostingConfig;
  private root: BoostingNode | null = null;

  constructor(config: GradientBoostingConfig) {
    this.config = config;
  }

  fit(features: number[][], gradients: number[], hessians: number[]): void {
    this.root = this.buildTree(features, gradients, hessians, 0);
  }

  predict(features: number[][]): number[] {
    return features.map(sample => this.predictSample(sample));
  }

  predictSample(sample: number[]): number {
    if (!this.root) throw new Error('Tree not fitted');

    let node = this.root;
    while (!node.isLeaf) {
      if (sample[node.featureIndex!] <= node.threshold!) {
        node = node.left!;
      } else {
        node = node.right!;
      }
    }

    return node.weight!;
  }

  private buildTree(
    features: number[][],
    gradients: number[],
    hessians: number[],
    depth: number
  ): BoostingNode {
    // Check stopping criteria
    if (
      features.length < this.config.minSamplesSplit ||
      depth >= this.config.maxDepth
    ) {
      return this.createLeaf(gradients, hessians);
    }

    // Find best split
    const { featureIndex, threshold, gain } = this.findBestSplit(
      features,
      gradients,
      hessians
    );

    if (gain <= 0) {
      return this.createLeaf(gradients, hessians);
    }

    // Split data
    const { leftIndices, rightIndices } = this.splitData(features, featureIndex, threshold);

    // Recursively build subtrees
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftGradients = leftIndices.map(i => gradients[i]);
    const leftHessians = leftIndices.map(i => hessians[i]);

    const rightFeatures = rightIndices.map(i => features[i]);
    const rightGradients = rightIndices.map(i => gradients[i]);
    const rightHessians = rightIndices.map(i => hessians[i]);

    return {
      isLeaf: false,
      featureIndex,
      threshold,
      left: this.buildTree(leftFeatures, leftGradients, leftHessians, depth + 1),
      right: this.buildTree(rightFeatures, rightGradients, rightHessians, depth + 1),
    };
  }

  private createLeaf(gradients: number[], hessians: number[]): BoostingNode {
    const sumGradients = gradients.reduce((a, b) => a + b, 0);
    const sumHessians = hessians.reduce((a, b) => a + b, 0);

    // Calculate leaf weight with regularization
    const weight = -sumGradients / (sumHessians + this.config.reg_lambda);

    return {
      isLeaf: true,
      weight,
    };
  }

  private findBestSplit(
    features: number[][],
    gradients: number[],
    hessians: number[]
  ): { featureIndex: number; threshold: number; gain: number } {
    let bestGain = 0;
    let bestFeatureIndex = 0;
    let bestThreshold = 0;

    const nFeatures = features[0].length;
    const numFeaturesToTry = Math.floor(nFeatures * this.config.colsampleByTree);
    const featureIndices = this.randomFeatureSubset(nFeatures, numFeaturesToTry);

    for (const featureIndex of featureIndices) {
      const values = features.map(f => f[featureIndex]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gain = this.calculateGain(features, gradients, hessians, featureIndex, threshold);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeatureIndex = featureIndex;
          bestThreshold = threshold;
        }
      }
    }

    return { featureIndex: bestFeatureIndex, threshold: bestThreshold, gain: bestGain };
  }

  private calculateGain(
    features: number[][],
    gradients: number[],
    hessians: number[],
    featureIndex: number,
    threshold: number
  ): number {
    const { leftIndices, rightIndices } = this.splitData(features, featureIndex, threshold);

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return 0;
    }

    const sumGradients = gradients.reduce((a, b) => a + b, 0);
    const sumHessians = hessians.reduce((a, b) => a + b, 0);

    const leftGradSum = leftIndices.reduce((sum, i) => sum + gradients[i], 0);
    const leftHessSum = leftIndices.reduce((sum, i) => sum + hessians[i], 0);

    const rightGradSum = rightIndices.reduce((sum, i) => sum + gradients[i], 0);
    const rightHessSum = rightIndices.reduce((sum, i) => sum + hessians[i], 0);

    // Calculate gain using XGBoost formula
    const lambda = this.config.reg_lambda;
    const alpha = this.config.regAlpha;

    const leftGain = Math.pow(leftGradSum, 2) / (leftHessSum + lambda);
    const rightGain = Math.pow(rightGradSum, 2) / (rightHessSum + lambda);
    const parentGain = Math.pow(sumGradients, 2) / (sumHessians + lambda);

    const gain = 0.5 * (leftGain + rightGain - parentGain) - alpha;

    return Math.max(0, gain);
  }

  private splitData(
    features: number[][],
    featureIndex: number,
    threshold: number
  ): { leftIndices: number[]; rightIndices: number[] } {
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < features.length; i++) {
      if (features[i][featureIndex] <= threshold) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    }

    return { leftIndices, rightIndices };
  }

  private randomFeatureSubset(nFeatures: number, numToSelect: number): number[] {
    const indices = Array.from({ length: nFeatures }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices.slice(0, numToSelect);
  }
}

interface BoostingNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  weight?: number;
  left?: BoostingNode;
  right?: BoostingNode;
}
