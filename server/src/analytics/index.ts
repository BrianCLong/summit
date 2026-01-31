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
// Note: RiskFactor is already exported from policy/index.ts, so we exclude it from compliance
export {
  CompliancePredictionEngine,
  getCompliancePredictionEngine,
  type ComplianceFramework,
  type PredictionConfidence,
  type AuditOutcome,
  type RiskLevel,
  type ComplianceState,
  type ControlState,
  type EvidenceMetrics,
  type HistoricalAudit,
  type ComplianceGap,
  type AuditPrediction,
  // RiskFactor excluded - already exported from policy
  type ControlRisk,
  type RecommendedAction,
  type ComplianceTrend,
  type TrendDataPoint,
  type PredictionEngineConfig,
  type PredictionStats,
  GapPredictionService,
  getGapPredictionService,
  type GapCategory,
  type GapStatus,
  type PredictedGap,
  type GapIndicator,
  type HistoricalPattern,
  type GapImpact,
  type PreventiveAction,
  type ControlMetricHistory,
  type ControlMetricPoint,
  type GapPredictionConfig,
  type GapPredictionStats,
  RemediationPrioritizer,
  getRemediationPrioritizer,
  type RemediationType,
  type RemediationStatus,
  type Effort,
  type RemediationItem,
  type PrioritizedRemediation,
  type PriorityFactor,
  type ResourceRequirement,
  type RemediationPlan,
  type TimelineItem,
  type ResourceSummary,
  type RiskProjection,
  type PrioritizerConfig,
  type PrioritizerStats,
  EvidenceQualityScorer,
  getEvidenceQualityScorer,
  type EvidenceType,
  type QualityDimension,
  type Evidence,
  type EvidenceAttachment,
  type QualityScore,
  type DimensionScore,
  type QualityFinding,
  type ControlEvidenceAssessment,
  type EvidenceGap,
  type BatchScoreResult,
  type ScorerConfig,
  type ScorerStats,
} from './compliance/index.js';
