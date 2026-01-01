/**
 * Trust & Confidence Scoring Types
 *
 * Type definitions for the trust scoring system.
 * All types conform to the Trust Model.
 *
 * @module agents/trust/types
 */

// ============================================================================
// Trust Score Types
// ============================================================================

export type TrustScoreBand = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

export type SubjectType = 'agent' | 'model';

export interface TrustScoreComponents {
  historicalAccuracy: number; // 0-1
  constraintCompliance: number; // 0-1
  auditOutcomes: number; // 0-1
  consistency: number; // 0-1
}

export interface TrustScoreBreakdown {
  overallScore: number; // 0-1
  band: TrustScoreBand;
  components: TrustScoreComponents;
  dataPoints: {
    totalPredictions?: number;
    totalTasks?: number;
    violations: number;
    audits: number;
  };
  lastUpdated: string;
  decayFactor: number;
}

export interface TrustScoreWithUncertainty extends TrustScoreBreakdown {
  confidenceInterval: { lower: number; upper: number };
  sampleSize: number;
}

// ============================================================================
// Component Weights
// ============================================================================

export interface ComponentWeights {
  historicalAccuracy: number; // Default: 0.40
  constraintCompliance: number; // Default: 0.30
  auditOutcomes: number; // Default: 0.20
  consistency: number; // Default: 0.10
}

export const DEFAULT_COMPONENT_WEIGHTS: ComponentWeights = {
  historicalAccuracy: 0.4,
  constraintCompliance: 0.3,
  auditOutcomes: 0.2,
  consistency: 0.1,
};

// ============================================================================
// Agent-Specific Trust
// ============================================================================

export interface AgentTrustComponents extends TrustScoreComponents {
  capabilityAdherence: number; // 0-1
  negotiationBehavior: number; // 0-1
  resourceDiscipline: number; // 0-1
}

export interface AgentTrustWeights extends ComponentWeights {
  capabilityAdherence: number; // Default: 0.10
  negotiationBehavior: number; // Default: 0.05
  resourceDiscipline: number; // Default: 0.05
}

export const DEFAULT_AGENT_TRUST_WEIGHTS: AgentTrustWeights = {
  ...DEFAULT_COMPONENT_WEIGHTS,
  historicalAccuracy: 0.32, // Reduced to make room for agent-specific
  constraintCompliance: 0.24,
  auditOutcomes: 0.16,
  consistency: 0.08,
  capabilityAdherence: 0.1,
  negotiationBehavior: 0.05,
  resourceDiscipline: 0.05,
};

// ============================================================================
// Model-Specific Trust
// ============================================================================

export interface ModelTrustComponents extends TrustScoreComponents {
  calibration: number; // 0-1
  biasMetrics: number; // 0-1
  explainabilityQuality: number; // 0-1
}

export interface ModelTrustWeights extends ComponentWeights {
  calibration: number; // Default: 0.15
  biasMetrics: number; // Default: 0.10
  explainabilityQuality: number; // Default: 0.05
}

export const DEFAULT_MODEL_TRUST_WEIGHTS: ModelTrustWeights = {
  ...DEFAULT_COMPONENT_WEIGHTS,
  historicalAccuracy: 0.28, // Reduced to make room for model-specific
  constraintCompliance: 0.21,
  auditOutcomes: 0.14,
  consistency: 0.07,
  calibration: 0.15,
  biasMetrics: 0.1,
  explainabilityQuality: 0.05,
};

// ============================================================================
// Historical Data
// ============================================================================

export interface HistoricalAccuracyData {
  totalPredictions: number;
  correctPredictions: number;
  totalTasks: number;
  successfulTasks: number;
  recentAccuracy: number; // Last 30 days, weighted more
  olderAccuracy: number; // 30-90 days ago
}

export interface ComplianceData {
  totalPolicyChecks: number;
  violations: number;
  recentViolations: number; // Last 30 days
  resourceBreaches: number;
  unauthorizedAttempts: number;
}

export interface AuditData {
  totalAudits: number;
  passedAudits: number;
  criticalFindings: number; // Last 60 days
  mediumFindings: number; // Last 60 days
}

export interface ConsistencyData {
  accuracyByWeek: number[]; // Weekly accuracy over time
  behavioralVariance: number; // Deviation from historical patterns
}

// ============================================================================
// Trust Score Request
// ============================================================================

export interface TrustScoreRequest {
  subjectId: string; // Agent or model ID
  subjectType: SubjectType;
  tenantId: string;
  includeUncertainty?: boolean;
  includeExplanation?: boolean;
}

export interface TrustScoreResponse {
  subjectId: string;
  subjectType: SubjectType;
  score: TrustScoreBreakdown | TrustScoreWithUncertainty;
  explanation?: string;
  timestamp: string;
}

// ============================================================================
// Trust Score Update Event
// ============================================================================

export interface TrustScoreUpdateEvent {
  eventType: 'trust_score_updated';
  subjectId: string;
  subjectType: SubjectType;
  oldScore: number;
  newScore: number;
  updateReason: string;
  components: TrustScoreBreakdown;
  timestamp: string;
}

// ============================================================================
// Decay Configuration
// ============================================================================

export interface DecayConfiguration {
  enabled: boolean;
  intervals: Array<{
    daysSinceActivity: number;
    decayFactor: number;
  }>;
}

export const DEFAULT_DECAY_CONFIG: DecayConfiguration = {
  enabled: true,
  intervals: [
    { daysSinceActivity: 7, decayFactor: 1.0 },
    { daysSinceActivity: 30, decayFactor: 0.95 },
    { daysSinceActivity: 90, decayFactor: 0.85 },
    { daysSinceActivity: 180, decayFactor: 0.7 },
    { daysSinceActivity: 365, decayFactor: 0.5 }, // Revert to neutral
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getTrustScoreBand(score: number): TrustScoreBand {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'very_low';
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}
