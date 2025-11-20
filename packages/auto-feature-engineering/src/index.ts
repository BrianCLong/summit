// Feature generators
export * from './generators/FeatureGenerator';
export * from './generators/PolynomialFeatures';
export * from './generators/InteractionFeatures';
export * from './generators/TimeBasedFeatures';
export * from './generators/StatisticalFeatures';

// Feature selectors
export * from './selectors/FeatureSelector';
export * from './selectors/ImportanceSelector';

// Feature transformers
export * from './transformers/FeatureTransformer';

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
