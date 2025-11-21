/**
 * Prediction Service Types
 */

export interface PredictionRequest {
  modelId: string;
  modelType: 'forecast' | 'classification' | 'regression' | 'risk';
  features: number[][] | Record<string, unknown>[];
  options?: PredictionOptions;
}

export interface PredictionOptions {
  horizon?: number;
  confidenceLevel?: number;
  explainability?: boolean;
  batchSize?: number;
}

export interface PredictionResponse {
  requestId: string;
  modelId: string;
  predictions: unknown[];
  explanations?: unknown[];
  metadata: {
    timestamp: Date;
    processingTimeMs: number;
    modelVersion: string;
  };
}

export interface ModelMetadata {
  id: string;
  name: string;
  type: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  performance: Record<string, number>;
  status: 'active' | 'deprecated' | 'archived';
}
