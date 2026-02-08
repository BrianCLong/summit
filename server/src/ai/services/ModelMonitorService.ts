
import { logger } from '../../config/logger.js';
import { modelLifecycleService, ModelMetadata } from './ModelLifecycleService.js';

/**
 * Service for Automated Bias & Drift Detection (Task #102).
 */
export class ModelMonitorService {
  private static instance: ModelMonitorService;
  private readonly DRIFT_THRESHOLD = 0.1; // 10% drop in performance
  private readonly BIAS_THRESHOLD = 0.2; // Max bias score allowed

  private constructor() {}

  public static getInstance(): ModelMonitorService {
    if (!ModelMonitorService.instance) {
      ModelMonitorService.instance = new ModelMonitorService();
    }
    return ModelMonitorService.instance;
  }

  /**
   * Evaluates a model's current performance against its baseline to detect drift.
   */
  public async checkDrift(modelId: string, currentMetrics: { accuracy: number; biasScore: number }): Promise<void> {
    // 1. Fetch model metadata
    // For demo, we simulate fetching from DB. In reality, use modelLifecycleService.
    const baselineAccuracy = 0.95; 
    
    const accuracyDrop = baselineAccuracy - currentMetrics.accuracy;
    
    if (accuracyDrop > this.DRIFT_THRESHOLD) {
      const reason = `Drift detected: Accuracy dropped by ${(accuracyDrop * 100).toFixed(2)}% (Threshold: ${this.DRIFT_THRESHOLD * 100}%)`;
      await modelLifecycleService.triggerRetraining(modelId, reason);
      return;
    }

    if (currentMetrics.biasScore > this.BIAS_THRESHOLD) {
      const reason = `Bias detected: Bias score ${currentMetrics.biasScore} exceeds threshold ${this.BIAS_THRESHOLD}`;
      await modelLifecycleService.triggerRetraining(modelId, reason);
      return;
    }

    logger.info({ modelId }, 'Model health check passed: No significant drift or bias detected.');
  }
}

export const modelMonitorService = ModelMonitorService.getInstance();
