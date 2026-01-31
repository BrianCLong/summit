import { InferenceRequest, InferenceResponse, ModelVersion } from './types.js';
import { featureStore } from './feature_store.js';
import { modelRegistry } from './registry.js';
import { logger } from '../config/logger.js';
import axios from 'axios';

/**
 * Service for serving ML models.
 * Implements Adapter pattern to support:
 * 1. Mock (Dev/Test)
 * 2. External HTTP (TensorFlow Serving / TorchServe / KServe)
 */
export class ModelServingService {
  private static instance: ModelServingService;

  private constructor() {}

  public static getInstance(): ModelServingService {
    if (!ModelServingService.instance) {
      ModelServingService.instance = new ModelServingService();
    }
    return ModelServingService.instance;
  }

  /**
   * Main entry point for prediction requests.
   */
  async predict(
    tenantId: string,
    request: InferenceRequest
  ): Promise<InferenceResponse> {
    const startTime = Date.now();

    // 1. Resolve Model Version
    let version = request.version;
    if (!version) {
        const productionVersion = await modelRegistry.getProductionModelVersion(tenantId, request.modelName);
        version = productionVersion ? productionVersion.version : 'latest';
    }

    // 2. Feature Enrichment
    let features = request.inputs;
    if (request.inputs.entityId && request.inputs.featureSet) {
      const storedFeatures = await featureStore.getOnlineFeatures(
        request.inputs.featureSet,
        request.inputs.entityId,
        request.inputs.requiredFeatures || []
      );
      if (storedFeatures) {
        features = { ...features, ...storedFeatures };
      }
    }

    // 3. Inference
    const prediction = await this.executeModel(request.modelName, version, features);

    // 4. Monitoring / Logging
    this.logInference(tenantId, request.modelName, version, Date.now() - startTime);

    return {
      modelName: request.modelName,
      version: version,
      predictions: prediction,
      metadata: {
        latencyMs: Date.now() - startTime,
        explanation: request.options?.explain ? 'SHAP values placeholder' : undefined
      }
    };
  }

  /**
   * Routes execution to appropriate backend.
   */
  private async executeModel(
    name: string,
    version: string,
    inputs: Record<string, any>
  ): Promise<any> {
    const externalUrl = process.env.ML_INFERENCE_URL; // e.g. http://tf-serving:8501

    if (externalUrl && !process.env.USE_MOCK_ML) {
        try {
            // Standard TensorFlow Serving REST API pattern
            const response = await axios.post(
                `${externalUrl}/v1/models/${name}/versions/${version}:predict`,
                { instances: [inputs] }
            );
            return response.data;
        } catch (error: any) {
            logger.error({ error, model: name }, 'External inference failed, falling back to mock');
            // Fallback to mock if configured, or rethrow
            if (!process.env.ENABLE_ML_FALLBACK) throw error;
        }
    }

    return this.mockExecution(name, version, inputs);
  }

  private async mockExecution(name: string, version: string, inputs: Record<string, any>): Promise<any> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

    if (name.includes('sentiment')) {
        return { score: Math.random(), label: Math.random() > 0.5 ? 'positive' : 'negative' };
    }
    if (name.includes('fraud')) {
        return { isFraud: Math.random() < 0.01, confidence: Math.random() };
    }

    return { result: 'mock_prediction', inputs_received: Object.keys(inputs).length };
  }

  private logInference(tenantId: string, model: string, version: string, latency: number) {
      // Metric logging
  }
}

export const modelServing = ModelServingService.getInstance();
