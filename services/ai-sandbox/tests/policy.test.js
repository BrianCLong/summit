"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PolicyEngine_js_1 = require("../src/sandbox/PolicyEngine.js");
(0, globals_1.describe)('PolicyEngine', () => {
    let policyEngine;
    const createEnvironment = (overrides = {}) => ({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Environment',
        agencyId: 'test-agency',
        complianceFrameworks: ['FEDRAMP_MODERATE'],
        resourceQuotas: {
            cpuMs: 30000,
            memoryMb: 512,
            timeoutMs: 60000,
            maxOutputBytes: 1048576,
            networkEnabled: false,
            storageEnabled: false,
        },
        allowedModules: [],
        blockedModules: [],
        networkAllowlist: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        ...overrides,
    });
    const createRequest = (overrides = {}) => ({
        environmentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Experiment',
        modelConfig: {
            modelId: 'test-model',
            modelType: 'llm',
            provider: 'test-provider',
            version: '1.0.0',
        },
        testCases: [
            { id: 'tc-1', name: 'Test 1', input: 'test input', tags: [] },
        ],
        validationRules: [],
        metadata: {},
        ...overrides,
    });
    (0, globals_1.beforeEach)(() => {
        policyEngine = new PolicyEngine_js_1.PolicyEngine();
    });
    (0, globals_1.describe)('evaluate', () => {
        (0, globals_1.it)('should allow valid requests for active environments', async () => {
            const env = createEnvironment();
            const req = createRequest();
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.allowed).toBe(true);
        });
        (0, globals_1.it)('should reject requests for suspended environments', async () => {
            const env = createEnvironment({ status: 'suspended' });
            const req = createRequest();
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.allowed).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('suspended');
        });
        (0, globals_1.it)('should reject requests for expired environments', async () => {
            const env = createEnvironment({
                expiresAt: new Date(Date.now() - 86400000), // Yesterday
            });
            const req = createRequest();
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.allowed).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('expired');
        });
        (0, globals_1.it)('should flag FedRAMP HIGH violation for network without allowlist', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['FEDRAMP_HIGH'],
                resourceQuotas: {
                    cpuMs: 30000,
                    memoryMb: 512,
                    timeoutMs: 60000,
                    maxOutputBytes: 1048576,
                    networkEnabled: true,
                    storageEnabled: false,
                },
                networkAllowlist: [],
            });
            const req = createRequest();
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.violations.some((v) => v.control === 'AC-6')).toBe(true);
        });
        (0, globals_1.it)('should flag NIST AI RMF violation for missing bias testing', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['NIST_AI_RMF'],
            });
            const req = createRequest({ validationRules: [] });
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.violations.some((v) => v.control === 'MAP-1.1')).toBe(true);
        });
        (0, globals_1.it)('should pass NIST AI RMF with bias testing configured', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['NIST_AI_RMF'],
            });
            const req = createRequest({
                validationRules: [{ type: 'bias', config: {} }],
            });
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.violations.some((v) => v.control === 'MAP-1.1')).toBe(false);
        });
        (0, globals_1.it)('should flag EO 14110 violation for missing safety testing', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['EXECUTIVE_ORDER_14110'],
            });
            const req = createRequest({ validationRules: [] });
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.violations.some((v) => v.control === 'SEC-3')).toBe(true);
            (0, globals_1.expect)(decision.violations.find((v) => v.control === 'SEC-3')?.severity).toBe('high');
        });
        (0, globals_1.it)('should pass EO 14110 with safety testing configured', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['EXECUTIVE_ORDER_14110'],
            });
            const req = createRequest({
                validationRules: [{ type: 'safety', config: {} }],
            });
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.violations.some((v) => v.control === 'SEC-3')).toBe(false);
        });
        (0, globals_1.it)('should provide recommendations for small test sets', async () => {
            const env = createEnvironment();
            const req = createRequest({
                testCases: [{ id: 'tc-1', name: 'Test', input: {}, tags: [] }],
            });
            const decision = await policyEngine.evaluate(env, req);
            (0, globals_1.expect)(decision.recommendations.some((r) => r.includes('test cases'))).toBe(true);
        });
        (0, globals_1.it)('should handle multiple compliance frameworks', async () => {
            const env = createEnvironment({
                complianceFrameworks: ['FEDRAMP_HIGH', 'NIST_AI_RMF', 'EXECUTIVE_ORDER_14110'],
            });
            const req = createRequest({ validationRules: [] });
            const decision = await policyEngine.evaluate(env, req);
            // Should have violations from multiple frameworks
            (0, globals_1.expect)(decision.violations.length).toBeGreaterThan(0);
            const frameworks = new Set(decision.violations.map((v) => v.framework));
            (0, globals_1.expect)(frameworks.size).toBeGreaterThan(1);
        });
    });
    (0, globals_1.describe)('validateDeployment', () => {
        (0, globals_1.it)('should allow staging deployments', async () => {
            const decision = await policyEngine.validateDeployment('exp-123', 'staging');
            (0, globals_1.expect)(decision.allowed).toBe(true);
        });
        (0, globals_1.it)('should allow production deployments with recommendations', async () => {
            const decision = await policyEngine.validateDeployment('exp-123', 'production');
            (0, globals_1.expect)(decision.allowed).toBe(true);
            (0, globals_1.expect)(decision.recommendations.length).toBeGreaterThan(0);
        });
    });
});
