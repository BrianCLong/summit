/**
 * @intelgraph/synthetic-data
 * Comprehensive tabular and time-series data synthesis
 */

// Export shared types
export * from './types';

// Export generators
export { TabularSynthesizer } from './generators/TabularSynthesizer';
export { TimeSeriesSynthesizer } from './generators/TimeSeriesSynthesizer';

// Export utilities
export { DataProfiler } from './utils/DataProfiler';
export type { DataProfile, ColumnProfile, NumericalStatistics, CategoricalDistribution, CorrelationMatrix, DataQuality } from './utils/DataProfiler';

// Export quality assessment
export { QualityAssessor } from './quality/QualityAssessor';
export type { QualityReport, MetricScore, StatisticalTest } from './quality/QualityAssessor';
