"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agentPolicy_1 = require("../../src/agents/policies/agentPolicy");
const vitest_1 = require("vitest");
(0, vitest_1.test)("validateAgent", () => {
    (0, vitest_1.expect)((0, agentPolicy_1.validateAgent)("cursor")).toBe(true);
    (0, vitest_1.expect)((0, agentPolicy_1.validateAgent)("copilot")).toBe(true);
    (0, vitest_1.expect)((0, agentPolicy_1.validateAgent)("malicious-agent")).toBe(false);
});
