import { evaluatePolicy } from '../policy/PolicyDecisionPoint.js';
import { TaskSpec } from '../planner/TaskSpec.js';
import { AgentDescriptor } from '../registry/AgentDescriptor.js';

export type RouteDecision = {
  selectedAgentId: string | null;
  requiresHumanApproval: boolean;
  denialReasons: string[];
};

type RankedAgent = {
  agentId: string;
  score: number;
  blastRadius: number;
  determinism: number;
  marginalCost: number;
  queueDepth: number;
};

export interface RouteSignals {
  capabilityConfidence(agent: AgentDescriptor, task: TaskSpec): number;
  graphRelevance(agent: AgentDescriptor, task: TaskSpec): number;
  priorSuccessRate(agent: AgentDescriptor, task: TaskSpec): number;
  latencyFitness(agent: AgentDescriptor, task: TaskSpec): number;
  costFitness(agent: AgentDescriptor, task: TaskSpec): number;
  determinismScore(agent: AgentDescriptor): number;
  observabilityScore(agent: AgentDescriptor): number;
  blastRadiusScore(agent: AgentDescriptor, task: TaskSpec): number;
  marginalCost(agent: AgentDescriptor, task: TaskSpec): number;
  queueDepth(agent: AgentDescriptor): number;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export const defaultSignals: RouteSignals = {
  capabilityConfidence: () => 1,
  graphRelevance: () => 1,
  priorSuccessRate: () => 1,
  latencyFitness: () => 1,
  costFitness: () => 1,
  determinismScore: (agent) => clamp(agent.determinismScore),
  observabilityScore: (agent) => clamp(agent.observabilityScore),
  blastRadiusScore: () => 0,
  marginalCost: () => 0,
  queueDepth: () => 0,
};

const stableDecisionOrder = (left: RankedAgent, right: RankedAgent): number => {
  return (
    right.score - left.score ||
    left.blastRadius - right.blastRadius ||
    right.determinism - left.determinism ||
    left.marginalCost - right.marginalCost ||
    left.queueDepth - right.queueDepth ||
    left.agentId.localeCompare(right.agentId)
  );
};

export function routeTask(
  task: TaskSpec,
  candidates: AgentDescriptor[],
  signals: RouteSignals = defaultSignals,
): RouteDecision {
  const deniedReasons = new Set<string>();
  const eligible = candidates.filter((agent) => {
    const decision = evaluatePolicy(agent, task);
    if (!decision.allow) {
      decision.reasons.forEach((reason) => deniedReasons.add(reason));
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return {
      selectedAgentId: null,
      requiresHumanApproval: task.requiresApproval,
      denialReasons: [...deniedReasons].sort(),
    };
  }

  const ranked = eligible
    .map((agent) => ({
      agentId: agent.id,
      score:
        0.3 * clamp(signals.capabilityConfidence(agent, task)) +
        0.2 * clamp(signals.graphRelevance(agent, task)) +
        0.15 * clamp(signals.priorSuccessRate(agent, task)) +
        0.1 * clamp(signals.latencyFitness(agent, task)) +
        0.1 * clamp(signals.costFitness(agent, task)) +
        0.1 * clamp(signals.determinismScore(agent)) +
        0.05 * clamp(signals.observabilityScore(agent)),
      blastRadius: signals.blastRadiusScore(agent, task),
      determinism: signals.determinismScore(agent),
      marginalCost: signals.marginalCost(agent, task),
      queueDepth: signals.queueDepth(agent),
    }))
    .sort(stableDecisionOrder);

  return {
    selectedAgentId: ranked[0]?.agentId ?? null,
    requiresHumanApproval: task.requiresApproval,
    denialReasons: [],
  };
}
