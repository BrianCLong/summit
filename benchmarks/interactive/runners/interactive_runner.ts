import { BaseEnvironment, Observation, Action, BudgetState, StepResult } from '../environments/base/base_environment';
import { BenchmarkAgent, AgentMemory, RunContext } from '../../../agents/benchmark/base_benchmark_agent';

export interface BudgetPolicy {
  maxSteps: number;
  wallclockLimitMs: number;
}

export interface RunConfig extends RunContext {
  maxSteps: number;
  budgetPolicy: BudgetPolicy;
  artifactDir: string;
}

export interface RunResult {
  suiteId: string;
  caseId: string;
  agentId: string;
  success: boolean;
  stepsTaken: number;
  timeElapsedMs: number;
  finalReward: number;
  error?: string;
  traces: TraceEvent[];
}

export interface TraceEvent {
  step: number;
  timestamp: string; // Deterministic virtual timestamp
  action: Action;
  observation: Observation;
  reward: number;
  budget: BudgetState;
}

export async function runInteractive(
  config: RunConfig,
  environment: BaseEnvironment,
  agent: BenchmarkAgent
): Promise<RunResult> {
  const startTime = Date.now();
  let stepsTaken = 0;
  let finalReward = 0;
  const traces: TraceEvent[] = [];

  try {
    let observation = await environment.reset(config.seed, config);
    await agent.init(config);
    const memory: AgentMemory = { history: [] };

    while (!environment.isTerminal() && stepsTaken < config.budgetPolicy.maxSteps) {
      if (Date.now() - startTime > config.budgetPolicy.wallclockLimitMs) {
        throw new Error('Wallclock budget exceeded');
      }

      const budget = environment.budget();
      const action = await agent.act(observation, memory, budget);
      const stepResult = await environment.step(action);

      await agent.update(stepResult);

      traces.push({
        step: stepsTaken,
        timestamp: `step_${stepsTaken}`, // Deterministic timestamp string
        action,
        observation: stepResult.observation,
        reward: stepResult.reward,
        budget: environment.budget()
      });

      observation = stepResult.observation;
      finalReward += stepResult.reward;
      stepsTaken++;

      if (stepResult.done) break;
    }

    return {
      suiteId: config.suiteId,
      caseId: config.caseId,
      agentId: config.agentId,
      success: true,
      stepsTaken,
      timeElapsedMs: Date.now() - startTime,
      finalReward,
      traces
    };

  } catch (err: any) {
    return {
      suiteId: config.suiteId,
      caseId: config.caseId,
      agentId: config.agentId,
      success: false,
      stepsTaken,
      timeElapsedMs: Date.now() - startTime,
      finalReward,
      error: err.message,
      traces
    };
  }
}
