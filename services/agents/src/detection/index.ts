/**
 * Anomaly Detection Module
 *
 * Unsupervised anomaly detection system for OSINT/CTI outlier detection
 * over Neo4j and pgvector data streams.
 *
 * Features:
 * - Isolation Forest for feature-based anomaly detection
 * - Graph Diffusion for network-based anomaly detection
 * - Real-time stream processing from Redis
 * - Agentic alerting with escalation and auto-investigation
 *
 * Performance targets:
 * - 91% precision
 * - p95 latency < 500ms
 */

export { IsolationForestDetector } from './IsolationForestDetector.js';
export { GraphDiffusionDetector } from './GraphDiffusionDetector.js';
export { StreamProcessor } from './StreamProcessor.js';
export { AlertingAgent } from './AlertingAgent.js';
export { AnomalyDetectionService } from './AnomalyDetectionService.js';

export type {
  // Core types
  AnomalyType,
  AnomalySeverity,
  AlertPriority,
  DataSourceType,
  DetectorState,

  // Feature and detection types
  FeatureVector,
  AnomalyScore,
  FeatureContribution,

  // Graph types
  GraphNode,
  GraphEdge,
  DiffusionState,

  // Anomaly and alert types
  DetectedAnomaly,
  AnomalyEvidence,
  AnomalyAlert,

  // Stream types
  StreamDataPoint,

  // Configuration types
  IsolationForestConfig,
  GraphDiffusionConfig,
  AnomalyDetectorConfig,
  AlertingConfig,
  EscalationRule,
  AlertChannel,

  // Metrics and health types
  DetectionMetrics,
  DetectorHealth,
} from './types.js';
