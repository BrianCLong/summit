/**
 * Feature Engineering Types
 */

export interface FeatureSet {
  features: number[][];
  featureNames: string[];
  metadata?: Record<string, unknown>;
}

export interface TransformConfig {
  method: 'standard' | 'minmax' | 'robust' | 'log' | 'sqrt';
  params?: Record<string, number>;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}
