/**
 * AI-Human Collaboration Service Types
 * Enables AI as teammate with commander's control and full traceability
 */

// Operation autonomy levels
export type AutonomyLevel = 'full_auto' | 'supervised' | 'advisory' | 'manual_only';

// Recommendation confidence bands
export type ConfidenceBand = 'high' | 'medium' | 'low' | 'uncertain';

// Decision outcomes
export type DecisionOutcome = 'accepted' | 'rejected' | 'modified' | 'deferred' | 'expired';

// Feedback sentiment
export type FeedbackSentiment = 'positive' | 'negative' | 'neutral' | 'corrective';

/**
 * AI-generated recommendation with probable outcomes
 */
export interface Recommendation {
  id: string;
  missionId: string;
  timestamp: string;

  // What the AI suggests
  action: string;
  actionType: string;
  parameters: Record<string, unknown>;

  // Confidence and reasoning
  confidence: number; // 0-1
  confidenceBand: ConfidenceBand;
  reasoning: string[];
  modelVersion: string;

  // Probable outcomes
  outcomes: ProbableOutcome[];

  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];

  // Execution context
  autonomyLevel: AutonomyLevel;
  requiresApproval: boolean;
  expiresAt: string;

  // Traceability
  traceId: string;
  spanId: string;
}

/**
 * Probable outcome with likelihood and impact
 */
export interface ProbableOutcome {
  description: string;
  probability: number; // 0-1
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  mitigations?: string[];
}

/**
 * Risk factor detail
 */
export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

/**
 * Commander's decision on a recommendation
 */
export interface CommanderDecision {
  id: string;
  recommendationId: string;
  missionId: string;
  timestamp: string;

  // Decision details
  outcome: DecisionOutcome;
  commanderId: string;
  commanderRole: string;

  // Override details (if modified)
  originalAction?: string;
  modifiedAction?: string;
  modifiedParameters?: Record<string, unknown>;

  // Justification
  reason: string;
  authority: string;

  // Execution tracking
  executedAt?: string;
  executionResult?: ExecutionResult;

  // Traceability
  traceId: string;
  spanId: string;
}

/**
 * Result of executing a decision
 */
export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  sideEffects: string[];
}

/**
 * Operator feedback for model retraining
 */
export interface OperatorFeedback {
  id: string;
  recommendationId: string;
  decisionId?: string;
  missionId: string;
  timestamp: string;

  // Feedback provider
  operatorId: string;
  operatorRole: string;

  // Feedback content
  sentiment: FeedbackSentiment;
  rating: number; // 1-5
  comments?: string;

  // Correction data (for retraining)
  wasCorrect: boolean;
  correctAction?: string;
  correctParameters?: Record<string, unknown>;
  correctOutcome?: string;

  // Tags for categorization
  tags: string[];

  // Traceability
  traceId: string;
}

/**
 * Mission audit trail entry
 */
export interface MissionAuditEntry {
  id: string;
  missionId: string;
  timestamp: string;

  // Event classification
  eventType: 'recommendation' | 'decision' | 'execution' | 'feedback' | 'override' | 'escalation';
  eventCategory: 'ai_action' | 'human_action' | 'system_action';

  // Actor information
  actor: {
    type: 'ai' | 'human' | 'system';
    id: string;
    name?: string;
    role?: string;
  };

  // Event details
  action: string;
  resourceType: string;
  resourceId: string;

  // State tracking
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;

  // Linked records
  recommendationId?: string;
  decisionId?: string;
  feedbackId?: string;

  // Integrity (for tamper evidence)
  previousHash?: string;
  hash: string;

  // Traceability
  traceId: string;
  spanId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Collaboration session state
 */
export interface CollaborationSession {
  id: string;
  missionId: string;
  startedAt: string;

  // Current autonomy configuration
  autonomyLevel: AutonomyLevel;
  autoApprovalThreshold: number; // confidence threshold for auto-approval

  // Participants
  commanderId: string;
  operators: string[];

  // Statistics
  stats: {
    recommendationsGenerated: number;
    recommendationsAccepted: number;
    recommendationsRejected: number;
    recommendationsModified: number;
    averageConfidence: number;
    averageRating: number;
    feedbackCount: number;
  };

  // Status
  status: 'active' | 'paused' | 'completed' | 'aborted';
  endedAt?: string;
}

/**
 * Training batch for model retraining
 */
export interface TrainingBatch {
  id: string;
  createdAt: string;

  // Batch contents
  feedbackIds: string[];
  sampleCount: number;

  // Training metadata
  modelVersion: string;
  targetModelVersion: string;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  error?: string;

  // Results
  metrics?: {
    accuracyBefore: number;
    accuracyAfter: number;
    improvement: number;
  };
}

/**
 * Configuration for AI-Human collaboration
 */
export interface CollaborationConfig {
  // Autonomy settings
  defaultAutonomyLevel: AutonomyLevel;
  autoApprovalEnabled: boolean;
  autoApprovalThreshold: number;

  // Confidence thresholds
  highConfidenceThreshold: number;
  lowConfidenceThreshold: number;

  // Timeout settings
  recommendationTtlMs: number;
  decisionTimeoutMs: number;

  // Feedback settings
  feedbackRequired: boolean;
  minFeedbackForRetraining: number;

  // Risk settings
  criticalRiskRequiresApproval: boolean;
  highRiskRequiresApproval: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  defaultAutonomyLevel: 'supervised',
  autoApprovalEnabled: true,
  autoApprovalThreshold: 0.85,

  highConfidenceThreshold: 0.8,
  lowConfidenceThreshold: 0.5,

  recommendationTtlMs: 5 * 60 * 1000, // 5 minutes
  decisionTimeoutMs: 30 * 60 * 1000, // 30 minutes

  feedbackRequired: false,
  minFeedbackForRetraining: 100,

  criticalRiskRequiresApproval: true,
  highRiskRequiresApproval: true,
};
