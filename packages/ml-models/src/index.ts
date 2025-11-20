/**
 * @intelgraph/ml-models
 * ML model integration for threat detection
 */

export { MLThreatClient } from './ml-client';
export type { MLClientConfig } from './ml-client';

// Re-export core ML types
export {
  ModelType,
  MLModel,
  PredictionRequest,
  PredictionResult,
  AnomalyDetectionModel,
  EnsembleModel,
  OnlineLearningModel,
  FeatureEngineering,
  ModelMonitoring
} from '@intelgraph/threat-detection-core';
