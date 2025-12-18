/**
 * Adversarial Signal Model
 * Represents adversarial detection results
 */

import { SuspiciousInput } from './IntegrityReport.js';

export interface AdversarialSignalData {
  adversarialScore: number;
  isAdversarial: boolean;
  confidence: number;
  anomalyCount: number;
  anomalyRate: number;
  suspiciousInputs: SuspiciousInput[];
  validationPassed: boolean;
  validationErrors: string[];
}

export class AdversarialSignalBuilder {
  private signal: Partial<AdversarialSignalData> = {
    suspiciousInputs: [],
    validationErrors: [],
    anomalyCount: 0,
    anomalyRate: 0,
  };

  withIsolationForestScore(score: number): this {
    this.signal.adversarialScore = score;
    return this;
  }

  withLOFScore(score: number): this {
    if (!this.signal.adversarialScore) {
      this.signal.adversarialScore = score;
    } else {
      // Average with existing score
      this.signal.adversarialScore = (this.signal.adversarialScore + score) / 2;
    }
    return this;
  }

  withReconstructionError(error: number): this {
    // Convert reconstruction error to anomaly score
    const maxError = 10.0; // Configurable threshold
    const score = 1 - Math.min(error / maxError, 1);

    if (!this.signal.adversarialScore) {
      this.signal.adversarialScore = score;
    } else {
      // Average with existing score
      this.signal.adversarialScore = (this.signal.adversarialScore + score) / 2;
    }
    return this;
  }

  addSuspiciousInput(input: SuspiciousInput): this {
    this.signal.suspiciousInputs?.push(input);
    this.signal.anomalyCount = (this.signal.anomalyCount || 0) + 1;
    return this;
  }

  addValidationError(error: string): this {
    this.signal.validationErrors?.push(error);
    this.signal.validationPassed = false;
    return this;
  }

  withAnomalyRate(rate: number): this {
    this.signal.anomalyRate = rate;
    return this;
  }

  build(threshold: number = 0.95): AdversarialSignalData {
    const score = this.signal.adversarialScore || 1.0;

    return {
      adversarialScore: score,
      isAdversarial: score < threshold,
      confidence: Math.abs(score - threshold) / threshold,
      anomalyCount: this.signal.anomalyCount || 0,
      anomalyRate: this.signal.anomalyRate || 0,
      suspiciousInputs: this.signal.suspiciousInputs || [],
      validationPassed: this.signal.validationErrors?.length === 0,
      validationErrors: this.signal.validationErrors || [],
    };
  }
}

/**
 * Isolation Forest for anomaly detection
 */
export class IsolationForest {
  private trees: IsolationTree[] = [];
  private sampleSize: number;
  private nTrees: number;

  constructor(nTrees: number = 100, sampleSize: number = 256) {
    this.nTrees = nTrees;
    this.sampleSize = sampleSize;
  }

  /**
   * Fit the isolation forest
   */
  fit(data: number[][]): void {
    this.trees = [];

    for (let i = 0; i < this.nTrees; i++) {
      const sample = this.randomSample(data, this.sampleSize);
      const tree = new IsolationTree();
      tree.fit(sample, 0, Math.ceil(Math.log2(this.sampleSize)));
      this.trees.push(tree);
    }
  }

  /**
   * Predict anomaly score for a data point
   */
  predict(point: number[]): number {
    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + tree.pathLength(point), 0) /
      this.nTrees;

    // Normalize using expected path length
    const c = this.expectedPathLength(this.sampleSize);
    const score = Math.pow(2, -avgPathLength / c);

    return score;
  }

  private randomSample(data: number[][], size: number): number[][] {
    const sample: number[][] = [];
    for (let i = 0; i < size && i < data.length; i++) {
      const idx = Math.floor(Math.random() * data.length);
      sample.push(data[idx]);
    }
    return sample;
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    const H = Math.log(n - 1) + 0.5772156649; // Euler's constant
    return 2 * H - (2 * (n - 1)) / n;
  }
}

