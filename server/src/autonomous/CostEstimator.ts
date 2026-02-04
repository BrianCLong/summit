import { Task } from './orchestrator.enhanced.js';

export interface TaskCost {
  tokens: number;
  usd: number;
  timeMs: number;
}

export class CostEstimator {
  private costTable: Record<string, TaskCost> = {
    analyze_goal: { tokens: 5000, usd: 0.1, timeMs: 5000 },
    generate_code: { tokens: 2000, usd: 0.04, timeMs: 2000 },
    run_test: { tokens: 100, usd: 0.001, timeMs: 10000 },
    deploy: { tokens: 500, usd: 0.01, timeMs: 30000 },
    default: { tokens: 100, usd: 0.002, timeMs: 1000 },
  };

  /**
   * Estimate the cost of a single task
   */
  estimate(task: Task): TaskCost {
    const baseCost = this.costTable[task.type] || this.costTable.default;

    // Clone to avoid mutating base costs
    const cost = { ...baseCost };

    // Heuristic: tasks with more params might be more complex
    const paramFactor = Object.keys(task.params || {}).length > 5 ? 1.5 : 1.0;

    cost.tokens = Math.ceil(cost.tokens * paramFactor);
    cost.usd = cost.usd * paramFactor;
    cost.timeMs = Math.ceil(cost.timeMs * paramFactor);

    return cost;
  }

  /**
   * Estimate the total cost for a list of tasks
   */
  estimatePlan(tasks: Task[]): TaskCost {
    return tasks.reduce(
      (total, task) => {
        const cost = this.estimate(task);
        return {
          tokens: total.tokens + cost.tokens,
          usd: total.usd + cost.usd,
          timeMs: total.timeMs + cost.timeMs,
        };
      },
      { tokens: 0, usd: 0, timeMs: 0 }
    );
  }
}
