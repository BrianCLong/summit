"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const interactive_runner_1 = require("../../../benchmarks/interactive/runners/interactive_runner");
class MockEnvironment {
    steps = 0;
    async reset(seed, config) {
        this.steps = 0;
        return { state: { info: 'start' } };
    }
    async step(action) {
        this.steps++;
        return {
            observation: { state: { info: `step_${this.steps}` }, done: this.steps >= 5 },
            reward: 10,
            done: this.steps >= 5
        };
    }
    isTerminal() {
        return this.steps >= 5;
    }
    budget() {
        return { steps_remaining: 5 - this.steps, wallclock_remaining_ms: 1000 };
    }
    snapshot() {
        return { state: { steps: this.steps }, budget: this.budget() };
    }
}
class MockAgent {
    async init(ctx) { }
    async act(obs, memory, budget) {
        return { type: 'move' };
    }
    async update(step) { }
    async finalize() {
        return { final_state: {}, insights: [] };
    }
}
(0, node_test_1.default)('runInteractive completes successfully within budget', async () => {
    const env = new MockEnvironment();
    const agent = new MockAgent();
    const config = {
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
    const result = await (0, interactive_runner_1.runInteractive)(config, env, agent);
    node_assert_1.default.strictEqual(result.success, true);
    node_assert_1.default.strictEqual(result.stepsTaken, 5);
    node_assert_1.default.strictEqual(result.finalReward, 50);
    node_assert_1.default.strictEqual(result.traces.length, 5);
});
class SlowMockAgent extends MockAgent {
    async act(obs, memory, budget) {
        // Artificial delay to bust the budget
        await new Promise(r => setTimeout(r, 150));
        return { type: 'move' };
    }
}
(0, node_test_1.default)('runInteractive respects wallclock budget', async () => {
    const env = new MockEnvironment();
    const agent = new SlowMockAgent();
    const config = {
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
    const result = await (0, interactive_runner_1.runInteractive)(config, env, agent);
    node_assert_1.default.strictEqual(result.success, false);
    node_assert_1.default.match(result.error || '', /Wallclock budget exceeded/);
});
