import { BaseEnvironment, Action, StepResult } from '../environments/base/base_environment';
import { BenchmarkAgent, RunConfig, TraceEvent } from './interactive_runner';

export interface EconomyRunConfig extends RunConfig {
  marketSize: number;
  initialCapital: number;
  transactionPolicy: Record<string, unknown>;
}

export interface EconomyRunResult {
  suiteId: string;
  caseId: string;
  seed: number;
  stepsTaken: number;
  finalMarketValue: number;
  success: boolean;
  trace: TraceEvent[];
}

export async function runEconomy(
  config: EconomyRunConfig,
  environment: BaseEnvironment,
  marketAgents: BenchmarkAgent[]
): Promise<EconomyRunResult> {
  const trace: TraceEvent[] = [];
  let stepsTaken = 0;
  let finalMarketValue = 0;

  for (const agent of marketAgents) {
    await agent.init(config);
  }

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

    const actions: Action[] = [];
    for (const agent of marketAgents) {
      const action = await agent.act(obs, {}, budget);
      actions.push(action);
    }

    // In a real economy, actions are combined (e.g. trades, buys, sells).
    // Simplified for demonstration.
    const combinedAction: Action = { type: 'market_step', payload: { actions } };
    const stepResult = await environment.step(combinedAction);

    for (const agent of marketAgents) {
      await agent.update(stepResult);
    }

    stepsTaken++;
    finalMarketValue += stepResult.reward;
    obs = stepResult.observation;

    trace.push({
      step: stepsTaken,
      timestamp: "1970-01-01T00:00:00Z",
      action: combinedAction,
      observation: obs.state,
      reward: stepResult.reward,
      done: stepResult.done,
      metadata: stepResult.info
    });

    if (stepResult.done) {
      break;
    }
  }

  for (const agent of marketAgents) {
    await agent.finalize();
  }

  return {
    suiteId: config.suiteId,
    caseId: config.caseId,
    seed: config.seed,
    stepsTaken,
    finalMarketValue,
    success: finalMarketValue > 0,
    trace
  };
}