/**
 * Isolation Tree node
 */
class IsolationTree {
  private splitFeature?: number;
  private splitValue?: number;
  private left?: IsolationTree;
  private right?: IsolationTree;
  private size: number = 0;

  fit(data: number[][], depth: number, maxDepth: number): void {
    this.size = data.length;

    if (depth >= maxDepth || data.length <= 1) {
      return;
    }

    // Random feature selection
    const nFeatures = data[0].length;
    this.splitFeature = Math.floor(Math.random() * nFeatures);

    // Random split value
    const values = data.map((row) => row[this.splitFeature!]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    this.splitValue = min + Math.random() * (max - min);

    // Split data
    const leftData = data.filter(
      (row) => row[this.splitFeature!] < this.splitValue!
    );
    const rightData = data.filter(
      (row) => row[this.splitFeature!] >= this.splitValue!
    );

    if (leftData.length > 0) {
      this.left = new IsolationTree();
      this.left.fit(leftData, depth + 1, maxDepth);
    }

    if (rightData.length > 0) {
      this.right = new IsolationTree();
      this.right.fit(rightData, depth + 1, maxDepth);
    }
  }

  pathLength(point: number[], currentDepth: number = 0): number {
    if (this.splitFeature === undefined) {
      return currentDepth + this.expectedPathLength(this.size);
    }

    if (point[this.splitFeature] < this.splitValue!) {
      return this.left
        ? this.left.pathLength(point, currentDepth + 1)
        : currentDepth + 1;
    } else {
      return this.right
        ? this.right.pathLength(point, currentDepth + 1)
        : currentDepth + 1;
    }
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    const H = Math.log(n - 1) + 0.5772156649;
    return 2 * H - (2 * (n - 1)) / n;
  }
}

/**
 * Local Outlier Factor (LOF)
 */
export class LocalOutlierFactor {
  private data: number[][] = [];
  private k: number;

  constructor(k: number = 20) {
    this.k = k;
  }

  fit(data: number[][]): void {
    this.data = data;
  }

  predict(point: number[]): number {
    if (this.data.length === 0) return 1.0;

    // Find k-nearest neighbors
    const neighbors = this.kNearestNeighbors(point, this.k);

    // Calculate local reachability density
    const lrd = this.localReachabilityDensity(point, neighbors);

    // Calculate LOF
    const lrdSum = neighbors.reduce(
      (sum, neighbor) =>
        sum + this.localReachabilityDensity(neighbor, this.kNearestNeighbors(neighbor, this.k)),
      0
    );
    const avgLrd = lrdSum / neighbors.length;

    const lof = avgLrd / lrd;

    // Convert to 0-1 score (1 = normal, 0 = outlier)
    return 1 / (1 + Math.max(0, lof - 1));
  }

  private kNearestNeighbors(point: number[], k: number): number[][] {
    const distances = this.data.map((p) => ({
      point: p,
      distance: this.euclideanDistance(point, p),
    }));

    distances.sort((a, b) => a.distance - b.distance);

    return distances.slice(0, k).map((d) => d.point);
  }

  private localReachabilityDensity(
    point: number[],
    neighbors: number[][]
  ): number {
    if (neighbors.length === 0) return 1.0;

    const reachDistSum = neighbors.reduce(
      (sum, neighbor) => sum + this.reachabilityDistance(point, neighbor),
      0
    );

    return neighbors.length / reachDistSum;
  }

  private reachabilityDistance(point: number[], neighbor: number[]): number {
    const dist = this.euclideanDistance(point, neighbor);
    const neighborNeighbors = this.kNearestNeighbors(neighbor, this.k);
    const kDist =
      neighborNeighbors.length > 0
        ? this.euclideanDistance(neighbor, neighborNeighbors[neighborNeighbors.length - 1])
        : 0;

    return Math.max(dist, kDist);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }
}
