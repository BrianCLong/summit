/**
 * Multi-Agent Negotiation Types
 *
 * Type definitions for the negotiation runtime.
 * All types conform to the Negotiation Protocol.
 *
 * @module agents/negotiation/types
 */

import { GovernanceVerdict } from '../../governance/types.js';

// ============================================================================
// Roles & Outcomes
// ============================================================================

export type NegotiationRole = 'proposer' | 'challenger' | 'arbiter' | 'system' | 'human' | 'policy_engine';

export type NegotiationOutcome = 'agreement' | 'disagreement' | 'timeout' | 'aborted';

export type MessageType =
  | 'proposal'
  | 'counter_proposal'
  | 'challenge'
  | 'counter_challenge'
  | 'acceptance'
  | 'rejection'
  | 'resolution'
  | 'approval';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

// ============================================================================
// Negotiation State
// ============================================================================

export type NegotiationState =
  | 'INIT'
  | 'CHALLENGE'
  | 'ITERATION'
  | 'RESOLUTION'
  | 'APPROVAL'
  | 'CLOSED'
  | 'ABORTED';

export interface NegotiationLimits {
  maxTurns: number; // Default: 10, Max: 20
  maxCounterProposals: number; // Default: 3, Max: 5
  maxChallenges: number; // Default: 2, Max: 4
  maxConcurrentNegotiations: number; // Default: 1, Max: 3
  perTurnTimeoutMs: number; // Default: 60000, Max: 300000
  totalTimeoutMs: number; // Default: 600000 (10 min), Max: 1800000 (30 min)
  approvalWindowMs: number; // Default: 86400000 (24 hr), Max: 604800000 (7 days)
}

// ============================================================================
// Message Schemas
// ============================================================================

export interface ProposalMessage {
  messageId: string;
  negotiationId: string;
  role: 'proposer';
  type: 'proposal' | 'counter_proposal';
  turn: number;
  timestamp: string;

  proposal: {
    goal: string;
    terms: Record<string, any>;
    justification: string;
    evidence: string[];
    tradeoffs: string[];
  };

  metadata: {
    agentId: string;
    tenantId: string;
    confidence: number;
  };
}

export interface ChallengeMessage {
  messageId: string;
  negotiationId: string;
  role: 'challenger';
  type: 'challenge' | 'counter_challenge';
  turn: number;
  timestamp: string;
  inReplyTo: string;

  challenge: {
    objections: Array<{
      field: string;
      reason: string;
      suggestedAlternative?: any;
      evidence?: string[];
    }>;
    acceptableTerms?: Record<string, any>;
  };

  metadata: {
    agentId: string;
    tenantId: string;
    riskAssessment?: RiskLevel;
  };
}

export interface ResolutionMessage {
  messageId: string;
  negotiationId: string;
  role: 'arbiter' | 'system';
  type: 'resolution';
  turn: number;
  timestamp: string;

  resolution: {
    outcome: NegotiationOutcome;
    finalTerms?: Record<string, any>;
    rationale: string;
    requiredApprovals: string[];
  };

  metadata: {
    totalTurns: number;
    durationMs: number;
    participantAgents: string[];
  };
}

export interface ApprovalMessage {
  messageId: string;
  negotiationId: string;
  role: 'human' | 'policy_engine';
  type: 'approval';
  turn?: number;
  timestamp: string;

  decision: 'approved' | 'rejected' | 'conditional';
  conditions?: string[];
  remarks?: string;
  approverIdentity: string;

  metadata?: {
    agentId: string;
    tenantId?: string;
  };
}

export interface AcceptanceMessage {
  messageId: string;
  negotiationId: string;
  role: NegotiationRole;
  type: 'acceptance';
  turn: number;
  timestamp: string;
  inReplyTo: string;

  acceptance: {
    acceptedTerms: Record<string, unknown>;
    remarks?: string;
  };

  metadata?: {
    agentId: string;
    tenantId?: string;
  };
}

export type NegotiationMessage = ProposalMessage | ChallengeMessage | ResolutionMessage | ApprovalMessage | AcceptanceMessage;

// ============================================================================
// Negotiation Types
// ============================================================================

export type NegotiationType =
  | 'resource_allocation'
  | 'task_prioritization'
  | 'policy_conflict_resolution'
  | 'collaborative_planning'
  | 'risk_mitigation';

// ============================================================================
// Scoring
// ============================================================================

export interface ProposalScore {
  proposalId: string;
  scores: {
    feasibility: number; // 0-1
    compliance: number; // 0-1
    costBenefit: number; // 0-1
    riskMitigation: number; // 0-1
    stakeholderAlignment: number; // 0-1
  };
  totalScore: number;
  rank: number;
}

export interface ScoringWeights {
  feasibility: number;
  compliance: number;
  costBenefit: number;
  riskMitigation: number;
  stakeholderAlignment: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  feasibility: 0.25,
  compliance: 0.3,
  costBenefit: 0.2,
  riskMitigation: 0.15,
  stakeholderAlignment: 0.1,
};

// ============================================================================
// Negotiation Session
// ============================================================================

export interface NegotiationSession {
  negotiationId: string;
  type: NegotiationType;
  state: NegotiationState;
  tenantId: string;

  participants: {
    proposerId: string;
    challengerId: string;
    arbiterId?: string;
  };

  limits: NegotiationLimits;

  transcript: NegotiationMessage[];
  currentTurn: number;

  startTime: number;
  lastActivityTime: number;
  endTime?: number;

  outcome?: NegotiationOutcome;
  finalTerms?: Record<string, any>;

  policyVerdicts: GovernanceVerdict[];
  abortReason?: string;
}

// ============================================================================
// Negotiation Request
// ============================================================================

export interface NegotiationRequest {
  type: NegotiationType;
  tenantId: string;
  proposerId: string;
  challengerId: string;
  arbiterId?: string;

  initialProposal: {
    goal: string;
    terms: Record<string, any>;
    justification: string;
    evidence?: string[];
  };

  limits?: Partial<NegotiationLimits>;
}

// ============================================================================
// Transcript
// ============================================================================

export interface RedactedMessage {
  messageId: string;
  role: string;
  type: string;
  turn: number;
  timestamp: string;
  summary: string;
  sensitiveFieldsRedacted: string[];
}

export interface RedactedTranscript {
  negotiationId: string;
  participants: string[];
  turnCount: number;
  outcome: string;
  durationMs: number;
  messages: RedactedMessage[];
  hash: string;
}

// ============================================================================
// Audit Events
// ============================================================================

export interface NegotiationAuditEvent {
  eventType:
    | 'negotiation_initiated'
    | 'negotiation_turn'
    | 'negotiation_resolved'
    | 'negotiation_approved'
    | 'negotiation_aborted'
    | 'negotiation_violation';
  negotiationId: string;
  turn: number;
  agentId?: string;
  role?: NegotiationRole;
  outcome?: NegotiationOutcome;
  violationType?: string;
  policyVerdict?: string;
  timestamp: string;
}

// ============================================================================
// Errors
// ============================================================================

export class NegotiationError extends Error {
  constructor(
    message: string,
    public code: NegotiationErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'NegotiationError';
  }
}

export type NegotiationErrorCode =
  | 'CAPABILITY_UNAUTHORIZED'
  | 'POLICY_DENIED'
  | 'TURN_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'INVALID_MESSAGE'
  | 'INVALID_STATE'
  | 'STALEMATE'
  | 'PROHIBITED_TERMS'
  | 'SCHEMA_VIOLATION';
