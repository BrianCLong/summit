"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_policy_js_1 = require("../src/orchestrator_policy.js");
(0, vitest_1.describe)('OrchestratorPolicy', () => {
    (0, vitest_1.it)('should deny by default', () => {
        const policy = new orchestrator_policy_js_1.OrchestratorPolicy();
        (0, vitest_1.expect)(policy.checkPermission('unknown_action', {})).toBe(false);
    });
    (0, vitest_1.it)('should allow authorized actions', () => {
        const policy = new orchestrator_policy_js_1.OrchestratorPolicy();
        const context = { user: { id: 'lead' }, team: { leadAgentId: 'lead' } };
        (0, vitest_1.expect)(policy.checkPermission('approve_join', context)).toBe(true);
    });
    (0, vitest_1.it)('should deny unauthorized approval', () => {
        const policy = new orchestrator_policy_js_1.OrchestratorPolicy();
        const context = { user: { id: 'imposter' }, team: { leadAgentId: 'lead' } };
        (0, vitest_1.expect)(policy.checkPermission('approve_join', context)).toBe(false);
    });
});
