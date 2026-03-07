import { AgentDescriptor, RiskLevel } from '../registry/AgentDescriptor.js';
import { TaskSpec } from '../planner/TaskSpec.js';

export interface PolicyDecision {
  allow: boolean;
  reasons: string[];
}

const riskValue: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function evaluatePolicy(agent: AgentDescriptor, task: TaskSpec): PolicyDecision {
  if (!task.requiredCapabilities.every((required) => agent.capabilities.includes(required))) {
    return { allow: false, reasons: ['CAPABILITY_SCOPE_DENIED'] };
  }

  if (!task.requiredTools.every((required) => agent.tools.includes(required))) {
    return { allow: false, reasons: ['TOOL_SCOPE_DENIED'] };
  }

  if (!task.requiredDatasets.every((required) => agent.datasets.includes(required))) {
    return { allow: false, reasons: ['DATASET_SCOPE_DENIED'] };
  }

  if (riskValue[agent.riskLevel] > riskValue[task.riskBudget]) {
    return { allow: false, reasons: ['RISK_BUDGET_EXCEEDED'] };
  }

  if (task.riskBudget === 'high' && !task.requiresApproval) {
    return { allow: false, reasons: ['HIGH_RISK_REQUIRES_APPROVAL'] };
  }

  return { allow: true, reasons: [] };
}
