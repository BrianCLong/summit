import { assertWithinBudgets, SwarmBudgets, SwarmUsage } from "../swarm/budgets";
describe("Swarm Budgets", () => {
  const defaultBudgets: SwarmBudgets = { maxAgents: 5, maxSteps: 10, maxToolCalls: 10, maxWallMs: 1000 };
  test("should pass when within budgets", () => {
    const usage: SwarmUsage = { agentsSpawned: 2, stepsExecuted: 5, toolCalls: 5, wallMs: 500 };
    expect(() => assertWithinBudgets(defaultBudgets, usage)).not.toThrow();
  });
  test("should throw when agents exceed budget", () => {
    const usage: SwarmUsage = { agentsSpawned: 6, stepsExecuted: 5, toolCalls: 5, wallMs: 500 };
    expect(() => assertWithinBudgets(defaultBudgets, usage)).toThrow("budget_exceeded:agents");
  });
});
