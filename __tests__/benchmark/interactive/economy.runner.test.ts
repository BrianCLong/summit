import { runEconomy, EconomyRunConfig } from '../../../benchmarks/interactive/runners/economy_runner';
import { BaseEnvironment, Action, StepResult, Observation, BudgetState, EnvSnapshot } from '../../../benchmarks/interactive/environments/base/base_environment';
import { BenchmarkAgent, RunConfig } from '../../../benchmarks/interactive/runners/interactive_runner';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';

class MockEnvironment implements BaseEnvironment {
  private steps = 0;

  async reset(seed: number, config: unknown): Promise<Observation> {
    this.steps = 0;
    return { state: { val: 0 }, availableActions: ['trade'] };
  }

  async step(action: Action): Promise<StepResult> {
    this.steps++;
    return {
      observation: { state: { val: this.steps }, availableActions: ['trade'] },
      reward: 10,
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
    return { type: 'trade' };
  }
  async update(stepResult: StepResult): Promise<void> {}
  async finalize(): Promise<Record<string, unknown>> { return {}; }
}

describe('Economy Runner', () => {
  it('should run economy benchmark to completion', async () => {
    const config: EconomyRunConfig = {
      suiteId: 'economy-suite',
      caseId: 'economy-case',
      agentId: 'market-1',
      marketSize: 2,
      initialCapital: 100,
      transactionPolicy: {},
      seed: 42,
      maxSteps: 10,
      budgetPolicy: {},
      artifactDir: '/tmp'
    };

    const env = new MockEnvironment();
    const agents = [new MockAgent(), new MockAgent()];

    const result = await runEconomy(config, env, agents);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stepsTaken, 2);
    assert.strictEqual(result.finalMarketValue, 20); // 2 steps * 10
    assert.strictEqual(result.trace.length, 3);
  });
});
