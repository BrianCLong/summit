/**
 * @intelgraph/data-preprocessing
 * Data preprocessing utilities for deep learning pipelines
 */

import { z } from 'zod';

// ============================================================================
// Normalization
// ============================================================================

export class DataNormalizer {
  private mean: number[] = [];
  private std: number[] = [];

  /**
   * Fit normalizer to data
   */
  fit(data: number[][]): void {
    const numFeatures = data[0].length;
    this.mean = new Array(numFeatures).fill(0);
    this.std = new Array(numFeatures).fill(0);

    // Calculate mean
    data.forEach((row) => {
      row.forEach((val, i) => {
        this.mean[i] += val;
      });
    });

    this.mean = this.mean.map((sum) => sum / data.length);

    // Calculate standard deviation
    data.forEach((row) => {
      row.forEach((val, i) => {
        this.std[i] += Math.pow(val - this.mean[i], 2);
      });
    });

    this.std = this.std.map((sum) => Math.sqrt(sum / data.length));
  }

  /**
   * Transform data using fitted parameters
   */
  transform(data: number[][]): number[][] {
    return data.map((row) =>
      row.map((val, i) => (val - this.mean[i]) / (this.std[i] || 1))
    );
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(data: number[][]): number[][] {
    this.fit(data);
    return this.transform(data);
  }

  /**
   * Inverse transform
   */
  inverseTransform(data: number[][]): number[][] {
    return data.map((row) =>
      row.map((val, i) => val * (this.std[i] || 1) + this.mean[i])
    );
  }
}

// ============================================================================
// Data Splitting
// ============================================================================

export interface DataSplit<T> {
  train: T[];
  validation: T[];
  test: T[];
}

export function trainValTestSplit<T>(
  data: T[],
  ratios: { train: number; validation: number; test: number } = {
    train: 0.7,
    validation: 0.15,
    test: 0.15,
  },
  shuffle = true
): DataSplit<T> {
  if (Math.abs(ratios.train + ratios.validation + ratios.test - 1.0) > 0.001) {
    throw new Error('Ratios must sum to 1.0');
  }

  let shuffledData = [...data];
  if (shuffle) {
    shuffledData = shuffleArray(shuffledData);
  }

  const trainSize = Math.floor(data.length * ratios.train);
  const valSize = Math.floor(data.length * ratios.validation);

  return {
    train: shuffledData.slice(0, trainSize),
    validation: shuffledData.slice(trainSize, trainSize + valSize),
    test: shuffledData.slice(trainSize + valSize),
  };
}

export function kFoldSplit<T>(data: T[], k: number, shuffle = true): Array<DataSplit<T>> {
  let shuffledData = [...data];
  if (shuffle) {
    shuffledData = shuffleArray(shuffledData);
  }

  const foldSize = Math.floor(data.length / k);
  const folds: Array<DataSplit<T>> = [];

  for (let i = 0; i < k; i++) {
    const valStart = i * foldSize;
    const valEnd = (i + 1) * foldSize;

    const validation = shuffledData.slice(valStart, valEnd);
    const train = [
      ...shuffledData.slice(0, valStart),
      ...shuffledData.slice(valEnd),
    ];

    folds.push({
      train,
      validation,
      test: [], // No separate test set in k-fold
    });
  }

  return folds;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Feature Engineering
// ============================================================================

export class FeatureEncoder {
  private labelMap = new Map<string, number>();
  private inverseLabelMap = new Map<number, string>();

  /**
   * Encode categorical labels to integers
   */
  fitTransform(labels: string[]): number[] {
    const uniqueLabels = [...new Set(labels)];

    uniqueLabels.forEach((label, index) => {
      this.labelMap.set(label, index);
      this.inverseLabelMap.set(index, label);
    });

    return labels.map((label) => this.labelMap.get(label)!);
  }

  /**
   * Transform labels using fitted mapping
   */
  transform(labels: string[]): number[] {
    return labels.map((label) => {
      const encoded = this.labelMap.get(label);
      if (encoded === undefined) {
        throw new Error(`Unknown label: ${label}`);
      }
      return encoded;
    });
  }

  /**
   * Inverse transform
   */
  inverseTransform(encoded: number[]): string[] {
    return encoded.map((code) => {
      const label = this.inverseLabelMap.get(code);
      if (label === undefined) {
        throw new Error(`Unknown code: ${code}`);
      }
      return label;
    });
  }

  /**
   * Get number of classes
   */
  getNumClasses(): number {
    return this.labelMap.size;
  }
}

/**
 * One-hot encode categorical features
 */
export function oneHotEncode(labels: number[], numClasses: number): number[][] {
  return labels.map((label) => {
    const encoded = new Array(numClasses).fill(0);
    encoded[label] = 1;
    return encoded;
  });
}

// ============================================================================
// Data Augmentation
// ============================================================================

export interface AugmentationConfig {
  horizontalFlip?: boolean;
  verticalFlip?: boolean;
  rotation?: { enabled: boolean; maxDegrees: number };
  zoom?: { enabled: boolean; range: [number, number] };
  brightness?: { enabled: boolean; range: [number, number] };
  noise?: { enabled: boolean; stddev: number };
}

export class ImageAugmentor {
  private config: AugmentationConfig;

  constructor(config: AugmentationConfig) {
    this.config = config;
  }

  /**
   * Apply augmentation to image (represented as flat array)
   */
  augment(image: number[], width: number, height: number, channels: number): number[] {
    let augmented = [...image];

    // Horizontal flip
    if (this.config.horizontalFlip && Math.random() > 0.5) {
      augmented = this.horizontalFlip(augmented, width, height, channels);
    }

    // Vertical flip
    if (this.config.verticalFlip && Math.random() > 0.5) {
      augmented = this.verticalFlip(augmented, width, height, channels);
    }

    // Brightness adjustment
    if (this.config.brightness?.enabled) {
      const factor =
        this.config.brightness.range[0] +
        Math.random() * (this.config.brightness.range[1] - this.config.brightness.range[0]);
      augmented = augmented.map((pixel) => Math.min(255, Math.max(0, pixel * factor)));
    }

    // Add noise
    if (this.config.noise?.enabled) {
      augmented = this.addNoise(augmented, this.config.noise.stddev);
    }

    return augmented;
  }

  private horizontalFlip(image: number[], width: number, height: number, channels: number): number[] {
    const flipped = new Array(image.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          const srcIdx = (y * width + x) * channels + c;
          const dstIdx = (y * width + (width - 1 - x)) * channels + c;
          flipped[dstIdx] = image[srcIdx];
        }
      }
    }

    return flipped;
  }

