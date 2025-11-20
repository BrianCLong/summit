/**
 * @intelgraph/synthetic-data
 * Comprehensive tabular and time-series data synthesis
 */

export {
  TabularSynthesizer,
  type SynthesisConfig,
  type TabularData,
  type SynthesisResult,
  type QualityMetrics,
  type PrivacyMetrics
} from './generators/TabularSynthesizer';

export {
  TimeSeriesSynthesizer,
  type TimeSeriesConfig,
  type TimeSeries
} from './generators/TimeSeriesSynthesizer';

export * from './utils/DataProfiler';
export * from './quality/QualityAssessor';
