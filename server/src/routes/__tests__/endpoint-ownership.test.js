"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const endpoint_ownership_js_1 = require("../endpoint-ownership.js");
(0, globals_1.describe)('endpoint ownership map', () => {
    (0, globals_1.it)('records policy touchpoints for action preflight', () => {
        const preflight = endpoint_ownership_js_1.endpointOwnership.find((entry) => entry.path === '/api/actions/preflight');
        (0, globals_1.expect)(preflight?.owners).toContain('governance');
        (0, globals_1.expect)(preflight?.policyMiddleware).toContain('auditFirstMiddleware');
    });
    (0, globals_1.it)('tracks execution guard endpoint', () => {
        const execute = endpoint_ownership_js_1.endpointOwnership.find((entry) => entry.path === '/api/actions/execute');
        (0, globals_1.expect)(execute?.policyMiddleware).toContain('ActionPolicyService');
    });
});
