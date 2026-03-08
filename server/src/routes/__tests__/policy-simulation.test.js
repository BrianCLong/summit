"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tenantBundle_js_1 = require("../../policy/tenantBundle.js");
const profiles_js_1 = require("../../policy/profiles.js");
(0, globals_1.describe)('Policy Simulation (core evaluator)', () => {
    (0, globals_1.it)('evaluates policy decisions with a valid input', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(profiles_js_1.Profiles.balanced, {
            subjectTenantId: 't1',
            resourceTenantId: 't1',
            action: 'read',
        });
        (0, globals_1.expect)(typeof result.allow).toBe('boolean');
        (0, globals_1.expect)(result.reason).toBeDefined();
    });
});
