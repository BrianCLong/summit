/**
 * RepoOS Autonomous Governor - Decision Contracts
 *
 * Core type definitions for governed repository operations.
 * These contracts enable policy-mediated decision making across
 * all repository automation, ensuring safe autonomous operation.
 *
 * Design Philosophy:
 * - Every automated action must pass through policy evaluation
 * - Decisions are explainable and auditable
 * - Agent proposals separate from execution
 * - Constitutional enforcement at the type level
 */

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Types of actions the governor can evaluate
 */
export type CandidateActionType =
  | 'merge_pr'           // Merge a single PR
  | 'batch_prs'          // Merge multiple PRs as a batch
  | 'close_pr'           // Close a PR
  | 'reopen_pr'          // Reopen a closed PR
  | 'label_pr'           // Add/remove labels
  | 'assign_agent'       // Assign agent to a task
  | 'defer'              // Defer decision to later
  | 'freeze'             // Freeze repository automation
  | 'escalate_human';    // Escalate to human review

/**
 * Decision outcomes from policy evaluation
 */
export type DecisionOutcome =
  | 'allow'                  // Action is permitted
  | 'deny'                   // Action is forbidden
  | 'require_human_review'   // Human approval required
  | 'delay';                 // Action should be deferred

/**
 * Severity levels for policy decisions
 */
export type DecisionSeverity =
  | 'low'      // Routine operations
  | 'medium'   // Moderate risk or complexity
  | 'high'     // Significant impact
  | 'critical'; // System-critical operations

// ============================================================================
// ACTOR TYPES
// ============================================================================

/**
 * Who is proposing or executing the action
 */
export type Actor =
  | 'human'    // Direct human action
  | 'agent'    // AI agent proposal
  | 'system';  // System automation

/**
 * Agent types that can propose actions
 */
export type AgentType =
  | 'triage'           // PR classification and routing
  | 'batch_planner'    // Batch optimization
  | 'review'           // Review summarization
  | 'decomposition'    // PR splitting
  | 'remediation'      // Automated fixes
  | 'archaeology';     // Historical analysis

// ============================================================================
// CANDIDATE ACTION
// ============================================================================

/**
 * A proposed action that needs policy evaluation
 */
export interface CandidateAction {
  /** Unique identifier for this action */
  id?: string;

  /** Type of action being proposed */
  type: CandidateActionType;

  /** Target entities (PR numbers, commit SHAs, etc.) */
  targetIds: string[];

  /** Who is proposing this action */
  actor: Actor;

  /** If actor is agent, which agent type */
  agentType?: AgentType;

  /** Human-readable explanation of why */
  rationale?: string;

  /** Additional context and evidence */
  metadata?: Record<string, unknown>;

  /** Timestamp when action was proposed */
  proposedAt?: string;
}

// ============================================================================
// POLICY DECISION
// ============================================================================

/**
 * Result of policy evaluation for a candidate action
 */
export interface PolicyDecision {
  /** Was the action allowed */
  allowed: boolean;

  /** Specific decision outcome */
  decision: DecisionOutcome;

  /** Severity level of this decision */
  severity: DecisionSeverity;

  /** Human-readable reasons for decision */
  reasons: string[];

  /** Machine-readable evidence supporting decision */
  evidence: Record<string, unknown>;

  /** Policy rule IDs that contributed to decision */
  policyRuleIds: string[];

  /** Timestamp of decision */
  timestamp: string;

  /** Optional recommendation for next steps */
  recommendation?: string;

  /** Optional risk forecast associated with this decision */
  riskForecast?: RiskForecast;
}

// ============================================================================
// RISK FORECASTING
// ============================================================================

/**
 * Predicted risk profile for an action
 */
export interface RiskForecast {
  /** Unique identifier */
  id?: string;

  /** What is being assessed */
  targetId: string;

  /** Probability of merge conflicts (0-1) */
  mergeConflictProbability: number;

