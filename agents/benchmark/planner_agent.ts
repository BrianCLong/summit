import { BaseBenchmarkAgent } from './base_benchmark_agent';
import { Observation, Action, BudgetState } from '../../benchmarks/interactive/environments/base/base_environment';

export class PlannerAgent extends BaseBenchmarkAgent {
  private planQueue: Action[] = [];

  async act(observation: Observation, memory: Record<string, unknown>, budget: BudgetState): Promise<Action> {
    // A simple planner that exhausts available actions if nothing is planned
    if (this.planQueue.length === 0) {
      if (observation.availableActions && observation.availableActions.length > 0) {
        this.planQueue.push({ type: observation.availableActions[0] });
      } else {
        return { type: 'noop' }; // Default fallback action
      }
    }

    return this.planQueue.shift()!;
  }
}
