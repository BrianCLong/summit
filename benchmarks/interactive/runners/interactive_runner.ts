import { BaseEnvironment, Action, StepResult, BudgetState } from '../environments/base/base_environment';

export interface RunConfig {
  suiteId: string;
  caseId: string;
  agentId: string;
  seed: number;
  maxSteps: number;
  budgetPolicy: { maxSteps?: number; wallclockLimitMs?: number; [key: string]: unknown };
  artifactDir: string;
}

export interface TraceEvent {
  step: number;
  timestamp: string;
  action: Action | null;
  observation: Record<string, unknown>;
  reward: number;
  budget: BudgetState;
}

export interface RunResult {
  suiteId: string;
  caseId: string;
  agentId: string;
  seed: number;
  stepsTaken: number;
  finalReward: number;
  success: boolean;
  traces: TraceEvent[];
  error?: string;
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
  const traces: TraceEvent[] = [];
  let stepsTaken = 0;
  let finalReward = 0;
  const wallclockLimit = config.budgetPolicy.wallclockLimitMs as number | undefined;
  const startTime = Date.now();

  await agent.init(config);
  let obs = await environment.reset(config.seed, config.budgetPolicy);

  while (!environment.isTerminal() && stepsTaken < config.maxSteps) {
    const budget = environment.budget();
    if (budget.steps_remaining <= 0) {
      break;
    }

    // Wallclock budget check
    if (wallclockLimit !== undefined && (Date.now() - startTime) > wallclockLimit) {
      await agent.finalize();
      return {
        suiteId: config.suiteId,
        caseId: config.caseId,
        agentId: config.agentId,
        seed: config.seed,
        stepsTaken,
        finalReward,
        success: false,
        traces,
        error: 'Wallclock budget exceeded',
      };
    }

    const action = await agent.act(obs, {}, budget);

    // Check wallclock again after potentially-slow agent.act
    if (wallclockLimit !== undefined && (Date.now() - startTime) > wallclockLimit) {
      await agent.finalize();
      return {
        suiteId: config.suiteId,
        caseId: config.caseId,
        agentId: config.agentId,
        seed: config.seed,
        stepsTaken,
        finalReward,
        success: false,
        traces,
        error: 'Wallclock budget exceeded',
      };
    }

    const stepResult = await environment.step(action);
    await agent.update(stepResult);

    stepsTaken++;
    finalReward += stepResult.reward;
    obs = stepResult.observation;

    traces.push({
      step: stepsTaken,
      timestamp: '1970-01-01T00:00:00Z',
      action,
      observation: obs as unknown as Record<string, unknown>,
      reward: stepResult.reward,
      budget,
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
    success: finalReward > 0,
    traces,
  };
}
