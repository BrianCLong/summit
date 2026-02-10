/**
 * Compliance Analytics Module
 *
 * ML-powered compliance prediction, gap analysis, and evidence quality assessment.
 *
 * @module analytics/compliance
 */

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
  type RiskFactor,
  type ControlRisk,
  type RecommendedAction,
  type ComplianceTrend,
  type TrendDataPoint,
  type PredictionEngineConfig,
  type PredictionStats,
} from './CompliancePredictionEngine.ts';

export {
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
} from './GapPredictionService.ts';

export {
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
} from './RemediationPrioritizer.ts';

export {
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
} from './EvidenceQualityScorer.ts';
