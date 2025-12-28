/**
 * Policy Analytics Module
 *
 * ML-powered policy analysis, optimization, simulation, and impact assessment.
 *
 * @module analytics/policy
 */

export {
  PolicyOptimizationEngine,
  getPolicyOptimizationEngine,
  type OptimizationType,
  type OptimizationPriority,
  type OptimizationStatus,
  type PolicyRule,
  type Policy,
  type OptimizationSuggestion,
  type ImpactEstimate,
  type PolicyConflict,
  type PolicyCoverageGap,
  type OptimizationEngineConfig,
  type OptimizationStats,
} from './PolicyOptimizationEngine.js';

export {
  PolicySimulator,
  getPolicySimulator,
  type PolicyChange,
  type PolicyRuleSnapshot,
  type SimulationRequest,
  type SimulationTestCase,
  type SimulationOptions,
  type SimulationResult,
  type SimulationSummary,
  type TestCaseResult,
  type HistoricalImpact,
  type AccessPatternChange,
  type ComplianceImpact,
  type RiskAssessment,
  type RiskFactor,
} from './PolicySimulator.js';

export {
  PolicyRecommendationService,
  getPolicyRecommendationService,
  type RecommendationType,
  type RecommendationPriority,
  type RecommendationStatus,
  type PolicyRecommendation,
  type SuggestedAction,
  type PolicyRuleTemplate,
  type AccessPattern,
  type UsageAnalysis,
  type UnusedPermission,
  type HighRiskAccess,
  type RecommendationConfig,
  type RecommendationStats,
} from './PolicyRecommendationService.js';

export {
  PolicyImpactAnalyzer,
  getPolicyImpactAnalyzer,
  type PolicyDecision,
  type PolicyMetrics,
  type TrendData,
  type ImpactReport,
  type ImpactSummary,
  type SecurityPostureAssessment,
  type ComplianceStatusSummary,
  type OperationalImpact,
  type ImpactAnalyzerConfig,
} from './PolicyImpactAnalyzer.js';
