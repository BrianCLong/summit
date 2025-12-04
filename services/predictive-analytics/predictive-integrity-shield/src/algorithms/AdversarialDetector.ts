/**
 * Adversarial Detector Algorithm
 * Detects adversarial inputs and anomalous data
 */

import {
  AdversarialSignal,
  SuspiciousInput,
} from '../models/IntegrityReport.js';
import {
  AdversarialSignalBuilder,
  IsolationForest,
  LocalOutlierFactor,
} from '../models/AdversarialSignal.js';

export interface AdversarialDetectorConfig {
  anomalyThreshold: number;
  methods: ('isolation_forest' | 'lof' | 'autoencoder')[];
  inputValidation: boolean;
}

export interface InputData {
  id: string;
  features: Record<string, any>;
  featureVector: number[];
}

export class AdversarialDetector {
  private config: AdversarialDetectorConfig;
  private isolationForest?: IsolationForest;
  private lof?: LocalOutlierFactor;
  private featureRanges: Map<string, { min: number; max: number }> = new Map();
  private baselineData: number[][] = [];

  constructor(config: AdversarialDetectorConfig) {
    this.config = config;

    // Initialize detectors based on config
    if (config.methods.includes('isolation_forest')) {
      this.isolationForest = new IsolationForest(100, 256);
    }

    if (config.methods.includes('lof')) {
      this.lof = new LocalOutlierFactor(20);
    }
  }

  /**
   * Train detectors on baseline data
   */
  train(baselineData: number[][]): void {
    this.baselineData = baselineData;

    // Calculate feature ranges for validation
    if (baselineData.length > 0) {
      const nFeatures = baselineData[0].length;

      for (let i = 0; i < nFeatures; i++) {
        const values = baselineData.map((row) => row[i]);
        this.featureRanges.set(`feature_${i}`, {
          min: Math.min(...values),
          max: Math.max(...values),
        });
      }
    }

    // Train isolation forest
    if (this.isolationForest) {
      this.isolationForest.fit(baselineData);
    }

    // Train LOF
    if (this.lof) {
      this.lof.fit(baselineData);
    }
  }

  /**
   * Detect adversarial inputs
   */
  detectAdversarial(inputs: InputData[]): AdversarialSignal {
    const builder = new AdversarialSignalBuilder();
    const suspiciousInputs: SuspiciousInput[] = [];
    let anomalyCount = 0;

    for (const input of inputs) {
      // Input validation
      if (this.config.inputValidation) {
        const validationErrors = this.validateInput(input);
        if (validationErrors.length > 0) {
          validationErrors.forEach((error) => builder.addValidationError(error));

          suspiciousInputs.push({
            inputId: input.id,
            timestamp: new Date(),
            anomalyScore: 1.0,
            detectionMethod: 'input_validation',
            features: input.features,
            explanation: validationErrors.join('; '),
          });

          anomalyCount++;
          continue;
        }
      }

      // Anomaly detection
      const anomalyScore = this.calculateAnomalyScore(input.featureVector);

      if (anomalyScore < this.config.anomalyThreshold) {
        suspiciousInputs.push({
          inputId: input.id,
          timestamp: new Date(),
          anomalyScore,
          detectionMethod: this.getDetectionMethod(),
          features: input.features,
          explanation: this.explainAnomaly(input.featureVector, anomalyScore),
        });

        anomalyCount++;
      }
    }

    // Set overall scores
    if (suspiciousInputs.length > 0) {
      const avgAnomalyScore =
        suspiciousInputs.reduce((sum, s) => sum + s.anomalyScore, 0) /
        suspiciousInputs.length;

      builder.withIsolationForestScore(avgAnomalyScore);
    } else {
      builder.withIsolationForestScore(1.0);
    }

    // Set anomaly rate
    const anomalyRate = inputs.length > 0 ? anomalyCount / inputs.length : 0;
    builder.withAnomalyRate(anomalyRate);

    // Add suspicious inputs
    suspiciousInputs.forEach((input) => builder.addSuspiciousInput(input));

    return builder.build(this.config.anomalyThreshold);
  }

  /**
   * Calculate anomaly score for an input
   */
  private calculateAnomalyScore(featureVector: number[]): number {
    const scores: number[] = [];

    // Isolation Forest score
    if (this.isolationForest && this.config.methods.includes('isolation_forest')) {
      const ifScore = this.isolationForest.predict(featureVector);
      scores.push(ifScore);
    }

    // LOF score
    if (this.lof && this.config.methods.includes('lof')) {
      const lofScore = this.lof.predict(featureVector);
      scores.push(lofScore);
    }

    // Autoencoder reconstruction (placeholder)
    if (this.config.methods.includes('autoencoder')) {
      const reconstructionScore = this.calculateReconstructionScore(featureVector);
      scores.push(reconstructionScore);
    }

    // Return average score
    return scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 1.0;
  }

