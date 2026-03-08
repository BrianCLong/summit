import { runInteractive, BenchmarkAgent, RunConfig } from '../../../benchmarks/interactive/runners/interactive_runner';
import { BaseEnvironment, Action, StepResult, Observation, BudgetState, EnvSnapshot } from '../../../benchmarks/interactive/environments/base/base_environment';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';

class MockEnvironment implements BaseEnvironment {
  private steps = 0;
  private seed = 0;

  async reset(seed: number, config: unknown): Promise<Observation> {
    this.seed = seed;
    this.steps = 0;
    return { state: { val: 0 }, availableActions: ['inc'] };
  }

  async step(action: Action): Promise<StepResult> {
    this.steps++;
    return {
      observation: { state: { val: this.steps }, availableActions: ['inc'] },
      reward: 1,
      done: this.steps >= 3,
    };
  }

  isTerminal(): boolean {
    return this.steps >= 3;
  }

  budget(): BudgetState {
    return { stepsRemaining: 10 - this.steps, timeRemainingMs: 1000 };
  }

  snapshot(): EnvSnapshot {
    return { seed: this.seed, stepCount: this.steps, state: { val: this.steps } };
  }
}

class MockAgent implements BenchmarkAgent {
  async init(runContext: RunConfig): Promise<void> {}
  async act(observation: any, memory: any, budget: any): Promise<Action> {
    return { type: 'inc' };
  }
  async update(stepResult: StepResult): Promise<void> {}
  async finalize(): Promise<Record<string, unknown>> { return {}; }
}

describe('Interactive Runner', () => {
  it('should run deterministic benchmark to completion', async () => {
    const config: RunConfig = {
      suiteId: 'test-suite',
      caseId: 'test-case',
      agentId: 'mock-agent',
      seed: 42,
      maxSteps: 10,
      budgetPolicy: {},
      artifactDir: '/tmp'
    };

    const env = new MockEnvironment();
    const agent = new MockAgent();

    const result = await runInteractive(config, env, agent);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stepsTaken, 3);
    assert.strictEqual(result.finalReward, 3);
    assert.strictEqual(result.trace.length, 4); // initial + 3 steps
    assert.strictEqual(result.trace[0].timestamp, '1970-01-01T00:00:00Z');
  });
});
