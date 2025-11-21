/**
 * Random Forest Classifier
 */

import type { Dataset, PredictionResult, ModelPerformance, FeatureImportance } from '../types/index.js';

export interface RandomForestConfig {
  nEstimators: number;
  maxDepth?: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures?: number | 'sqrt' | 'log2';
  bootstrap: boolean;
  oobScore: boolean;
  randomState?: number;
}

export class RandomForestClassifier {
  private config: RandomForestConfig;
  private trees: DecisionTree[] = [];
  private featureImportances: number[] = [];
  private classes: (string | number)[] = [];
  private fitted: boolean = false;

  constructor(config: Partial<RandomForestConfig> = {}) {
    this.config = {
      nEstimators: config.nEstimators || 100,
      maxDepth: config.maxDepth,
      minSamplesSplit: config.minSamplesSplit || 2,
      minSamplesLeaf: config.minSamplesLeaf || 1,
      maxFeatures: config.maxFeatures || 'sqrt',
      bootstrap: config.bootstrap !== false,
      oobScore: config.oobScore || false,
      randomState: config.randomState,
    };
  }

  /**
   * Fit the random forest model
   */
  fit(dataset: Dataset): void {
    const { features, labels } = dataset;
    this.classes = [...new Set(labels)];

    // Initialize feature importances
    this.featureImportances = new Array(features[0].length).fill(0);

    // Build individual trees
    for (let i = 0; i < this.config.nEstimators; i++) {
      let bootstrapIndices: number[];

      if (this.config.bootstrap) {
        bootstrapIndices = this.bootstrapSample(features.length);
      } else {
        bootstrapIndices = Array.from({ length: features.length }, (_, i) => i);
      }

      const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]);
      const bootstrapLabels = bootstrapIndices.map(idx => labels[idx]);

      const tree = new DecisionTree({
        maxDepth: this.config.maxDepth,
        minSamplesSplit: this.config.minSamplesSplit,
        minSamplesLeaf: this.config.minSamplesLeaf,
        maxFeatures: this.getMaxFeatures(features[0].length),
      });

      tree.fit({ features: bootstrapFeatures, labels: bootstrapLabels });
      this.trees.push(tree);

      // Accumulate feature importances
      const treeImportances = tree.getFeatureImportances();
      for (let j = 0; j < treeImportances.length; j++) {
        this.featureImportances[j] += treeImportances[j];
      }
    }

    // Normalize feature importances
    const sum = this.featureImportances.reduce((a, b) => a + b, 0);
    this.featureImportances = this.featureImportances.map(imp => imp / sum);

    this.fitted = true;
  }

  /**
   * Predict class for samples
   */
  predict(features: number[][]): PredictionResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    return features.map(sample => this.predictSample(sample));
  }

  /**
   * Predict probabilities for samples
   */
  predictProba(features: number[][]): number[][] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    return features.map(sample => {
      const votes = new Map<string | number, number>();

      for (const tree of this.trees) {
        const prediction = tree.predictSample(sample);
        votes.set(prediction, (votes.get(prediction) || 0) + 1);
      }

      // Convert votes to probabilities
      const probs = this.classes.map(cls =>
        (votes.get(cls) || 0) / this.trees.length
      );

      return probs;
    });
  }

  /**
   * Get feature importances
   */
  getFeatureImportances(featureNames?: string[]): FeatureImportance[] {
    const names = featureNames || this.featureImportances.map((_, i) => `feature_${i}`);

    return this.featureImportances
      .map((importance, i) => ({
        feature: names[i],
        importance,
        rank: 0,
      }))
      .sort((a, b) => b.importance - a.importance)
      .map((item, i) => ({ ...item, rank: i + 1 }));
  }

  /**
   * Evaluate model performance
   */
  evaluate(testDataset: Dataset): ModelPerformance {
    const predictions = this.predict(testDataset.features);
    const predicted = predictions.map(p => p.prediction);
    const actual = testDataset.labels;

    return this.calculateMetrics(actual, predicted);
  }

  /**
   * Predict single sample
   */
  private predictSample(sample: number[]): PredictionResult {
    const votes = new Map<string | number, number>();

    for (const tree of this.trees) {
      const prediction = tree.predictSample(sample);
      votes.set(prediction, (votes.get(prediction) || 0) + 1);
    }

    // Find class with most votes
    let maxVotes = 0;
    let predictedClass: string | number = this.classes[0];

    for (const [cls, count] of votes.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        predictedClass = cls;
      }
    }

    return {
      prediction: predictedClass,
      probability: maxVotes / this.trees.length,
      confidence: maxVotes / this.trees.length,
    };
  }

  /**
   * Bootstrap sampling
   */
  private bootstrapSample(n: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      indices.push(Math.floor(Math.random() * n));
    }
    return indices;
  }

  /**
   * Get max features based on config
   */
  private getMaxFeatures(nFeatures: number): number {
    if (typeof this.config.maxFeatures === 'number') {
      return this.config.maxFeatures;
    } else if (this.config.maxFeatures === 'sqrt') {
      return Math.floor(Math.sqrt(nFeatures));
    } else if (this.config.maxFeatures === 'log2') {
      return Math.floor(Math.log2(nFeatures));
    }
    return nFeatures;
  }

  /**
   * Calculate classification metrics
   */
  private calculateMetrics(
    actual: (string | number)[],
    predicted: (string | number)[]
  ): ModelPerformance {
    const n = actual.length;
    let correct = 0;

    for (let i = 0; i < n; i++) {
      if (actual[i] === predicted[i]) correct++;
    }

    const accuracy = correct / n;

    // Calculate confusion matrix
    const confusionMatrix = this.calculateConfusionMatrix(actual, predicted);

    return {
      accuracy,
      confusionMatrix,
    };
  }

  /**
   * Calculate confusion matrix
   */
  private calculateConfusionMatrix(
    actual: (string | number)[],
    predicted: (string | number)[]
  ): number[][] {
    const matrix: number[][] = Array(this.classes.length)
      .fill(0)
      .map(() => Array(this.classes.length).fill(0));

    for (let i = 0; i < actual.length; i++) {
      const actualIdx = this.classes.indexOf(actual[i]);
      const predIdx = this.classes.indexOf(predicted[i]);
      matrix[actualIdx][predIdx]++;
    }

    return matrix;
  }
}

