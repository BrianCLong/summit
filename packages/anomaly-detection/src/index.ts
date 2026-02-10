/**
 * @intelgraph/anomaly-detection
 * Advanced anomaly detection with behavioral analytics
 */

export { StatisticalAnomalyDetector } from './detectors/statistical-anomaly-detector';
export type { StatisticalAnomalyDetectorConfig } from './detectors/statistical-anomaly-detector';

export { BehaviorAnalyzer } from './detectors/behavior-analyzer';
export type { BehaviorAnalyzerConfig } from './detectors/behavior-analyzer';

export { TimeSeriesDetector } from './detectors/time-series-detector';
export type { TimeSeriesDetectorConfig } from './detectors/time-series-detector';

export { IsolationForest } from './detectors/isolation-forest';
export type { IsolationForestConfig } from './detectors/isolation-forest';

// Re-export core types for convenience
export {
  IAnomalyDetector,
  IBehaviorAnalyzer,
  AnomalyScore,
  BehaviorProfile
} from '@intelgraph/threat-detection-core';
