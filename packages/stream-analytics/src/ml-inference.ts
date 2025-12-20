import { EventEmitter } from 'events';
import pino from 'pino';

const logger = pino({ name: 'ml-inference' });

/**
 * Real-time ML model inference
 */
export class MLInferenceEngine extends EventEmitter {
  private models: Map<string, MLModel> = new Map();
  private featureStore: Map<string, any> = new Map();

  /**
   * Register ML model
   */
  registerModel(name: string, model: MLModel): void {
    this.models.set(name, model);
    logger.info({ modelName: name }, 'Model registered');
  }

  /**
   * Perform inference
   */
  async predict<T, R>(modelName: string, features: T): Promise<R> {
    const model = this.models.get(modelName);

    if (!model) {
      throw new Error(`Model not found: ${modelName}`);
    }

    const startTime = Date.now();

    try {
      const prediction = await model.predict(features);
      const latency = Date.now() - startTime;

      this.emit('prediction', {
        modelName,
        latency,
        timestamp: Date.now(),
      });

      logger.debug({ modelName, latency }, 'Prediction completed');

      return prediction as R;
    } catch (error) {
      logger.error({ error, modelName }, 'Prediction failed');
      throw error;
    }
  }

  /**
   * Batch inference
   */
  async predictBatch<T, R>(modelName: string, batchFeatures: T[]): Promise<R[]> {
    const model = this.models.get(modelName);

    if (!model) {
      throw new Error(`Model not found: ${modelName}`);
    }

    const startTime = Date.now();

    try {
      const predictions = await Promise.all(
        batchFeatures.map((features) => model.predict(features))
      );

      const latency = Date.now() - startTime;
      const avgLatency = latency / batchFeatures.length;

      this.emit('batch-prediction', {
        modelName,
        batchSize: batchFeatures.length,
        totalLatency: latency,
        avgLatency,
        timestamp: Date.now(),
      });

      return predictions as R[];
    } catch (error) {
      logger.error({ error, modelName }, 'Batch prediction failed');
      throw error;
    }
  }

  /**
   * Extract features from stream event
   */
  extractFeatures<T>(event: T, extractors: FeatureExtractor[]): Record<string, any> {
    const features: Record<string, any> = {};

    for (const extractor of extractors) {
      try {
        features[extractor.name] = extractor.extract(event);
      } catch (error) {
        logger.warn({ error, extractor: extractor.name }, 'Feature extraction failed');
        features[extractor.name] = null;
      }
    }

    return features;
  }

  /**
   * Store features for online learning
   */
  storeFeatures(key: string, features: any): void {
    this.featureStore.set(key, {
      features,
      timestamp: Date.now(),
    });

    // Limit feature store size
    if (this.featureStore.size > 10000) {
      const firstKey = this.featureStore.keys().next().value;
      this.featureStore.delete(firstKey);
    }
  }

  /**
   * Get stored features
   */
  getFeatures(key: string): any | null {
    const stored = this.featureStore.get(key);
    return stored ? stored.features : null;
  }
}

/**
 * ML Model interface
 */
export interface MLModel {
  predict(features: any): Promise<any>;
  update?(features: any, label: any): Promise<void>;
}

/**
 * Feature extractor
 */
export interface FeatureExtractor {
  name: string;
  extract(event: any): any;
}

/**
 * Anomaly detection model
 */
export class AnomalyDetectionModel implements MLModel {
  private meanValues: Map<string, number> = new Map();
  private stdDevValues: Map<string, number> = new Map();
  private threshold: number;

  constructor(threshold: number = 3.0) {
    this.threshold = threshold;
  }

  async predict(features: Record<string, number>): Promise<{ isAnomaly: boolean; score: number }> {
    let maxZScore = 0;

    for (const [key, value] of Object.entries(features)) {
      const mean = this.meanValues.get(key) || value;
      const stdDev = this.stdDevValues.get(key) || 1;

      const zScore = Math.abs((value - mean) / stdDev);
      maxZScore = Math.max(maxZScore, zScore);
    }

    return {
      isAnomaly: maxZScore > this.threshold,
      score: maxZScore,
    };
  }

  async update(features: Record<string, number>): Promise<void> {
    // Update mean and std dev (simplified online learning)
    for (const [key, value] of Object.entries(features)) {
      const currentMean = this.meanValues.get(key) || 0;
      const currentStdDev = this.stdDevValues.get(key) || 1;

      // Exponential moving average
      const alpha = 0.1;
      const newMean = alpha * value + (1 - alpha) * currentMean;
      const newStdDev = Math.sqrt(
        alpha * Math.pow(value - newMean, 2) + (1 - alpha) * Math.pow(currentStdDev, 2)
      );

      this.meanValues.set(key, newMean);
      this.stdDevValues.set(key, Math.max(newStdDev, 0.1)); // Prevent division by zero
    }
  }
}

/**
 * Classification model (placeholder)
 */
export class ClassificationModel implements MLModel {
  constructor(private modelEndpoint?: string) {}

  async predict(features: any): Promise<{ class: string; probability: number }> {
    // In production, this would call a model serving endpoint
    // For now, return mock prediction
    return {
      class: 'normal',
      probability: 0.85,
    };
  }
}
