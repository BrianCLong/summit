"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const budgets_1 = require("../swarm/budgets");
describe("Swarm Budgets", () => {
    const defaultBudgets = { maxAgents: 5, maxSteps: 10, maxToolCalls: 10, maxWallMs: 1000 };
    test("should pass when within budgets", () => {
        const usage = { agentsSpawned: 2, stepsExecuted: 5, toolCalls: 5, wallMs: 500 };
        expect(() => (0, budgets_1.assertWithinBudgets)(defaultBudgets, usage)).not.toThrow();
    });
    test("should throw when agents exceed budget", () => {
        const usage = { agentsSpawned: 6, stepsExecuted: 5, toolCalls: 5, wallMs: 500 };
        expect(() => (0, budgets_1.assertWithinBudgets)(defaultBudgets, usage)).toThrow("budget_exceeded:agents");
    });
});
