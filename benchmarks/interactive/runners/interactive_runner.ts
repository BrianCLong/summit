import { BaseEnvironment, Action, StepResult } from '../environments/base/base_environment';

export interface RunConfig {
  suiteId: string;
  caseId: string;
  agentId: string;
  seed: number;
  maxSteps: number;
  budgetPolicy: Record<string, unknown>;
  artifactDir: string;
}

export interface TraceEvent {
  step: number;
  timestamp: string; // Deterministic wall-clock timestamp or zero'd for reproducibility
  action: Action | null;
  observation: Record<string, unknown>;
  reward: number;
  done: boolean;
  metadata?: Record<string, unknown>;
}

export interface RunResult {
  suiteId: string;
  caseId: string;
  agentId: string;
  seed: number;
  stepsTaken: number;
  finalReward: number;
  success: boolean;
  trace: TraceEvent[];
}

export interface BenchmarkAgent {
  init(runContext: RunConfig): Promise<void>;
  act(observation: any, memory: any, budget: any): Promise<Action>;
  update(stepResult: StepResult): Promise<void>;
  finalize(): Promise<Record<string, unknown>>;
}

export async function runInteractive(
  config: RunConfig,
  environment: BaseEnvironment,
  agent: BenchmarkAgent
): Promise<RunResult> {
  const trace: TraceEvent[] = [];
  let stepsTaken = 0;
  let finalReward = 0;

  await agent.init(config);
  let obs = await environment.reset(config.seed, config.budgetPolicy);

  trace.push({
    step: stepsTaken,
    timestamp: "1970-01-01T00:00:00Z", // Enforcing determinism
    action: null,
    observation: obs.state,
    reward: 0,
    done: false
  });

  while (!environment.isTerminal() && stepsTaken < config.maxSteps) {
    const budget = environment.budget();
    if (budget.stepsRemaining <= 0 || budget.timeRemainingMs <= 0) {
      break;
    }

    const action = await agent.act(obs, {}, budget);
    const stepResult = await environment.step(action);

    await agent.update(stepResult);

    stepsTaken++;
    finalReward += stepResult.reward;
    obs = stepResult.observation;

    trace.push({
      step: stepsTaken,
      timestamp: "1970-01-01T00:00:00Z", // Enforcing determinism
      action: action,
      observation: obs.state,
      reward: stepResult.reward,
      done: stepResult.done,
      metadata: stepResult.info
    });

    if (stepResult.done) {
      break;
    }
  }

  await agent.finalize();

  return {
    suiteId: config.suiteId,
    caseId: config.caseId,
    agentId: config.agentId,
    seed: config.seed,
    stepsTaken,
    finalReward,
    success: finalReward > 0, // Simplified success logic for substrate
    trace
  };
}
