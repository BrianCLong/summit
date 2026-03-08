"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_js_1 = require("../src/types.js");
(0, globals_1.describe)('Type Schemas', () => {
    (0, globals_1.describe)('ComplianceFrameworkSchema', () => {
        (0, globals_1.it)('should accept valid frameworks', () => {
            (0, globals_1.expect)(types_js_1.ComplianceFrameworkSchema.parse('FEDRAMP_HIGH')).toBe('FEDRAMP_HIGH');
            (0, globals_1.expect)(types_js_1.ComplianceFrameworkSchema.parse('NIST_AI_RMF')).toBe('NIST_AI_RMF');
            (0, globals_1.expect)(types_js_1.ComplianceFrameworkSchema.parse('EXECUTIVE_ORDER_14110')).toBe('EXECUTIVE_ORDER_14110');
        });
        (0, globals_1.it)('should reject invalid frameworks', () => {
            (0, globals_1.expect)(() => types_js_1.ComplianceFrameworkSchema.parse('INVALID')).toThrow();
        });
    });
    (0, globals_1.describe)('ResourceQuotasSchema', () => {
        (0, globals_1.it)('should apply default values', () => {
            const result = types_js_1.ResourceQuotasSchema.parse({});
            (0, globals_1.expect)(result.cpuMs).toBe(30000);
            (0, globals_1.expect)(result.memoryMb).toBe(512);
            (0, globals_1.expect)(result.timeoutMs).toBe(60000);
            (0, globals_1.expect)(result.maxOutputBytes).toBe(1048576);
            (0, globals_1.expect)(result.networkEnabled).toBe(false);
            (0, globals_1.expect)(result.storageEnabled).toBe(false);
        });
        (0, globals_1.it)('should accept custom values', () => {
            const result = types_js_1.ResourceQuotasSchema.parse({
                cpuMs: 60000,
                memoryMb: 1024,
                networkEnabled: true,
            });
            (0, globals_1.expect)(result.cpuMs).toBe(60000);
            (0, globals_1.expect)(result.memoryMb).toBe(1024);
            (0, globals_1.expect)(result.networkEnabled).toBe(true);
        });
        (0, globals_1.it)('should reject values below minimum', () => {
            (0, globals_1.expect)(() => types_js_1.ResourceQuotasSchema.parse({ cpuMs: 5 })).toThrow();
            (0, globals_1.expect)(() => types_js_1.ResourceQuotasSchema.parse({ memoryMb: 32 })).toThrow();
        });
        (0, globals_1.it)('should reject values above maximum', () => {
            (0, globals_1.expect)(() => types_js_1.ResourceQuotasSchema.parse({ cpuMs: 500000 })).toThrow();
            (0, globals_1.expect)(() => types_js_1.ResourceQuotasSchema.parse({ memoryMb: 16384 })).toThrow();
        });
    });
    (0, globals_1.describe)('SandboxEnvironmentSchema', () => {
        (0, globals_1.it)('should validate complete environment', () => {
            const env = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test Env',
                agencyId: 'agency-123',
                complianceFrameworks: ['FEDRAMP_MODERATE'],
                resourceQuotas: { cpuMs: 30000, memoryMb: 512, timeoutMs: 60000, maxOutputBytes: 1048576, networkEnabled: false, storageEnabled: false },
                allowedModules: [],
                blockedModules: [],
                networkAllowlist: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'active',
            };
            const result = types_js_1.SandboxEnvironmentSchema.parse(env);
            (0, globals_1.expect)(result.id).toBe(env.id);
            (0, globals_1.expect)(result.status).toBe('active');
        });
        (0, globals_1.it)('should reject invalid UUID', () => {
            const env = {
                id: 'not-a-uuid',
                name: 'Test',
                agencyId: 'agency',
                complianceFrameworks: [],
                resourceQuotas: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            (0, globals_1.expect)(() => types_js_1.SandboxEnvironmentSchema.parse(env)).toThrow();
        });
        (0, globals_1.it)('should reject empty name', () => {
            const env = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: '',
                agencyId: 'agency',
                complianceFrameworks: [],
                resourceQuotas: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            (0, globals_1.expect)(() => types_js_1.SandboxEnvironmentSchema.parse(env)).toThrow();
        });
    });
    (0, globals_1.describe)('ExperimentRequestSchema', () => {
        (0, globals_1.it)('should validate complete request', () => {
            const req = {
                environmentId: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test Experiment',
                modelConfig: {
                    modelId: 'gpt-4',
                    modelType: 'llm',
                    provider: 'openai',
                    version: '1.0',
                },
                testCases: [
                    { id: 'tc-1', name: 'Test 1', input: 'hello' },
                ],
            };
            const result = types_js_1.ExperimentRequestSchema.parse(req);
            (0, globals_1.expect)(result.name).toBe('Test Experiment');
            (0, globals_1.expect)(result.testCases).toHaveLength(1);
            (0, globals_1.expect)(result.validationRules).toEqual([]);
        });
        (0, globals_1.it)('should validate with all model types', () => {
            const modelTypes = ['llm', 'vision', 'speech', 'multimodal', 'custom'];
            for (const modelType of modelTypes) {
                const req = {
                    environmentId: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Test',
                    modelConfig: {
                        modelId: 'test',
                        modelType,
                        provider: 'test',
                        version: '1.0',
                    },
                    testCases: [{ id: '1', name: 'test', input: {} }],
                };
                (0, globals_1.expect)(() => types_js_1.ExperimentRequestSchema.parse(req)).not.toThrow();
            }
        });
        (0, globals_1.it)('should validate all validation rule types', () => {
            const ruleTypes = ['accuracy', 'bias', 'safety', 'latency', 'compliance', 'custom'];
            const req = {
                environmentId: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                modelConfig: {
                    modelId: 'test',
                    modelType: 'llm',
                    provider: 'test',
                    version: '1.0',
                },
                testCases: [{ id: '1', name: 'test', input: {} }],
                validationRules: ruleTypes.map((type) => ({ type, config: {} })),
            };
            const result = types_js_1.ExperimentRequestSchema.parse(req);
            (0, globals_1.expect)(result.validationRules).toHaveLength(ruleTypes.length);
        });
    });
    (0, globals_1.describe)('DeploymentRequestSchema', () => {
        (0, globals_1.it)('should validate deployment request', () => {
            const req = {
                experimentId: '550e8400-e29b-41d4-a716-446655440000',
                targetEnvironment: 'staging',
                approvals: [
                    { approverId: 'user-1', role: 'lead', approvedAt: new Date() },
                    { approverId: 'user-2', role: 'security', approvedAt: new Date() },
                ],
                deploymentConfig: {
                    replicas: 2,
                    resources: {},
                    rolloutStrategy: 'canary',
                },
            };
            const result = types_js_1.DeploymentRequestSchema.parse(req);
            (0, globals_1.expect)(result.targetEnvironment).toBe('staging');
            (0, globals_1.expect)(result.approvals).toHaveLength(2);
        });
        (0, globals_1.it)('should apply deployment config defaults', () => {
            const req = {
                experimentId: '550e8400-e29b-41d4-a716-446655440000',
                targetEnvironment: 'production',
                approvals: [
                    { approverId: 'user-1', role: 'lead', approvedAt: new Date() },
                ],
                deploymentConfig: {
                    resources: {},
                },
            };
            const result = types_js_1.DeploymentRequestSchema.parse(req);
            (0, globals_1.expect)(result.deploymentConfig.replicas).toBe(1);
            (0, globals_1.expect)(result.deploymentConfig.rolloutStrategy).toBe('canary');
            (0, globals_1.expect)(result.deploymentConfig.autoRollback).toBe(true);
        });
        (0, globals_1.it)('should reject invalid target environment', () => {
            const req = {
                experimentId: '550e8400-e29b-41d4-a716-446655440000',
                targetEnvironment: 'invalid',
                approvals: [],
                deploymentConfig: { resources: {} },
            };
            (0, globals_1.expect)(() => types_js_1.DeploymentRequestSchema.parse(req)).toThrow();
        });
    });
});
