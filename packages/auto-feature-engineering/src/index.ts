// Feature generators
export * from './generators/FeatureGenerator.js';
export * from './generators/PolynomialFeatures.js';
export * from './generators/InteractionFeatures.js';
export * from './generators/TimeBasedFeatures.js';
export * from './generators/StatisticalFeatures.js';

// Feature selectors
export * from './selectors/FeatureSelector.js';
export * from './selectors/ImportanceSelector.js';

// Feature transformers
export * from './transformers/FeatureTransformer.js';

/**
 * Automated Feature Engineering Platform
 *
 * Provides comprehensive feature generation, selection, and transformation
 * capabilities for intelligence operations and machine learning workflows.
 */

export interface Feature {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean';
  values?: any[];
  statistics?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    unique?: number;
    missing?: number;
  };
  importance?: number;
  metadata?: Record<string, any>;
}

export interface FeatureEngineeringConfig {
  polynomialDegree?: number;
  interactions?: boolean;
  timeBased?: boolean;
  statistical?: boolean;
  domainSpecific?: boolean;
  maxFeatures?: number;
  importanceThreshold?: number;
}

export interface FeatureEngineeringResult {
  originalFeatures: Feature[];
  generatedFeatures: Feature[];
  selectedFeatures: Feature[];
  transformations: string[];
  importanceRanking: Array<{ feature: string; importance: number }>;
  metadata: {
    totalGenerated: number;
    totalSelected: number;
    generationTime: number;
    selectionTime: number;
  };
}
