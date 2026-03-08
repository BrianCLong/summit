import { Observation, Action, BudgetState, StepResult } from '../../benchmarks/interactive/environments/base/base_environment';

export interface RunContext {
  suiteId: string;
  caseId: string;
  agentId: string;
  seed: number;
}

export interface AgentMemory {
  history: any[];
}

export interface AgentSummary {
  final_state: any;
  insights: string[];
}

export interface BenchmarkAgent {
  /**
   * Initialize the agent with the current run context.
   */
  init(ctx: RunContext): Promise<void>;

  /**
   * Decide on the next action given the current observation, memory, and budget.
   */
  act(obs: Observation, memory: AgentMemory, budget: BudgetState): Promise<Action>;

  /**
   * Update internal state based on the result of the last action.
   */
  update(step: StepResult): Promise<void>;

  /**
   * Finalize the agent's run and return a summary.
   */
  finalize(): Promise<AgentSummary>;
}
