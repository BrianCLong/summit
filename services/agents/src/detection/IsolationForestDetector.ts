/**
 * Isolation Forest Detector
 *
 * Implements unsupervised anomaly detection using the Isolation Forest algorithm.
 * Optimized for OSINT/CTI data streams with target p95 latency < 500ms.
 *
 * The algorithm isolates anomalies by randomly selecting features and split values,
 * where anomalies require fewer splits (shorter path lengths) to be isolated.
 */

import {
  AnomalyScore,
  FeatureVector,
  FeatureContribution,
  IsolationForestConfig,
  DetectorState,
} from './types.js';

interface IsolationTreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
}

interface IsolationTree {
  root: IsolationTreeNode;
  maxDepth: number;
}

/**
 * Calculates the average path length for a given sample size
 * Used for normalizing anomaly scores
 */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const harmonicNumber = Math.log(n - 1) + 0.5772156649; // Euler-Mascheroni constant
  return 2 * harmonicNumber - (2 * (n - 1)) / n;
}

export class IsolationForestDetector {
  private trees: IsolationTree[] = [];
  private config: IsolationForestConfig;
  private state: DetectorState = 'initializing';
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  private isFitted = false;
  private rng: () => number;

  constructor(config: Partial<IsolationForestConfig> = {}) {
    this.config = {
      numTrees: config.numTrees ?? 100,
      subsampleSize: config.subsampleSize ?? 256,
      maxDepth: config.maxDepth ?? Math.ceil(Math.log2(256)),
      contamination: config.contamination ?? 0.1,
      bootstrapSampling: config.bootstrapSampling ?? true,
      randomState: config.randomState,
    };

    // Seeded random for reproducibility
    this.rng = this.createRng(this.config.randomState);
  }

  private createRng(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }
    // Simple seeded PRNG (xorshift32)
    let state = seed;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  /**
   * Fit the isolation forest on training data
   */
  async fit(data: FeatureVector[]): Promise<void> {
    if (data.length === 0) {
      throw new Error('Cannot fit on empty dataset');
    }

    this.state = 'initializing';

    // Extract feature matrices
    const features = data.map((d) => d.features);
    const numFeatures = features[0].length;

    // Compute feature statistics for normalization
    this.computeFeatureStatistics(features, numFeatures);

    // Normalize features
    const normalizedFeatures = features.map((f) => this.normalizeFeatures(f));

    // Build isolation trees
    this.trees = [];
    const subsampleSize = Math.min(this.config.subsampleSize, data.length);

    for (let i = 0; i < this.config.numTrees; i++) {
      const subsample = this.getSubsample(normalizedFeatures, subsampleSize);
      const tree = this.buildTree(subsample, 0, this.config.maxDepth);
      this.trees.push({ root: tree, maxDepth: this.config.maxDepth });
    }

    this.isFitted = true;
    this.state = 'ready';
  }

