"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const storage_memory_1 = require("../../../core/memory/storage_memory");
const context_collapse_json_1 = __importDefault(require("../fixtures/context_collapse.json"));
(0, vitest_1.describe)("Memory Privacy: Context Firewall Evaluation", () => {
    let broker;
    (0, vitest_1.beforeEach)(() => {
        broker = new storage_memory_1.InMemoryMemoryBroker();
    });
    (0, vitest_1.it)("should prevent cross-context leakage as defined in fixtures", async () => {
        for (const scenario of context_collapse_json_1.default) {
            // 1. Setup: Load records into broker
            for (const recordData of scenario.records) {
                await broker.remember({
                    ...recordData,
                    sources: ["test-fixture"],
                    expiresAt: 0,
                    visibility: "user",
                });
            }
            // 2. Execution & Verification: Run each test case in the scenario
            for (const testCase of scenario.tests) {
                const results = await broker.recall(testCase.scope);
                (0, vitest_1.expect)(results.length, `Test '${testCase.description}' failed: expected ${testCase.expectedIds} results, got ${results.length}`).toBe(testCase.expectedIds);
                const allContent = results.map((r) => r.content).join(" ");
                for (const forbidden of testCase.forbiddenContent) {
                    (0, vitest_1.expect)(allContent.toLowerCase(), `Leak detected in '${testCase.description}': found forbidden content '${forbidden}'`).not.toContain(forbidden.toLowerCase());
                }
            }
        }
    });
    (0, vitest_1.it)("should deny access when purpose mismatches even if context matches", async () => {
        await broker.remember({
            userId: "u1",
            content: "Sensitive compliance data",
            purpose: "compliance",
            contextSpace: "work",
            facets: [],
            sources: [],
            expiresAt: 0,
            visibility: "user",
        });
        const results = await broker.recall({
            userId: "u1",
            purpose: "assist",
            contextSpace: "work",
        });
        (0, vitest_1.expect)(results.length).toBe(0);
    });
});
