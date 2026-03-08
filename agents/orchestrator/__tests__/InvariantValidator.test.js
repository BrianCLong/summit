"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const InvariantValidator_js_1 = require("../src/context/capsules/InvariantValidator.js");
// Use vi.hoisted to ensure mocks are available before imports
const { mockEvaluate, mockLoadPolicy } = vitest_1.vi.hoisted(() => {
    return {
        mockEvaluate: vitest_1.vi.fn(),
        mockLoadPolicy: vitest_1.vi.fn()
    };
});
vitest_1.vi.mock('@open-policy-agent/opa-wasm', () => ({
    loadPolicy: (buffer) => mockLoadPolicy(buffer)
}));
// Mock ContextCapsuleFactory to always return valid hash/signature
vitest_1.vi.mock('../src/context/capsules/ContextCapsule.js', () => {
    return {
        ContextCapsuleFactory: vitest_1.vi.fn().mockImplementation(() => ({
            verifyCapsuleHash: () => true,
            verifyCapsuleSignature: () => true
        }))
    };
});
(0, vitest_1.describe)('InvariantValidator', () => {
    let validator;
    (0, vitest_1.beforeEach)(() => {
        validator = new InvariantValidator_js_1.InvariantValidator();
        mockEvaluate.mockReset();
        mockLoadPolicy.mockReset();
        // Setup default mock behavior
        mockLoadPolicy.mockResolvedValue({
            evaluate: mockEvaluate
        });
    });
    const mockContext = {
        sessionId: 'test-session',
        agentId: 'test-agent',
        agentTrustTier: 'VERIFIED',
        policyDomain: 'test',
        requireSignedCapsules: false,
        executionTime: new Date()
    };
    const mockCapsule = (invariant) => ({
        id: 'test-capsule',
        content: {
            id: 'seg-1',
            content: 'test content',
            type: 'text',
            metadata: {},
            derivedFrom: []
        },
        invariants: [invariant],
        metadata: {
            createdBy: 'agent-1',
            authorityScope: ['read'],
            policyDomain: 'test',
            createdAt: new Date()
        }
    });
    (0, vitest_1.it)('should pass if Rego policy returns true', async () => {
        const invariant = {
            id: 'inv-1',
            type: 'authority_scope',
            rule: {
                kind: 'custom_expression',
                expr: Buffer.from('mock-wasm').toString('base64'),
                language: 'rego'
            },
            severity: 'block',
            description: 'Test invariant'
        };
        mockEvaluate.mockReturnValue([{ result: true }]);
        const result = await validator.validate([mockCapsule(invariant)], mockContext);
        (0, vitest_1.expect)(mockLoadPolicy).toHaveBeenCalled();
        const invariantViolations = result.violations.filter(v => v.violation === 'invariant_violated');
        (0, vitest_1.expect)(invariantViolations).toHaveLength(0);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('should fail if Rego policy returns false', async () => {
        const invariant = {
            id: 'inv-1',
            type: 'authority_scope',
            rule: {
                kind: 'custom_expression',
                expr: Buffer.from('mock-wasm').toString('base64'),
                language: 'rego'
            },
            severity: 'block',
            description: 'Test invariant'
        };
        // Simulate empty result or false result
        mockEvaluate.mockReturnValue([]);
        const result = await validator.validate([mockCapsule(invariant)], mockContext);
        const invariantViolations = result.violations.filter(v => v.violation === 'invariant_violated');
        (0, vitest_1.expect)(invariantViolations).toHaveLength(1);
        (0, vitest_1.expect)(invariantViolations[0].message).toContain('default deny');
    });
    (0, vitest_1.it)('should fail if Rego policy returns explict violations', async () => {
        const invariant = {
            id: 'inv-1',
            type: 'authority_scope',
            rule: {
                kind: 'custom_expression',
                expr: Buffer.from('mock-wasm').toString('base64'),
                language: 'rego'
            },
            severity: 'block',
            description: 'Test invariant'
        };
        mockEvaluate.mockReturnValue([{ result: { violations: ['Specific error'] } }]);
        const result = await validator.validate([mockCapsule(invariant)], mockContext);
        const invariantViolations = result.violations.filter(v => v.violation === 'invariant_violated');
        (0, vitest_1.expect)(invariantViolations).toHaveLength(1);
        (0, vitest_1.expect)(invariantViolations[0].message).toContain('Specific error');
    });
    (0, vitest_1.it)('should cache loaded policies', async () => {
        const invariant = {
            id: 'inv-1',
            type: 'authority_scope',
            rule: {
                kind: 'custom_expression',
                expr: Buffer.from('mock-wasm-cached').toString('base64'),
                language: 'rego'
            },
            severity: 'block',
            description: 'Test invariant'
        };
        mockEvaluate.mockReturnValue([{ result: true }]);
        // First call
        await validator.validate([mockCapsule(invariant)], mockContext);
        (0, vitest_1.expect)(mockLoadPolicy).toHaveBeenCalledTimes(1);
        // Second call with same expr
        await validator.validate([mockCapsule(invariant)], mockContext);
        (0, vitest_1.expect)(mockLoadPolicy).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('should handle CEL as unsupported', async () => {
        const invariant = {
            id: 'inv-1',
            type: 'authority_scope',
            rule: {
                kind: 'custom_expression',
                expr: 'some-cel-expr',
                language: 'cel'
            },
            severity: 'block',
            description: 'Test invariant'
        };
        const result = await validator.validate([mockCapsule(invariant)], mockContext);
        const invariantViolations = result.violations.filter(v => v.violation === 'invariant_violated');
        (0, vitest_1.expect)(invariantViolations).toHaveLength(1);
        (0, vitest_1.expect)(invariantViolations[0].message).toContain('Unsupported policy language');
    });
});