  private computeFeatureStatistics(
    features: number[][],
    numFeatures: number,
  ): void {
    this.featureMeans = new Array(numFeatures).fill(0);
    this.featureStds = new Array(numFeatures).fill(0);

    // Compute means
    for (const feature of features) {
      for (let j = 0; j < numFeatures; j++) {
        this.featureMeans[j] += feature[j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.featureMeans[j] /= features.length;
    }

    // Compute standard deviations
    for (const feature of features) {
      for (let j = 0; j < numFeatures; j++) {
        this.featureStds[j] += Math.pow(
          feature[j] - this.featureMeans[j],
          2,
        );
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      this.featureStds[j] = Math.sqrt(this.featureStds[j] / features.length);
      // Prevent division by zero
      if (this.featureStds[j] === 0) {
        this.featureStds[j] = 1;
      }
    }
  }

  private normalizeFeatures(features: number[]): number[] {
    return features.map(
      (f, i) => (f - this.featureMeans[i]) / this.featureStds[i],
    );
  }

  private getSubsample(data: number[][], size: number): number[][] {
    if (!this.config.bootstrapSampling) {
      // Shuffle and take first 'size' elements
      const shuffled = [...data].sort(() => this.rng() - 0.5);
      return shuffled.slice(0, size);
    }

    // Bootstrap sampling (with replacement)
    const sample: number[][] = [];
    for (let i = 0; i < size; i++) {
      const idx = Math.floor(this.rng() * data.length);
      sample.push(data[idx]);
    }
    return sample;
  }

  private buildTree(
    data: number[][],
    depth: number,
    maxDepth: number,
  ): IsolationTreeNode {
    // Leaf node conditions
    if (depth >= maxDepth || data.length <= 1) {
      return { isLeaf: true, size: data.length };
    }

    const numFeatures = data[0].length;
    const splitFeature = Math.floor(this.rng() * numFeatures);

    // Get min/max for the selected feature
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const point of data) {
      minVal = Math.min(minVal, point[splitFeature]);
      maxVal = Math.max(maxVal, point[splitFeature]);
    }

    // If all values are the same, create a leaf
    if (minVal === maxVal) {
      return { isLeaf: true, size: data.length };
    }

    // Random split value between min and max
    const splitValue = minVal + this.rng() * (maxVal - minVal);

    // Partition data
    const left: number[][] = [];
    const right: number[][] = [];
    for (const point of data) {
      if (point[splitFeature] < splitValue) {
        left.push(point);
      } else {
        right.push(point);
      }
    }

    return {
      isLeaf: false,
      size: data.length,
      splitFeature,
      splitValue,
      left: this.buildTree(left, depth + 1, maxDepth),
      right: this.buildTree(right, depth + 1, maxDepth),
    };
  }

  /**
   * Compute path length for a single data point in a tree
   */
  private pathLength(
    point: number[],
    node: IsolationTreeNode,
    depth: number,
  ): number {
    if (node.isLeaf) {
      return depth + averagePathLength(node.size);
    }

    if (
      node.splitFeature !== undefined &&
      node.splitValue !== undefined &&
      node.left &&
      node.right
    ) {
      if (point[node.splitFeature] < node.splitValue) {
        return this.pathLength(point, node.left, depth + 1);
      } else {
        return this.pathLength(point, node.right, depth + 1);
      }
    }

    return depth + averagePathLength(node.size);
  }

  /**
   * Detect anomalies in a batch of feature vectors
   * Optimized for low latency (target p95 < 500ms)
   */
  async detect(data: FeatureVector[]): Promise<AnomalyScore[]> {
    if (!this.isFitted) {
      throw new Error('Detector must be fitted before detection');
    }

    this.state = 'detecting';
    const startTime = Date.now();
    const results: AnomalyScore[] = [];

    const avgPathLen = averagePathLength(this.config.subsampleSize);

    for (const vector of data) {
      const normalized = this.normalizeFeatures(vector.features);

      // Compute average path length across all trees
      let totalPathLength = 0;
      for (const tree of this.trees) {
        totalPathLength += this.pathLength(normalized, tree.root, 0);
      }
      const avgPath = totalPathLength / this.trees.length;

      // Anomaly score: 2^(-avgPath / c(n))
      // Higher score = more anomalous
      const rawScore = Math.pow(2, -avgPath / avgPathLen);

      // Compute feature contributions
      const contributions = this.computeFeatureContributions(
        normalized,
        vector.features,
      );

      // Determine if anomaly based on contamination threshold
      const isAnomaly = rawScore > 1 - this.config.contamination;

      results.push({
        featureId: vector.id,
        score: rawScore,
        isAnomaly,
        detectorType: 'isolation_forest',
        confidence: this.computeConfidence(rawScore),
        contributingFeatures: contributions,
        timestamp: new Date(),
      });
    }

    const latencyMs = Date.now() - startTime;
    if (latencyMs > 500) {
      console.warn(
        `[IsolationForest] Batch detection exceeded 500ms: ${latencyMs}ms for ${data.length} points`,
      );
    }

    this.state = 'ready';
    return results;
  }

  /**
   * Detect single data point (for streaming)
   */
  async detectSingle(vector: FeatureVector): Promise<AnomalyScore> {
    const results = await this.detect([vector]);
    return results[0];
  }

  private computeFeatureContributions(
    normalized: number[],
    original: number[],
  ): FeatureContribution[] {
    const contributions: FeatureContribution[] = [];

    for (let i = 0; i < normalized.length; i++) {
      const deviation = Math.abs(normalized[i]);
      if (deviation > 1.5) {
        // Features more than 1.5 std from mean are significant
        contributions.push({
          featureIndex: i,
          contribution: deviation,
          direction: original[i] > this.featureMeans[i] ? 'high' : 'low',
        });
      }
    }

    // Sort by contribution (most significant first)
    contributions.sort((a, b) => b.contribution - a.contribution);

    return contributions.slice(0, 5); // Top 5 contributors
  }

  private computeConfidence(score: number): number {
    // Map score to confidence based on distance from threshold
    const threshold = 1 - this.config.contamination;
    const distance = Math.abs(score - threshold);
    return Math.min(1, 0.5 + distance * 2);
  }

  /**
   * Incremental update with new data (partial refit)
   * Maintains model freshness without full retraining
   */
  async partialFit(newData: FeatureVector[]): Promise<void> {
    if (newData.length === 0) return;

    const features = newData.map((d) => d.features);

    // Update feature statistics with exponential moving average
    const alpha = 0.1;
    for (let j = 0; j < this.featureMeans.length; j++) {
      let newMean = 0;
      for (const f of features) {
        newMean += f[j];
      }
      newMean /= features.length;
      this.featureMeans[j] = alpha * newMean + (1 - alpha) * this.featureMeans[j];
    }

    // Replace oldest trees with new ones
    const numToReplace = Math.ceil(this.config.numTrees * 0.1);
    const normalizedFeatures = features.map((f) => this.normalizeFeatures(f));

    for (let i = 0; i < numToReplace; i++) {
      const subsample = this.getSubsample(
        normalizedFeatures,
        Math.min(this.config.subsampleSize, features.length),
      );
      const tree = this.buildTree(subsample, 0, this.config.maxDepth);
      this.trees[i] = { root: tree, maxDepth: this.config.maxDepth };
    }
  }

  getState(): DetectorState {
    return this.state;
  }

  isTrained(): boolean {
    return this.isFitted;
  }

  getConfig(): IsolationForestConfig {
    return { ...this.config };
  }

  /**
   * Serialize model for persistence
   */
  serialize(): string {
    return JSON.stringify({
      config: this.config,
      featureMeans: this.featureMeans,
      featureStds: this.featureStds,
      trees: this.trees,
      isFitted: this.isFitted,
    });
  }

  /**
   * Deserialize model from persisted state
   */
  static deserialize(data: string): IsolationForestDetector {
    const parsed = JSON.parse(data);
    const detector = new IsolationForestDetector(parsed.config);
    detector.featureMeans = parsed.featureMeans;
    detector.featureStds = parsed.featureStds;
    detector.trees = parsed.trees;
    detector.isFitted = parsed.isFitted;
    detector.state = parsed.isFitted ? 'ready' : 'initializing';
    return detector;
  }
}