/**
 * Decision Tree (used by Random Forest)
 */
class DecisionTree {
  private config: {
    maxDepth?: number;
    minSamplesSplit: number;
    minSamplesLeaf: number;
    maxFeatures: number;
  };
  private root: TreeNode | null = null;
  private featureImportances: number[] = [];

  constructor(config: {
    maxDepth?: number;
    minSamplesSplit: number;
    minSamplesLeaf: number;
    maxFeatures: number;
  }) {
    this.config = config;
  }

  fit(dataset: Dataset): void {
    this.featureImportances = new Array(dataset.features[0].length).fill(0);
    this.root = this.buildTree(dataset.features, dataset.labels, 0);
  }

  predictSample(sample: number[]): string | number {
    if (!this.root) throw new Error('Tree not fitted');

    let node = this.root;
    while (!node.isLeaf) {
      if (sample[node.featureIndex!] <= node.threshold!) {
        node = node.left!;
      } else {
        node = node.right!;
      }
    }

    return node.prediction!;
  }

  getFeatureImportances(): number[] {
    return this.featureImportances;
  }

  private buildTree(
    features: number[][],
    labels: (string | number)[],
    depth: number
  ): TreeNode {
    const n = features.length;

    // Check stopping criteria
    if (
      n < this.config.minSamplesSplit ||
      (this.config.maxDepth && depth >= this.config.maxDepth) ||
      new Set(labels).size === 1
    ) {
      return this.createLeaf(labels);
    }

    // Find best split
    const { featureIndex, threshold, gain } = this.findBestSplit(features, labels);

    if (gain === 0) {
      return this.createLeaf(labels);
    }

    // Record feature importance
    this.featureImportances[featureIndex] += gain;

    // Split data
    const { leftIndices, rightIndices } = this.splitData(features, featureIndex, threshold);

    // Recursively build subtrees
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftLabels = leftIndices.map(i => labels[i]);
    const rightFeatures = rightIndices.map(i => features[i]);
    const rightLabels = rightIndices.map(i => labels[i]);

    return {
      isLeaf: false,
      featureIndex,
      threshold,
      left: this.buildTree(leftFeatures, leftLabels, depth + 1),
      right: this.buildTree(rightFeatures, rightLabels, depth + 1),
    };
  }

  private createLeaf(labels: (string | number)[]): TreeNode {
    // Majority vote
    const counts = new Map<string | number, number>();
    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    let maxCount = 0;
    let prediction: string | number = labels[0];

    for (const [label, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        prediction = label;
      }
    }

    return {
      isLeaf: true,
      prediction,
    };
  }

  private findBestSplit(
    features: number[][],
    labels: (string | number)[]
  ): { featureIndex: number; threshold: number; gain: number } {
    let bestGain = 0;
    let bestFeatureIndex = 0;
    let bestThreshold = 0;

    const nFeatures = features[0].length;
    const featureIndices = this.randomFeatureSubset(nFeatures);

    for (const featureIndex of featureIndices) {
      const values = features.map(f => f[featureIndex]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gain = this.calculateGain(features, labels, featureIndex, threshold);

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
    labels: (string | number)[],
    featureIndex: number,
    threshold: number
  ): number {
    const { leftIndices, rightIndices } = this.splitData(features, featureIndex, threshold);

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return 0;
    }

    const parentEntropy = this.calculateEntropy(labels);
    const leftLabels = leftIndices.map(i => labels[i]);
    const rightLabels = rightIndices.map(i => labels[i]);

    const leftEntropy = this.calculateEntropy(leftLabels);
    const rightEntropy = this.calculateEntropy(rightLabels);

    const n = labels.length;
    const weightedEntropy =
      (leftIndices.length / n) * leftEntropy +
      (rightIndices.length / n) * rightEntropy;

    return parentEntropy - weightedEntropy;
  }

  private calculateEntropy(labels: (string | number)[]): number {
    const counts = new Map<string | number, number>();
    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    let entropy = 0;
    const n = labels.length;

    for (const count of counts.values()) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }

    return entropy;
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

  private randomFeatureSubset(nFeatures: number): number[] {
    const maxFeatures = this.config.maxFeatures;
    const indices = Array.from({ length: nFeatures }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices.slice(0, maxFeatures);
  }
}

interface TreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  prediction?: string | number;
  left?: TreeNode;
  right?: TreeNode;
}