  /**
   * Validate input against expected ranges and constraints
   */
  private validateInput(input: InputData): string[] {
    const errors: string[] = [];

    // Check feature ranges
    for (let i = 0; i < input.featureVector.length; i++) {
      const value = input.featureVector[i];
      const range = this.featureRanges.get(`feature_${i}`);

      if (range) {
        // Allow some margin (3 standard deviations)
        const margin = (range.max - range.min) * 0.5;
        const lowerBound = range.min - margin;
        const upperBound = range.max + margin;

        if (value < lowerBound || value > upperBound) {
          errors.push(
            `Feature ${i} out of range: ${value} (expected: ${range.min.toFixed(2)} - ${range.max.toFixed(2)})`
          );
        }
      }

      // Check for NaN or Infinity
      if (!isFinite(value)) {
        errors.push(`Feature ${i} is not finite: ${value}`);
      }
    }

    // Check for null/undefined in feature object
    for (const [key, value] of Object.entries(input.features)) {
      if (value === null || value === undefined) {
        errors.push(`Feature '${key}' is null or undefined`);
      }
    }

    return errors;
  }

  /**
   * Calculate reconstruction score (placeholder for autoencoder)
   */
  private calculateReconstructionScore(featureVector: number[]): number {
    // Simplified reconstruction using baseline statistics
    if (this.baselineData.length === 0) return 1.0;

    let totalError = 0;

    for (let i = 0; i < featureVector.length; i++) {
      const baselineValues = this.baselineData.map((row) => row[i]);
      const mean =
        baselineValues.reduce((sum, v) => sum + v, 0) / baselineValues.length;

      const variance =
        baselineValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        baselineValues.length;

      const stdDev = Math.sqrt(variance);

      // Z-score based error
      const zScore = stdDev > 0 ? Math.abs((featureVector[i] - mean) / stdDev) : 0;
      totalError += Math.min(zScore / 3, 1); // Normalize to 0-1
    }

    const avgError = totalError / featureVector.length;

    // Convert to score (1 = normal, 0 = anomalous)
    return 1 - avgError;
  }

  /**
   * Explain why an input was flagged as anomalous
   */
  private explainAnomaly(featureVector: number[], score: number): string {
    const explanations: string[] = [];

    // Find most anomalous features
    if (this.baselineData.length > 0) {
      const featureAnomalies: { index: number; zScore: number }[] = [];

      for (let i = 0; i < featureVector.length; i++) {
        const baselineValues = this.baselineData.map((row) => row[i]);
        const mean =
          baselineValues.reduce((sum, v) => sum + v, 0) /
          baselineValues.length;
        const variance =
          baselineValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          baselineValues.length;
        const stdDev = Math.sqrt(variance);

        const zScore = stdDev > 0 ? Math.abs((featureVector[i] - mean) / stdDev) : 0;

        if (zScore > 2) {
          featureAnomalies.push({ index: i, zScore });
        }
      }

      // Sort by z-score
      featureAnomalies.sort((a, b) => b.zScore - a.zScore);

      // Add top 3 anomalous features
      const top3 = featureAnomalies.slice(0, 3);
      for (const { index, zScore } of top3) {
        explanations.push(
          `Feature ${index} is ${zScore.toFixed(1)} std devs from baseline`
        );
      }
    }

    if (explanations.length === 0) {
      explanations.push(`Anomaly score: ${score.toFixed(3)} below threshold`);
    }

    return explanations.join('; ');
  }

  /**
   * Get detection method name
   */
  private getDetectionMethod(): string {
    if (this.config.methods.includes('isolation_forest')) {
      return 'isolation_forest';
    }
    if (this.config.methods.includes('lof')) {
      return 'local_outlier_factor';
    }
    if (this.config.methods.includes('autoencoder')) {
      return 'autoencoder';
    }
    return 'unknown';
  }

  /**
   * Get anomaly statistics
   */
  getStatistics(): {
    totalSamples: number;
    baselineSamples: number;
    featuresMonitored: number;
  } {
    return {
      totalSamples: this.baselineData.length,
      baselineSamples: this.baselineData.length,
      featuresMonitored: this.featureRanges.size,
    };
  }
}