  /** Probability of CI failure (0-1) */
  ciFailureProbability: number;

  /** Probability of rollback needed (0-1) */
  rollbackProbability: number;

  /** Estimated blast radius (0-1) */
  blastRadiusScore: number;

  /** Subsystem instability risk (0-1) */
  subsystemInstabilityScore: number;

  /** Overall confidence in forecast (0-1) */
  confidence: number;

  /** Recommended action based on risk profile */
  recommendedAction: 'merge_now' | 'batch_later' | 'split_pr' | 'require_review' | 'defer';

  /** Human-readable explanation */
  reasons: string[];

  /** Timestamp when forecast generated */
  generatedAt: string;

  /** Evidence used for forecast */
  evidence?: Record<string, unknown>;
}

// ============================================================================
// PULL REQUEST STATE
// ============================================================================

/**
 * Snapshot of PR state for decision making
 */
export interface PullRequestState {
  /** PR identifier */
  id: string;

  /** PR number */
  number: number;

  /** PR title */
  title: string;

  /** Author username */
  author: string;

  /** Type of actor who created PR */
  actorType: 'human' | 'agent' | 'unknown';

  /** List of changed file paths */
  changedFiles: string[];

  /** PR labels */
  labels: string[];

  /** Lines added/removed */
  sizeLines?: number;

  /** Can this PR be merged without conflicts */
  mergeable?: boolean;

  /** CI status */
  ciStatus?: 'green' | 'red' | 'pending' | 'unknown';

  /** Review approval status */
  reviewStatus?: 'approved' | 'changes_requested' | 'pending' | 'unknown';

  /** When PR was last updated */
  updatedAt?: string;

  /** When PR was created */
  createdAt?: string;

  /** Detected concern/domain */
  concern?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// REPOSITORY STATE
// ============================================================================

/**
 * Complete repository state for decision context
 */
export interface RepoState {
  /** All open PRs */
  prs: PullRequestState[];

  /** Is system in incident mode */
  incidentMode: boolean;

  /** Is there an active release freeze */
  releaseFreeze: boolean;

  /** Protected file path patterns */
  protectedPaths: string[];

  /** Required CI check names */
  requiredChecks: string[];

  /** When this state snapshot was generated */
  generatedAt: string;

  /** Current repository entropy score */
  entropyScore?: number;

  /** Number of active frontiers */
  activeFrontiers?: number;

  /** Current CI queue depth */
  ciQueueDepth?: number;

  /** Additional state metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT PROPOSAL
// ============================================================================

/**
 * Agent-originated action proposal
 */
export interface AgentActionProposal {
  /** Unique proposal identifier */
  proposalId: string;

  /** Agent that created proposal */
  agentId: string;

  /** Agent type */
  agentType: AgentType;

  /** The proposed action */
  action: CandidateAction;

  /** Agent's explanation */
  rationale: string;

  /** Supporting evidence */
  evidence: Record<string, unknown>;

  /** When proposal was created */
  createdAt: string;

  /** Optional policy hints from agent */
  policyHints?: string[];

  /** Agent's confidence in proposal (0-1) */
  confidence?: number;
}

/**
 * Result of processing agent proposal
 */
export interface GovernedActionResult {
  /** Was proposal accepted */
  accepted: boolean;

  /** Does it require human review */
  requiresHumanReview: boolean;

  /** Policy decision */
  policyDecision: PolicyDecision;

  /** Optional risk forecast */
  forecast?: RiskForecast;

  /** If accepted and executed, execution ID */
  executionId?: string;

  /** Timestamp of result */
  timestamp?: string;
}

// ============================================================================
// EXECUTION MODES
// ============================================================================

/**
 * Operating modes for the governor
 */
export type ExecutionMode =
  | 'observe_only'           // No execution, only observation
  | 'forecast_only'          // Generate forecasts but don't execute
  | 'manual_approval_only'   // Require human approval for all actions
  | 'governed_execute';      // Execute allowed actions automatically

/**
 * Kill switch configuration
 */
export interface KillSwitches {
  /** Completely disable all automation */
  globalAutonomyOff: boolean;

