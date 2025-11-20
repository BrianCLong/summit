/**
 * Prediction Engine - Core prediction logic
 */

import type { PredictionRequest, PredictionResponse, ModelMetadata } from '../types/index.js';
import { ARIMAForecaster } from '@summit/forecasting';
import { RandomForestClassifier } from '@summit/predictive-models';
import { LogisticRiskScorer } from '@summit/risk-scoring';

export class PredictionEngine {
  private modelRegistry: Map<string, any> = new Map();
  private modelMetadata: Map<string, ModelMetadata> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Make predictions
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();

    const model = this.modelRegistry.get(request.modelId);
    if (!model) {
      throw new Error(`Model not found: ${request.modelId}`);
    }

    const metadata = this.modelMetadata.get(request.modelId);
    if (!metadata) {
      throw new Error(`Model metadata not found: ${request.modelId}`);
    }

    let predictions: unknown[];

    switch (request.modelType) {
      case 'forecast':
        predictions = await this.predictForecast(model, request);
        break;
      case 'classification':
        predictions = await this.predictClassification(model, request);
        break;
      case 'regression':
        predictions = await this.predictRegression(model, request);
        break;
      case 'risk':
        predictions = await this.predictRisk(model, request);
        break;
      default:
        throw new Error(`Unknown model type: ${request.modelType}`);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      requestId: this.generateRequestId(),
      modelId: request.modelId,
      predictions,
      metadata: {
        timestamp: new Date(),
        processingTimeMs,
        modelVersion: metadata.version,
      },
    };
  }

  /**
   * Register a model
   */
  registerModel(id: string, model: any, metadata: ModelMetadata): void {
    this.modelRegistry.set(id, model);
    this.modelMetadata.set(id, metadata);
  }

  /**
   * Get model metadata
   */
  getModelMetadata(id: string): ModelMetadata | undefined {
    return this.modelMetadata.get(id);
  }

  /**
   * List all models
   */
  listModels(): ModelMetadata[] {
    return Array.from(this.modelMetadata.values());
  }

  /**
   * Forecast predictions
   */
  private async predictForecast(model: any, request: PredictionRequest): Promise<unknown[]> {
    const horizon = request.options?.horizon || 30;
    const confidenceLevel = request.options?.confidenceLevel || 0.95;

    // Convert features to time series data format
    const timeSeriesData = (request.features as any[]).map((f: any) => ({
      timestamp: new Date(f.timestamp || Date.now()),
      value: typeof f === 'number' ? f : f.value,
    }));

    model.fit(timeSeriesData);
    return model.forecast(horizon, confidenceLevel);
  }

  /**
   * Classification predictions
   */
  private async predictClassification(model: any, request: PredictionRequest): Promise<unknown[]> {
    return model.predict(request.features as number[][]);
  }

  /**
   * Regression predictions
   */
  private async predictRegression(model: any, request: PredictionRequest): Promise<unknown[]> {
    return model.predict(request.features as number[][]);
  }

  /**
   * Risk scoring predictions
   */
  private async predictRisk(model: any, request: PredictionRequest): Promise<unknown[]> {
    const features = request.features as any[];
    return features.map((f, i) => model.score(`entity_${i}`, Array.isArray(f) ? f : Object.values(f)));
  }

  /**
   * Initialize default models for demonstration
   */
  private initializeDefaultModels(): void {
    // Register a default ARIMA forecaster
    const arimaModel = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
    this.registerModel('default-arima', arimaModel, {
      id: 'default-arima',
      name: 'Default ARIMA Forecaster',
      type: 'forecast',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: { mae: 0, rmse: 0 },
      status: 'active',
    });

    // Register a default Random Forest classifier
    const rfModel = new RandomForestClassifier();
    this.registerModel('default-rf', rfModel, {
      id: 'default-rf',
      name: 'Default Random Forest',
      type: 'classification',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: { accuracy: 0 },
      status: 'active',
    });

    // Register a default risk scorer
    const riskModel = new LogisticRiskScorer();
    this.registerModel('default-risk', riskModel, {
      id: 'default-risk',
      name: 'Default Risk Scorer',
      type: 'risk',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: { auc: 0 },
      status: 'active',
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
