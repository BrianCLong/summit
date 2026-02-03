/**
 * @intelgraph/anomaly-detection
 * Advanced anomaly detection with behavioral analytics
 */

export { StatisticalAnomalyDetector } from './detectors/statistical-anomaly-detector.js';
export type { StatisticalAnomalyDetectorConfig } from './detectors/statistical-anomaly-detector.js';

export { BehaviorAnalyzer } from './detectors/behavior-analyzer.js';
export type { BehaviorAnalyzerConfig } from './detectors/behavior-analyzer.js';

export { TimeSeriesDetector } from './detectors/time-series-detector.js';
export type { TimeSeriesDetectorConfig } from './detectors/time-series-detector.js';

export { IsolationForest } from './detectors/isolation-forest.js';
export type { IsolationForestConfig } from './detectors/isolation-forest.js';

// Re-export core types for convenience
export {
  IAnomalyDetector,
  IBehaviorAnalyzer,
  AnomalyScore,
  BehaviorProfile
} from '@intelgraph/threat-detection-core';
