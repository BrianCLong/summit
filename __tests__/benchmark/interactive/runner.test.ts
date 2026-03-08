import test from 'node:test';
import assert from 'node:assert';
import { runInteractive, RunConfig } from '../../../benchmarks/interactive/runners/interactive_runner';
import { BaseEnvironment, Observation, Action, BudgetState, StepResult } from '../../../benchmarks/interactive/environments/base/base_environment';
import { BenchmarkAgent, AgentMemory, RunContext } from '../../../agents/benchmark/base_benchmark_agent';

class MockEnvironment implements BaseEnvironment {
  private steps = 0;

  async reset(seed: number, config: unknown): Promise<Observation> {
    this.steps = 0;
    return { state: { info: 'start' } };
  }

  async step(action: Action): Promise<StepResult> {
    this.steps++;
    return {
      observation: { state: { info: `step_${this.steps}` }, done: this.steps >= 5 },
      reward: 10,
      done: this.steps >= 5
    };
  }

  isTerminal(): boolean {
    return this.steps >= 5;
  }

  budget(): BudgetState {
    return { steps_remaining: 5 - this.steps, wallclock_remaining_ms: 1000 };
  }

  snapshot() {
    return { state: { steps: this.steps }, budget: this.budget() };
  }
}

class MockAgent implements BenchmarkAgent {
  async init(ctx: RunContext): Promise<void> {}

  async act(obs: Observation, memory: AgentMemory, budget: BudgetState): Promise<Action> {
    return { type: 'move' };
  }

  async update(step: StepResult): Promise<void> {}

  async finalize() {
    return { final_state: {}, insights: [] };
  }
}

test('runInteractive completes successfully within budget', async () => {
  const env = new MockEnvironment();
  const agent = new MockAgent();

  const config: RunConfig = {
    suiteId: 'test_suite',
    caseId: 'test_case',
    agentId: 'test_agent',
    seed: 42,
    maxSteps: 10,
    budgetPolicy: {
      maxSteps: 10,
      wallclockLimitMs: 5000
    },
    artifactDir: '/tmp'
  };

  const result = await runInteractive(config, env, agent);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.stepsTaken, 5);
  assert.strictEqual(result.finalReward, 50);
  assert.strictEqual(result.traces.length, 5);
});

class SlowMockAgent extends MockAgent {
  async act(obs: Observation, memory: AgentMemory, budget: BudgetState): Promise<Action> {
    // Artificial delay to bust the budget
    await new Promise(r => setTimeout(r, 150));
    return { type: 'move' };
  }
}

test('runInteractive respects wallclock budget', async () => {
  const env = new MockEnvironment();
  const agent = new SlowMockAgent();

  const config: RunConfig = {
    suiteId: 'test_suite',
    caseId: 'test_case',
    agentId: 'test_agent',
    seed: 42,
    maxSteps: 10,
    budgetPolicy: {
      maxSteps: 10,
      wallclockLimitMs: 50 // Too short for the slow agent
    },
    artifactDir: '/tmp'
  };

  const result = await runInteractive(config, env, agent);

  assert.strictEqual(result.success, false);
  assert.match(result.error || '', /Wallclock budget exceeded/);
});
