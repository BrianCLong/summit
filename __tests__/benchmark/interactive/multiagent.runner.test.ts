import { runMultiAgent, MultiAgentRunConfig } from '../../../benchmarks/interactive/runners/multiagent_runner';
import { BaseEnvironment, Action, StepResult, Observation, BudgetState, EnvSnapshot } from '../../../benchmarks/interactive/environments/base/base_environment';
import { BenchmarkAgent, RunConfig } from '../../../benchmarks/interactive/runners/interactive_runner';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';

class MockEnvironment implements BaseEnvironment {
  private steps = 0;

  async reset(seed: number, config: unknown): Promise<Observation> {
    this.steps = 0;
    return { state: { val: 0 }, availableActions: ['inc'] };
  }

  async step(action: Action): Promise<StepResult> {
    this.steps++;
    return {
      observation: { state: { val: this.steps }, availableActions: ['inc'] },
      reward: 1,
      done: this.steps >= 2,
    };
  }

  isTerminal(): boolean {
    return this.steps >= 2;
  }

  budget(): BudgetState {
    return { stepsRemaining: 10 - this.steps, timeRemainingMs: 1000 };
  }

  snapshot(): EnvSnapshot {
    return { seed: 42, stepCount: this.steps, state: { val: this.steps } };
  }
}

class MockAgent implements BenchmarkAgent {
  async init(runContext: RunConfig): Promise<void> {}
  async act(observation: any, memory: any, budget: any): Promise<Action> {
    return { type: 'inc' };
  }
  async update(stepResult: StepResult): Promise<void> {}
  async finalize(): Promise<Record<string, unknown>> { return { stepsTaken: 2 }; }
}

describe('MultiAgent Runner', () => {
  it('should run multiagent benchmark to completion', async () => {
    const config: MultiAgentRunConfig = {
      suiteId: 'multi-suite',
      caseId: 'multi-case',
      agentId: 'group-1',
      agents: ['agentA', 'agentB'],
      topology: 'fully_connected',
      communicationPolicy: {},
      seed: 42,
      maxSteps: 10,
      budgetPolicy: {},
      artifactDir: '/tmp'
    };

    const env = new MockEnvironment();
    const agentsMap = {
      'agentA': new MockAgent(),
      'agentB': new MockAgent()
    };

    const result = await runMultiAgent(config, env, agentsMap);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stepsTaken, 2);
    assert.strictEqual(result.finalReward, 2);
    assert.strictEqual(result.trace.length, 3); // initial + 2 steps
  });
});
