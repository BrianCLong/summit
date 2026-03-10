/**
 * routeTask — deterministic, deny-by-default, graph-aware agent router.
 *
 * Scoring formula:
 *   0.30 * capabilityConfidence
 * + 0.20 * graphRelevance
 * + 0.15 * priorSuccessRate
 * + 0.10 * latencyFitness
 * + 0.10 * costFitness
 * + 0.10 * determinismScore
 * + 0.05 * observabilityScore
 *
 * Tie-break order (ascending priority):
 *   1. lower blastRadius
 *   2. higher determinism
 *   3. lower marginalCost
 *   4. lower queueDepth
 *   5. lexical ascending agentId  (stable sort guarantee)
 *
 * EVD-AFCP-ROUTER-002
 */

import type { AgentDescriptor } from "../registry/AgentDescriptor.js";
import type { TaskSpec, RouteDecision, ScoredCandidate } from "./RouterTypes.js";

// ─── Risk ordering ────────────────────────────────────────────────────────────

const RISK_ORDER: Record<AgentDescriptor["riskLevel"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

// ─── Scoring helpers (pure functions, deterministic) ─────────────────────────

function capabilityConfidence(agent: AgentDescriptor, task: TaskSpec): number {
  if (task.requiredCapabilities.length === 0) return 1;
  const matched = task.requiredCapabilities.filter((c) => agent.capabilities.includes(c));
  return matched.length / task.requiredCapabilities.length;
}

function graphRelevance(_agent: AgentDescriptor, task: TaskSpec): number {
  // When a graph context package is present the router defers to it.
  // A non-null context adds relevance; without it we return a neutral 0.5.
  return task.graphContext != null ? 0.8 : 0.5;
}

function priorSuccessRate(_agent: AgentDescriptor, _task: TaskSpec): number {
  // Placeholder: will be populated from the telemetry store in a later PR.
  return 0.75;
}

function latencyFitness(agent: AgentDescriptor, task: TaskSpec): number {
  // Lower risk agents are assumed faster; placeholder formula.
  const riskPenalty = RISK_ORDER[agent.riskLevel] * 0.15;
  const budget = task.latencyBudgetMs > 0 ? task.latencyBudgetMs : 500;
  // Normalise: assume high-risk agent adds ~200 ms overhead.
  const estimatedLatency = 50 + RISK_ORDER[agent.riskLevel] * 200;
  return estimatedLatency <= budget ? 1 - riskPenalty : 0;
}

function costFitness(agent: AgentDescriptor, task: TaskSpec): number {
  // Placeholder: cost-per-call increases with risk level.
  const estimatedCost = (RISK_ORDER[agent.riskLevel] + 1) * 10;
  return task.costBudget > 0 ? Math.min(1, task.costBudget / estimatedCost) : 0.5;
}

function blastRadiusScore(agent: AgentDescriptor): number {
  return RISK_ORDER[agent.riskLevel];
}

function marginalCost(agent: AgentDescriptor): number {
  return (RISK_ORDER[agent.riskLevel] + 1) * 10;
}

function queueDepth(_agent: AgentDescriptor): number {
  // Placeholder: will come from the runtime in a later PR.
  return 0;
}

// ─── Eligibility filter ───────────────────────────────────────────────────────

function hasRequiredCapabilities(agent: AgentDescriptor, task: TaskSpec): boolean {
  return task.requiredCapabilities.every((c) => agent.capabilities.includes(c));
}

function toolScopeAllows(agent: AgentDescriptor, task: TaskSpec): boolean {
  return task.requiredTools.every(
    (t) => agent.tools.includes(t) || agent.tools.includes("*")
  );
}

function dataScopeAllows(agent: AgentDescriptor, task: TaskSpec): boolean {
  return task.requiredDatasets.every(
    (d) => agent.datasets.includes(d) || agent.datasets.includes("*")
  );
}

function riskWithinBudget(agent: AgentDescriptor, task: TaskSpec): boolean {
  return RISK_ORDER[agent.riskLevel] <= RISK_ORDER[task.riskBudget];
}

function observabilityAdequate(agent: AgentDescriptor, task: TaskSpec): boolean {
  // High-risk tasks require observabilityScore >= 0.5.
  if (task.riskBudget === "high" && agent.observabilityScore < 0.5) return false;
  return true;
}

// ─── Stable sort comparator ───────────────────────────────────────────────────

function stableDecisionOrder(a: ScoredCandidate, b: ScoredCandidate): number {
  // Primary: highest score wins (descending).
  if (b.score !== a.score) return b.score - a.score;

  // Tie-break 1: lower blastRadius is better (ascending).
  if (a.blastRadius !== b.blastRadius) return a.blastRadius - b.blastRadius;

  // Tie-break 2: higher determinism is better (descending).
  if (b.determinism !== a.determinism) return b.determinism - a.determinism;

  // Tie-break 3: lower marginalCost is better (ascending).
  if (a.marginalCost !== b.marginalCost) return a.marginalCost - b.marginalCost;

  // Tie-break 4: lower queueDepth is better (ascending).
  if (a.queueDepth !== b.queueDepth) return a.queueDepth - b.queueDepth;

  // Tie-break 5: stable lexical sort on agentId (ascending).
  return a.agentId < b.agentId ? -1 : a.agentId > b.agentId ? 1 : 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Select the best agent for a task from a pool of candidates.
 *
 * The selection is fully deterministic: given the same inputs, the same
 * agent will always be chosen.  No random or timestamp-based tie-breaking.
 */
export function routeTask(task: TaskSpec, candidates: AgentDescriptor[]): RouteDecision {
  const eligible = candidates.filter(
    (a) =>
      hasRequiredCapabilities(a, task) &&
      toolScopeAllows(a, task) &&
      dataScopeAllows(a, task) &&
      riskWithinBudget(a, task) &&
      observabilityAdequate(a, task)
  );

  if (eligible.length === 0) {
    return {
      selectedAgentId: null,
      requiresHumanApproval: false,
      denialReasons: ["NO_ELIGIBLE_AGENT"],
    };
  }

  const scored: ScoredCandidate[] = eligible.map((a) => {
    const score =
      0.3 * capabilityConfidence(a, task) +
      0.2 * graphRelevance(a, task) +
      0.15 * priorSuccessRate(a, task) +
      0.1 * latencyFitness(a, task) +
      0.1 * costFitness(a, task) +
      0.1 * a.determinismScore +
      0.05 * a.observabilityScore;

    return {
      agentId: a.id,
      score,
      blastRadius: blastRadiusScore(a),
      determinism: a.determinismScore,
      marginalCost: marginalCost(a),
      queueDepth: queueDepth(a),
    };
  });

  scored.sort(stableDecisionOrder);

  const top = scored[0];

  return {
    selectedAgentId: top.agentId,
    requiresHumanApproval: task.requiresApproval,
    denialReasons: [],
    score: top.score,
  };
}
