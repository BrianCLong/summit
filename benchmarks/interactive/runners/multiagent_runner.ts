import { BaseEnvironment, Action, StepResult } from '../environments/base/base_environment';
import { BenchmarkAgent, RunConfig, TraceEvent } from './interactive_runner';

export interface MultiAgentRunConfig extends RunConfig {
  agents: string[]; // List of agent IDs
  topology: 'fully_connected' | 'hierarchical' | 'ring';
  communicationPolicy: Record<string, unknown>;
}

export interface MultiAgentRunResult {
  suiteId: string;
  caseId: string;
  seed: number;
  stepsTaken: number;
  finalReward: number;
  success: boolean;
  trace: TraceEvent[];
  agentMetrics: Record<string, Record<string, number>>;
}

export async function runMultiAgent(
  config: MultiAgentRunConfig,
  environment: BaseEnvironment,
  agentsMap: Record<string, BenchmarkAgent>
): Promise<MultiAgentRunResult> {
  const trace: TraceEvent[] = [];
  let stepsTaken = 0;
  let finalReward = 0;

  for (const agentId of config.agents) {
    if (agentsMap[agentId]) {
      await agentsMap[agentId].init(config);
    }
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

    // In a real multi-agent setting, agents would coordinate or act in turn.
    // For this simple benchmark runner, they act sequentially.
    let stepResult: StepResult | null = null;
    const actions: Record<string, Action> = {};

    for (const agentId of config.agents) {
      const agent = agentsMap[agentId];
      if (agent) {
         actions[agentId] = await agent.act(obs, {}, budget);
      }
    }

    // Pass aggregated actions to the environment (simplified logic for demonstration)
    // We'll pass the first agent's action just for simple execution here
    const firstAction = Object.values(actions)[0] || { type: 'noop' };
    stepResult = await environment.step(firstAction);

    for (const agentId of config.agents) {
      const agent = agentsMap[agentId];
      if (agent) {
        await agent.update(stepResult);
      }
    }

    stepsTaken++;
    finalReward += stepResult.reward;
    obs = stepResult.observation;

    trace.push({
      step: stepsTaken,
      timestamp: "1970-01-01T00:00:00Z",
      action: firstAction, // Could be aggregated actions
      observation: obs.state,
      reward: stepResult.reward,
      done: stepResult.done,
      metadata: stepResult.info
    });

    if (stepResult.done) {
      break;
    }
  }

  const agentMetrics: Record<string, Record<string, number>> = {};
  for (const agentId of config.agents) {
    if (agentsMap[agentId]) {
      const finalizeData = await agentsMap[agentId].finalize();
      // Example cast for metrics
      agentMetrics[agentId] = { finalSteps: finalizeData.stepsTaken as number || 0 };
    }
  }

  return {
    suiteId: config.suiteId,
    caseId: config.caseId,
    seed: config.seed,
    stepsTaken,
    finalReward,
    success: finalReward > 0,
    trace,
    agentMetrics
  };
}
