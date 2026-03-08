"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agentRuntime_1 = require("../../src/agents/runtime/agentRuntime");
const vitest_1 = require("vitest");
(0, vitest_1.test)("runAgentTask", async () => {
    const result = await (0, agentRuntime_1.runAgentTask)({ task: "test", context: "" });
    (0, vitest_1.expect)(result.result).toBe("");
});
