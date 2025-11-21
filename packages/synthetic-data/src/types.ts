/**
 * Shared type definitions for synthetic data generation
 */

/**
 * Tabular data structure
 */
export interface TabularData {
  columns: string[];
  data: any[][];
  metadata?: {
    types?: Record<string, 'categorical' | 'numerical' | 'datetime'>;
    distributions?: Record<string, any>;
    correlations?: number[][];
  };
}

/**
 * Synthesis configuration
 */
export interface SynthesisConfig {
  method: 'statistical' | 'ctgan' | 'tvae' | 'copula' | 'bayesian';
  numSamples: number;
  preserveCorrelations: boolean;
  preserveDistributions: boolean;
  categoricalColumns?: string[];
  numericalColumns?: string[];
  conditionalColumns?: string[];
  privacyBudget?: number;
}

/**
 * Quality metrics for synthetic data
 */
export interface QualityMetrics {
  distributionSimilarity: number;
  correlationPreservation: number;
  statisticalFidelity: number;
  diversityScore: number;
}

/**
 * Privacy metrics for synthetic data
 */
export interface PrivacyMetrics {
  privacyLoss: number;
  reidentificationRisk: number;
  membershipInferenceRisk: number;
}

/**
 * Synthesis result
 */
export interface SynthesisResult {
  syntheticData: TabularData;
  quality: QualityMetrics;
  privacyMetrics?: PrivacyMetrics;
}

/**
 * Time series configuration
 */
export interface TimeSeriesConfig {
  method: 'arima' | 'lstm' | 'gan' | 'vae' | 'statistical';
  length: number;
  frequency: 'daily' | 'hourly' | 'minute' | 'second';
  seasonality?: {
    enabled: boolean;
    period?: number;
  };
  trend?: {
    enabled: boolean;
    type?: 'linear' | 'exponential' | 'polynomial';
  };
  anomalies?: {
    enabled: boolean;
    frequency?: number;
    magnitude?: number;
  };
  multivariate?: boolean;
  numSeries?: number;
}

/**
 * Time series data structure
 */
export interface TimeSeries {
  timestamps: Date[];
  values: number[][];
  metadata: {
    columns: string[];
    frequency: string;
    hasSeasonality: boolean;
    hasTrend: boolean;
    hasAnomalies: boolean;
  };
}
