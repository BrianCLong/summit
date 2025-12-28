/**
 * Analytics Module
 *
 * AI-powered analytics for anomaly detection, policy optimization,
 * and compliance prediction.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC4.1 (Monitoring), CC7.2 (Detection)
 *
 * @module analytics
 */

// Anomaly Detection
export {
  AnomalyDetectionService,
  getAnomalyDetectionService,
  type AnomalyType,
  type AnomalySeverity,
  type SuggestedAction,
  type AnomalyDetectionResult,
  type AnomalyDetails,
  type DataPoint,
  type AnomalyDetectorConfig,
  type DetectorStats,
} from './AnomalyDetectionService.js';

// Policy Analytics
export * from './policy/index.js';

// Compliance Analytics
export * from './compliance/index.js';
