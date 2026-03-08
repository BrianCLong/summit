"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PolicyEngine_js_1 = require("../PolicyEngine.js");
(0, globals_1.describe)('PolicyEngine MVP-3 GA', () => {
    const policyEngine = new PolicyEngine_js_1.PolicyEngine();
    const testPolicy = {
        id: 'test-policy-1',
        description: 'Deny if risk is high',
        scope: {
            stages: ['runtime'],
            tenants: ['*']
        },
        action: 'DENY',
        rules: [
            {
                field: 'riskLevel',
                operator: 'gt',
                value: 80
            }
        ]
    };
    (0, globals_1.beforeAll)(() => {
        policyEngine.loadPolicies([testPolicy]);
    });
    (0, globals_1.it)('should allow when rules do not match', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-1',
            payload: {
                riskLevel: 50
            }
        };
        const verdict = policyEngine.check(context);
        (0, globals_1.expect)(verdict.action).toBe('ALLOW');
        (0, globals_1.expect)(verdict.policyIds).toHaveLength(0);
        (0, globals_1.expect)(verdict.provenance).toBeDefined();
        (0, globals_1.expect)(verdict.provenance.origin).toBe('system-policy-check');
        (0, globals_1.expect)(verdict.metadata.latencyMs).toBeGreaterThanOrEqual(0);
    });
    (0, globals_1.it)('should deny when rules match', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-1',
            payload: {
                riskLevel: 90
            }
        };
        const verdict = policyEngine.check(context);
        (0, globals_1.expect)(verdict.action).toBe('DENY');
        (0, globals_1.expect)(verdict.policyIds).toContain('test-policy-1');
        (0, globals_1.expect)(verdict.reasons.join(' ')).toMatch(/policy|deny/i);
    });
    (0, globals_1.it)('should include provenance and metadata', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-1',
            payload: { riskLevel: 50 },
            simulation: true
        };
        const verdict = policyEngine.check(context);
        (0, globals_1.expect)(verdict.metadata.simulation).toBe(true);
        (0, globals_1.expect)(verdict.metadata.evaluator).toBe('native-policy-engine-v1');
        (0, globals_1.expect)(verdict.provenance.confidence).toBe(1.0);
    });
});
