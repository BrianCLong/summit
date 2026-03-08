"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('pg', () => ({
    Pool: globals_1.jest.fn(() => ({
        query: mockQuery,
        connect: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    })),
}));
globals_1.jest.mock('../../utils/logger.js', () => ({
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
const PolicyManagementService_js_1 = require("../PolicyManagementService.js");
(0, globals_1.describe)('PolicyManagementService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        service = new PolicyManagementService_js_1.PolicyManagementService();
    });
    (0, globals_1.describe)('createPolicySchema validation', () => {
        const validPolicy = {
            name: 'data-export-policy',
            displayName: 'Data Export Policy',
            category: 'export',
            priority: 100,
            scope: {
                stages: ['runtime'],
                tenants: ['tenant-a'],
            },
            rules: [
                { field: 'data.classification', operator: 'eq', value: 'confidential' },
            ],
            action: 'DENY',
        };
        (0, globals_1.it)('validates a correct policy input', () => {
            const result = PolicyManagementService_js_1.createPolicySchema.safeParse(validPolicy);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('requires name to be lowercase with hyphens only', () => {
            const invalid = { ...validPolicy, name: 'Invalid Name!' };
            const result = PolicyManagementService_js_1.createPolicySchema.safeParse(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('requires at least one rule', () => {
            const invalid = { ...validPolicy, rules: [] };
            const result = PolicyManagementService_js_1.createPolicySchema.safeParse(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('requires at least one stage in scope', () => {
            const invalid = {
                ...validPolicy,
                scope: { stages: [], tenants: ['tenant-a'] },
            };
            const result = PolicyManagementService_js_1.createPolicySchema.safeParse(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('validates category enum values', () => {
            const categories = [
                'access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety',
            ];
            categories.forEach((category) => {
                const policy = { ...validPolicy, category };
                (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse(policy).success).toBe(true);
            });
        });
        (0, globals_1.it)('validates action enum values', () => {
            const actions = ['ALLOW', 'DENY', 'ESCALATE', 'WARN'];
            actions.forEach((action) => {
                const policy = { ...validPolicy, action };
                (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse(policy).success).toBe(true);
            });
        });
        (0, globals_1.it)('validates operator enum in rules', () => {
            const operators = ['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains'];
            operators.forEach((operator) => {
                const policy = {
                    ...validPolicy,
                    rules: [{ field: 'test', operator, value: 'value' }],
                };
                (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse(policy).success).toBe(true);
            });
        });
        (0, globals_1.it)('enforces priority range 0-1000', () => {
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse({ ...validPolicy, priority: 0 }).success).toBe(true);
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse({ ...validPolicy, priority: 1000 }).success).toBe(true);
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse({ ...validPolicy, priority: 1001 }).success).toBe(false);
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse({ ...validPolicy, priority: -1 }).success).toBe(false);
        });
    });
    (0, globals_1.describe)('updatePolicySchema validation', () => {
        (0, globals_1.it)('allows partial updates', () => {
            const result = PolicyManagementService_js_1.updatePolicySchema.safeParse({ displayName: 'Updated' });
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('allows empty update', () => {
            const result = PolicyManagementService_js_1.updatePolicySchema.safeParse({});
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('validates category when provided', () => {
            (0, globals_1.expect)(PolicyManagementService_js_1.updatePolicySchema.safeParse({ category: 'compliance' }).success).toBe(true);
            (0, globals_1.expect)(PolicyManagementService_js_1.updatePolicySchema.safeParse({ category: 'invalid' }).success).toBe(false);
        });
    });
    (0, globals_1.describe)('integration scenarios', () => {
        (0, globals_1.it)('creates an access control policy correctly', () => {
            const accessPolicy = {
                name: 'admin-only-access',
                displayName: 'Admin Only Access Policy',
                category: 'access',
                priority: 200,
                scope: { stages: ['runtime'], tenants: ['enterprise-tenant'] },
                rules: [
                    { field: 'user.role', operator: 'eq', value: 'admin' },
                ],
                action: 'ALLOW',
                metadata: { compliance: ['SOC2-CC6.1'] },
            };
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse(accessPolicy).success).toBe(true);
        });
        (0, globals_1.it)('creates a safety guardrail policy correctly', () => {
            const safetyPolicy = {
                name: 'llm-content-safety',
                displayName: 'LLM Content Safety Guardrails',
                category: 'safety',
                priority: 1000,
                scope: { stages: ['alignment', 'runtime'], tenants: ['*'] },
                rules: [
                    { field: 'content.toxicity_score', operator: 'gt', value: 0.7 },
                ],
                action: 'DENY',
            };
            (0, globals_1.expect)(PolicyManagementService_js_1.createPolicySchema.safeParse(safetyPolicy).success).toBe(true);
        });
    });
});