  /** Disable action executor */
  executorOff: boolean;

  /** Disable agent proposal intake */
  agentProposalIntakeOff: boolean;

  /** Only generate forecasts, no decisions */
  forecastOnly: boolean;

  /** Require manual approval for everything */
  manualApprovalOnly: boolean;
}

// ============================================================================
// AUDIT RECORD
// ============================================================================

/**
 * Immutable audit log entry
 */
export interface AuditRecord {
  /** Unique audit entry ID */
  id: string;

  /** Timestamp */
  timestamp: string;

  /** Who initiated the action */
  actor: Actor;

  /** Specific actor identifier */
  actorId?: string;

  /** Agent type if applicable */
  agentType?: AgentType;

  /** Type of action */
  actionType: CandidateActionType;

  /** Target entities */
  targetIds: string[];

  /** Original proposed action */
  proposedAction?: Record<string, unknown>;

  /** Policy decision made */
  policyDecision: Record<string, unknown>;

  /** Risk forecast if generated */
  forecast?: Record<string, unknown>;

  /** Execution mode at time of decision */
  executionMode: ExecutionMode;

  /** Outcome */
  outcome: 'simulated' | 'executed' | 'denied' | 'delayed' | 'review_required';

  /** Supporting evidence */
  evidence: Record<string, unknown>;

  /** Error if operation failed */
  error?: string;
}

// ============================================================================
// POLICY RULE
// ============================================================================

/**
 * Individual policy rule that can evaluate actions
 */
export interface PolicyRule {
  /** Unique rule identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Detailed description */
  description: string;

  /** Priority (higher = evaluated first) */
  priority: number;

  /** Is this rule currently enabled */
  enabled: boolean;

  /**
   * Evaluate action against this rule
   * Returns null if rule doesn't apply, decision if it does
   */
  evaluate(action: CandidateAction, state: RepoState): PolicyDecision | null;

  /** Optional tags for categorization */
  tags?: string[];
}

// ============================================================================
// POLICY CONTEXT
// ============================================================================

/**
 * Complete context for policy evaluation
 */
export interface PolicyContext {
  /** The action being evaluated */
  action: CandidateAction;

  /** Current repository state */
  repoState: RepoState;

  /** Current execution mode */
  executionMode: ExecutionMode;

  /** Kill switch settings */
  killSwitches: KillSwitches;

  /** Optional risk forecast */
  riskForecast?: RiskForecast;

  /** Additional context */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Multiple PR batch proposal
 */
export interface BatchProposal {
  /** Unique batch identifier */
  batchId: string;

  /** PRs in this batch */
  prNumbers: number[];

  /** Shared concern/domain */
  concern: string;

  /** Estimated risk for entire batch */
  aggregateRisk: number;

  /** Rationale for batching these together */
  rationale: string;

  /** Created by */
  proposedBy: Actor;

  /** When proposed */
  proposedAt: string;
}

// ============================================================================
// CONSTITUTIONAL VIOLATION
// ============================================================================

/**
 * Violation of constitutional law
 */
export class ConstitutionalViolation extends Error {
  constructor(
    public lawId: string,
    public message: string,
    public evidence?: Record<string, unknown>
  ) {
    super(`Constitutional violation: ${lawId} - ${message}`);
    this.name = 'ConstitutionalViolation';
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPolicyDecision(obj: unknown): obj is PolicyDecision {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'allowed' in obj &&
    'decision' in obj &&
    'reasons' in obj
  );
}

export function isAgentProposal(obj: unknown): obj is AgentActionProposal {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'proposalId' in obj &&
    'agentId' in obj &&
    'action' in obj
  );
}

export function isAuditRecord(obj: unknown): obj is AuditRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'timestamp' in obj &&
    'actor' in obj &&
    'outcome' in obj
  );
}