  private verticalFlip(image: number[], width: number, height: number, channels: number): number[] {
    const flipped = new Array(image.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          const srcIdx = (y * width + x) * channels + c;
          const dstIdx = ((height - 1 - y) * width + x) * channels + c;
          flipped[dstIdx] = image[srcIdx];
        }
      }
    }

    return flipped;
  }

  private addNoise(image: number[], stddev: number): number[] {
    return image.map((pixel) => {
      const noise = this.gaussianRandom(0, stddev);
      return Math.min(255, Math.max(0, pixel + noise));
    });
  }

  private gaussianRandom(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }
}

// ============================================================================
// Time Series Preprocessing
// ============================================================================

export function createSlidingWindows(
  data: number[],
  windowSize: number,
  stride: number = 1
): Array<{ input: number[]; target: number }> {
  const windows: Array<{ input: number[]; target: number }> = [];

  for (let i = 0; i <= data.length - windowSize - 1; i += stride) {
    windows.push({
      input: data.slice(i, i + windowSize),
      target: data[i + windowSize],
    });
  }

  return windows;
}

export function createSequences(
  data: number[][],
  sequenceLength: number,
  stride: number = 1
): number[][][] {
  const sequences: number[][][] = [];

  for (let i = 0; i <= data.length - sequenceLength; i += stride) {
    sequences.push(data.slice(i, i + sequenceLength));
  }

  return sequences;
}

// ============================================================================
// Data Quality
// ============================================================================

export interface DataQualityReport {
  totalSamples: number;
  missingValues: number;
  duplicates: number;
  outliers: number;
  featureStats: Array<{
    name: string;
    min: number;
    max: number;
    mean: number;
    stddev: number;
  }>;
}

export class DataQualityChecker {
  /**
   * Analyze data quality
   */
  analyze(data: number[][], featureNames?: string[]): DataQualityReport {
    const numFeatures = data[0].length;
    const names = featureNames || Array.from({ length: numFeatures }, (_, i) => `feature_${i}`);

    const featureStats = [];

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map((row) => row[i]);
      const stats = this.computeStats(values);
      featureStats.push({
        name: names[i],
        ...stats,
      });
    }

    return {
      totalSamples: data.length,
      missingValues: this.countMissing(data),
      duplicates: this.countDuplicates(data),
      outliers: this.countOutliers(data),
      featureStats,
    };
  }

  private computeStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    stddev: number;
  } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    return { min, max, mean, stddev };
  }

  private countMissing(data: number[][]): number {
    return data.reduce(
      (count, row) => count + row.filter((val) => isNaN(val) || val === null).length,
      0
    );
  }

  private countDuplicates(data: number[][]): number {
    const seen = new Set<string>();
    let duplicates = 0;

    data.forEach((row) => {
      const key = row.join(',');
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  private countOutliers(data: number[][]): number {
    // Simple outlier detection using IQR method
    let outliers = 0;

    for (let i = 0; i < data[0].length; i++) {
      const values = data.map((row) => row[i]).sort((a, b) => a - b);
      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      outliers += values.filter((v) => v < lowerBound || v > upperBound).length;
    }

    return outliers;
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  DataNormalizer as Normalizer,
  FeatureEncoder as LabelEncoder,
  ImageAugmentor as Augmentor,
};
