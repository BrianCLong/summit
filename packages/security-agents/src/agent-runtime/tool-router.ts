import { AgentMode, AgentBudget } from './runtime.js';

export interface ToolRoute {
  name: string;
  modes: AgentMode[];
  costEstimateUsd: number;
  requiredEvidence?: string[];
}

export class ToolRouter {
  private spentUsd = 0;

  constructor(private readonly routes: ToolRoute[], private readonly budget: AgentBudget) {}

  canExecute(stepName: string, mode: AgentMode): boolean {
    const route = this.routes.find((candidate) => candidate.name === stepName);
    if (!route) {
      return false;
    }

    if (!route.modes.includes(mode)) {
      return false;
    }

    const projected = this.spentUsd + route.costEstimateUsd;
    return projected <= this.budget.maxCostUsd;
  }

  trackCost(costUsd: number): void {
    this.spentUsd += costUsd;
  }

  getBudgetUsage(): { spentUsd: number; remainingSteps: number; remainingBudget: number } {
    return {
      spentUsd: this.spentUsd,
      remainingSteps: this.budget.maxSteps,
      remainingBudget: Math.max(this.budget.maxCostUsd - this.spentUsd, 0)
    };
  }
}
