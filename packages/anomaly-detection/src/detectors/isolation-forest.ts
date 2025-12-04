/**
 * Isolation Forest implementation for anomaly detection
 * Based on the paper: "Isolation Forest" by Liu, Ting, and Zhou (2008)
 */

import { IAnomalyDetector } from '@intelgraph/threat-detection-core';
import { AnomalyScore } from '@intelgraph/threat-detection-core';

export interface IsolationForestConfig {
  numTrees: number; // Number of trees in the forest
  sampleSize: number; // Subsample size for each tree
  maxDepth?: number; // Maximum tree depth
  contamination: number; // Expected proportion of anomalies (0-0.5)
}

interface IsolationTree {
  splitFeature?: number;
  splitValue?: number;
  left?: IsolationTree;
  right?: IsolationTree;
  size?: number; // Number of samples if leaf
}

export class IsolationForest implements IAnomalyDetector {
  private config: IsolationForestConfig;
  private forest: IsolationTree[] = [];
  private features: string[] = [];
  private trained: boolean = false;
  private trainingData: number[][] = [];

  constructor(config: IsolationForestConfig) {
    this.config = config;
    this.config.maxDepth = config.maxDepth || Math.ceil(Math.log2(config.sampleSize));
  }

  async detectAnomaly(data: Record<string, any>): Promise<AnomalyScore> {
    if (!this.trained) {
      return {
        score: 0,
        isolationScore: 0,
        method: 'isolation_forest',
        features: {},
        explanation: 'Model not trained yet'
      };
    }

    // Extract feature vector
    const featureVector = this.extractFeatures(data);

    // Calculate average path length across all trees
    const avgPathLength = this.getAveragePathLength(featureVector);

    // Normalize path length to anomaly score
    const c = this.averagePathLength(this.config.sampleSize);
    const anomalyScore = Math.pow(2, -avgPathLength / c);

    // Calculate per-feature importance
    const featureImportance = this.calculateFeatureImportance(featureVector);

    return {
      score: anomalyScore,
      isolationScore: avgPathLength,
      method: 'isolation_forest',
      features: featureImportance,
      explanation: this.generateExplanation(anomalyScore, featureImportance)
    };
  }

  async updateBaseline(data: Record<string, any>): Promise<void> {
    // Extract features
    const featureVector = this.extractFeatures(data);

    // Add to training data
    this.trainingData.push(featureVector);

    // Retrain if we have enough samples
    if (this.trainingData.length >= this.config.sampleSize) {
      await this.train();
    }
  }

  async getBaseline(): Promise<any> {
    return {
      numTrees: this.config.numTrees,
      sampleSize: this.config.sampleSize,
      maxDepth: this.config.maxDepth,
      trained: this.trained,
      trainingDataSize: this.trainingData.length,
      features: this.features
    };
  }

  async train(): Promise<void> {
    if (this.trainingData.length < this.config.sampleSize) {
      throw new Error('Insufficient training data');
    }

    // Build isolation trees
    this.forest = [];

    for (let i = 0; i < this.config.numTrees; i++) {
      // Sample data
      const sample = this.sampleData(this.trainingData, this.config.sampleSize);

      // Build tree
      const tree = this.buildTree(sample, 0);
      this.forest.push(tree);
    }

    this.trained = true;
  }

  private extractFeatures(data: Record<string, any>): number[] {
    if (this.features.length === 0) {
      // First time - determine features
      this.features = Object.keys(data).filter(
        key => typeof data[key] === 'number'
      );
    }

    return this.features.map(feature => data[feature] || 0);
  }

  private sampleData(data: number[][], size: number): number[][] {
    const sample: number[][] = [];
    const indices = new Set<number>();

    while (indices.size < Math.min(size, data.length)) {
      const index = Math.floor(Math.random() * data.length);
      if (!indices.has(index)) {
        indices.add(index);
        sample.push(data[index]);
      }
    }

    return sample;
  }

  private buildTree(
    data: number[][],
    currentDepth: number
  ): IsolationTree {
    // Stopping criteria
    if (currentDepth >= this.config.maxDepth! || data.length <= 1) {
      return { size: data.length };
    }

    // Randomly select feature and split value
    const featureIndex = Math.floor(Math.random() * this.features.length);
    const featureValues = data.map(row => row[featureIndex]);
    const minVal = Math.min(...featureValues);
    const maxVal = Math.max(...featureValues);

    if (minVal === maxVal) {
      return { size: data.length };
    }

    const splitValue = minVal + Math.random() * (maxVal - minVal);

    // Split data
    const leftData = data.filter(row => row[featureIndex] < splitValue);
    const rightData = data.filter(row => row[featureIndex] >= splitValue);

    if (leftData.length === 0 || rightData.length === 0) {
      return { size: data.length };
    }

    return {
      splitFeature: featureIndex,
      splitValue,
      left: this.buildTree(leftData, currentDepth + 1),
      right: this.buildTree(rightData, currentDepth + 1)
    };
  }

  private getPathLength(
    featureVector: number[],
    tree: IsolationTree,
    currentDepth: number = 0
  ): number {
    // Leaf node
    if (tree.size !== undefined) {
      return currentDepth + this.averagePathLength(tree.size);
    }

    // Traverse tree
    const featureValue = featureVector[tree.splitFeature!];

    if (featureValue < tree.splitValue!) {
      return this.getPathLength(featureVector, tree.left!, currentDepth + 1);
    } else {
      return this.getPathLength(featureVector, tree.right!, currentDepth + 1);
    }
  }

  private getAveragePathLength(featureVector: number[]): number {
    const pathLengths = this.forest.map(tree =>
      this.getPathLength(featureVector, tree)
    );

    return pathLengths.reduce((sum, length) => sum + length, 0) / this.forest.length;
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;

    // Harmonic number approximation
    const harmonicNumber = Math.log(n - 1) + 0.5772156649; // Euler's constant
    return 2 * harmonicNumber - (2 * (n - 1) / n);
  }

  private calculateFeatureImportance(featureVector: number[]): Record<string, number> {
    const importance: Record<string, number> = {};

    // Initialize all features
    this.features.forEach(feature => {
      importance[feature] = 0;
    });

    // Count how often each feature is used for splitting
    for (const tree of this.forest) {
      this.traverseTree(tree, importance);
    }

    // Normalize
    const total = Object.values(importance).reduce((sum, val) => sum + val, 0);

    if (total > 0) {
      Object.keys(importance).forEach(key => {
        importance[key] /= total;
      });
    }

    return importance;
  }

  private traverseTree(tree: IsolationTree, importance: Record<string, number>): void {
    if (tree.splitFeature !== undefined) {
      const feature = this.features[tree.splitFeature];
      importance[feature] = (importance[feature] || 0) + 1;

      if (tree.left) this.traverseTree(tree.left, importance);
      if (tree.right) this.traverseTree(tree.right, importance);
    }
  }

  private generateExplanation(
    score: number,
    featureImportance: Record<string, number>
  ): string {
    if (score < 0.5) {
      return 'Data point appears normal';
    }

    const topFeatures = Object.entries(featureImportance)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([feature]) => feature);

    return `Anomaly detected (isolation score: ${score.toFixed(2)}). Key features: ${topFeatures.join(', ')}`;
  }

  reset(): void {
    this.forest = [];
    this.features = [];
    this.trained = false;
    this.trainingData = [];
  }

  setTrainingData(data: Record<string, any>[]): void {
    this.trainingData = data.map(d => this.extractFeatures(d));
  }
}
