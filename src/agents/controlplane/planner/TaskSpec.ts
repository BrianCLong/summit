import { RiskLevel } from '../registry/AgentDescriptor.js';

export interface TaskSpec {
  id: string;
  type: string;
  requiredCapabilities: string[];
  requiredTools: string[];
  requiredDatasets: string[];
  riskBudget: RiskLevel;
  requiresApproval: boolean;
  latencyBudgetMs: number;
  costBudgetUsd: number;
}
