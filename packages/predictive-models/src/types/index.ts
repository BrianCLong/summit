/**
 * Predictive Models Types and Interfaces
 */

export interface Dataset {
  features: number[][];
  labels: number[] | string[];
  featureNames?: string[];
  categorical?: boolean[];
}

export interface TrainingConfig {
  testSize?: number;
  validationSize?: number;
  randomState?: number;
  stratify?: boolean;
  shuffle?: boolean;
}

export interface ModelConfig {
  hyperparameters: Record<string, number | string | boolean>;
  crossValidation?: CrossValidationConfig;
  earlyStoppingiter?: boolean;
  earlyStoppingRounds?: number;
}

export interface CrossValidationConfig {
  folds: number;
  stratified: boolean;
  shuffle: boolean;
  randomState?: number;
}

export interface PredictionResult {
  prediction: number | string;
  probability?: number;
  probabilities?: Record<string, number>;
  confidence: number;
}

export interface ModelPerformance {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  confusionMatrix?: number[][];
  classificationReport?: ClassificationMetrics[];
}

export interface ClassificationMetrics {
  class: string | number;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface HyperparameterSearchResult {
  bestParams: Record<string, unknown>;
  bestScore: number;
  cvResults: Array<{
    params: Record<string, unknown>;
    meanScore: number;
    stdScore: number;
  }>;
}

export interface ShapValue {
  feature: string;
  shapValue: number;
  featureValue: number;
}

export interface LimeExplanation {
  feature: string;
  weight: number;
  value: number;
}

export interface CalibrationResult {
  calibratedProbabilities: number[];
  calibrationCurve: {
    meanPredicted: number[];
    fractionPositive: number[];
  };
  brierScore: number;
}
