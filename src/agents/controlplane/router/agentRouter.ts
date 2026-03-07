import type { AgentDescriptor } from '../registry/agentRegistry.js';

export interface RoutedTask {
  type: string;
  riskBudget?: 'low' | 'medium' | 'high';
}

const RISK_ORDER: Record<'low' | 'medium' | 'high', number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function withinRiskBudget(agent: AgentDescriptor, task: RoutedTask): boolean {
  if (!task.riskBudget) {
    return true;
  }

  return RISK_ORDER[agent.riskLevel] <= RISK_ORDER[task.riskBudget];
}

export function selectAgent(
  task: RoutedTask,
  agents: AgentDescriptor[],
): AgentDescriptor | undefined {
  const eligible = agents.filter(
    (agent) =>
      agent.capabilities.includes(task.type) && withinRiskBudget(agent, task),
  );

  if (eligible.length === 0) {
    return undefined;
  }

  return [...eligible].sort((a, b) => a.id.localeCompare(b.id))[0];
}
