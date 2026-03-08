"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../services/federation/index.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('planFederatedQuery', () => {
    (0, globals_1.it)('creates subqueries for each enclave', () => {
        const plan = (0, index_js_1.planFederatedQuery)('MATCH (n) RETURN n', ['alpha', 'beta']);
        (0, globals_1.expect)(plan.subqueries.alpha).toBe('MATCH (n) RETURN n');
        (0, globals_1.expect)(plan.subqueries.beta).toBe('MATCH (n) RETURN n');
    });
});
