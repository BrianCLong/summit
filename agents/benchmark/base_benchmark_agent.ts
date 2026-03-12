import { RunConfig, BenchmarkAgent } from '../../benchmarks/interactive/runners/interactive_runner';
import { Observation, Action, StepResult, BudgetState } from '../../benchmarks/interactive/environments/base/base_environment';

export type AgentMemory = Record<string, unknown>;
export type RunContext = RunConfig;
export { BenchmarkAgent };

export abstract class BaseBenchmarkAgent implements BenchmarkAgent {
  protected context!: RunConfig;
  protected stepHistory: StepResult[] = [];

  async init(runContext: RunConfig): Promise<void> {
    this.context = runContext;
    this.stepHistory = [];
  }

  abstract act(observation: Observation, memory: Record<string, unknown>, budget: BudgetState): Promise<Action>;

  async update(stepResult: StepResult): Promise<void> {
    this.stepHistory.push(stepResult);
  }

  async finalize(): Promise<Record<string, unknown>> {
    return {
      stepsTaken: this.stepHistory.length
    };
  }
}
