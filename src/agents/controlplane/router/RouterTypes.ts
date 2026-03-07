/**
 * RouterTypes — shared types for the Summit deterministic agent router.
 *
 * EVD-AFCP-ROUTER-002
 */

import type { RiskLevel } from "../registry/AgentDescriptor.js";

export interface TaskSpec {
  /** Task identifier (must be stable and non-empty). */
  id: string;

  /** Semantic type used for capability matching. */
  type: string;

  /** Goal description (human-readable). */
  goal: string;

  /** Required capability tokens. */
  requiredCapabilities: string[];

  /** Tools the task needs. */
  requiredTools: string[];

  /** Datasets the task needs to read or write. */
  requiredDatasets: string[];

  /** Maximum acceptable risk level for the selected agent. */
  riskBudget: RiskLevel;

  /** Maximum acceptable routing latency (milliseconds). */
  latencyBudgetMs: number;

  /** Maximum acceptable marginal cost (arbitrary unit). */
  costBudget: number;

  /** Whether this task requires explicit human approval before execution. */
  requiresApproval: boolean;

  /** Context package compiled by the graph context compiler (opaque). */
  graphContext?: unknown;

  /** Optional token budget for context compaction. */
  tokenBudget?: number;
}

export interface RouteDecision {
  /** Selected agent id, or null if no eligible agent was found. */
  selectedAgentId: string | null;

  /** Whether the selected agent requires human approval before execution. */
  requiresHumanApproval: boolean;

  /** Reasons the route was denied (empty when selectedAgentId is set). */
  denialReasons: string[];

  /** Routing score of the selected agent (for observability). */
  score?: number;
}

/** Internal scoring record used during candidate ranking. */
export interface ScoredCandidate {
  agentId: string;
  score: number;
  blastRadius: number;
  determinism: number;
  marginalCost: number;
  queueDepth: number;
}
