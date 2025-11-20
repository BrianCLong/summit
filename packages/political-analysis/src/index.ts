/**
 * Political Analysis Package
 * Comprehensive political intelligence and analysis platform
 *
 * @module @intelgraph/political-analysis
 */

// Export main classes
export { PoliticalAnalyzer } from './analysis/PoliticalAnalyzer.js';
export { IntelligenceEngine } from './intelligence/IntelligenceEngine.js';

// Export all types
export * from './types/index.js';

// Re-export for convenience
export {
  // Core Enums
  PoliticalActorType,
  GovernmentType,
  IdeologyType,
  PowerLevel,
  StabilityLevel,
  ElectoralSystemType,
  PoliticalTrendType,
  IntelligenceConfidence,
  IntelligenceSource,
  IntelligenceCategory,
  PolicyDomain,
  StabilityCategory,
  LeadershipStyle,
  DecisionMakingStyle,

  // Political Actors
  type PoliticalActor,
  type PoliticalLeader,
  type PoliticalParty,
  type PoliticalFaction,

  // Government Structures
  type GovernmentStructure,
  type Legislature,
  type Chamber,
  type PartyComposition,
  type Judiciary,
  type Executive,
  type CabinetMember,
  type LocalGovernment,
  type ConstitutionalFramework,
  type ChecksAndBalances,
  type SuccessionMechanism,

  // Political Trends
  type PoliticalTrend,
  type TrendImpact,
  type TrendIndicator,
  type PoliticalMovement,

  // Power Dynamics
  type PowerDynamics,
  type PowerStructure,
  type PoliticalAlliance,
  type PoliticalConflict,
  type ConflictResolution,
  type PowerBalance,
  type PowerPosition,
  type InfluenceNetwork,
  type NetworkNode,
  type NetworkConnection,

  // Policy Positions
  type PolicyPosition,
  type VotingRecord,

  // Electoral Systems
  type ElectoralSystem,
  type ElectionResult,
  type CandidateResult,
  type ElectionIntegrity,
  type ElectoralForecast,
  type Prediction,
  type Scenario,

  // Political Stability
  type PoliticalStability,
  type StabilityIndicator,
  type IndicatorDataPoint,
  type RiskFactor,
  type StabilityForecast,
  type StabilityScenario,

  // Leadership Assessment
  type LeadershipProfile,
  type PoliticalSkills,
  type PersonalityTraits,
  type ApprovalRating,
  type DemographicBreakdown,
  type ApprovalDataPoint,

  // Political Intelligence
  type PoliticalIntelligence,
  type IntelligencePattern,
  type IntelligenceInsight,

  // Analysis Results
  type PoliticalLandscapeAnalysis,
  type PowerDynamicsAssessment,
  type PowerShift,
  type PowerForecast,
  type PowerScenario,

  // Event Types
  type PoliticalAnalysisEvents,

  // Configuration
  type PoliticalAnalysisConfig,
  type IntelligenceEngineConfig
} from './types/index.js';
