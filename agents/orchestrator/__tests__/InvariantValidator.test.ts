import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvariantValidator } from '../src/context/capsules/InvariantValidator.js';
import { ContextCapsule, ExecutionContext, Invariant } from '../src/context/capsules/types.js';

// Use vi.hoisted to ensure mocks are available before imports
const { mockEvaluate, mockLoadPolicy } = vi.hoisted(() => {
  return {
    mockEvaluate: vi.fn(),
    mockLoadPolicy: vi.fn()
  }
});

vi.mock('@open-policy-agent/opa-wasm', () => ({
  loadPolicy: (buffer: any) => mockLoadPolicy(buffer)
}));

// Mock ContextCapsuleFactory to always return valid hash/signature
vi.mock('../src/context/capsules/ContextCapsule.js', () => {
  return {
    ContextCapsuleFactory: vi.fn().mockImplementation(() => ({
      verifyCapsuleHash: () => true,
      verifyCapsuleSignature: () => true
    }))
  };
});

describe('InvariantValidator', () => {
  let validator: InvariantValidator;

  beforeEach(() => {
    validator = new InvariantValidator();
    mockEvaluate.mockReset();
    mockLoadPolicy.mockReset();

    // Setup default mock behavior
    mockLoadPolicy.mockResolvedValue({
      evaluate: mockEvaluate
    });
  });

  const mockContext: ExecutionContext = {
    sessionId: 'test-session',
    agentId: 'test-agent',
    agentTrustTier: 'VERIFIED',
    policyDomain: 'test',
    requireSignedCapsules: false,
    executionTime: new Date()
  };

  const mockCapsule = (invariant: Invariant): ContextCapsule => ({
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

  it('should pass if Rego policy returns true', async () => {
    const invariant: Invariant = {
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

    expect(mockLoadPolicy).toHaveBeenCalled();
    const invariantViolations = result.violations.filter(v => v.violation === 'invariant_violated');
    expect(invariantViolations).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('should fail if Rego policy returns false', async () => {
    const invariant: Invariant = {
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
    expect(invariantViolations).toHaveLength(1);
    expect(invariantViolations[0].message).toContain('default deny');
  });

  it('should fail if Rego policy returns explict violations', async () => {
      const invariant: Invariant = {
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
      expect(invariantViolations).toHaveLength(1);
      expect(invariantViolations[0].message).toContain('Specific error');
  });

  it('should cache loaded policies', async () => {
    const invariant: Invariant = {
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
    expect(mockLoadPolicy).toHaveBeenCalledTimes(1);

    // Second call with same expr
    await validator.validate([mockCapsule(invariant)], mockContext);
    expect(mockLoadPolicy).toHaveBeenCalledTimes(1);
  });

  it('should handle CEL as unsupported', async () => {
     const invariant: Invariant = {
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
    expect(invariantViolations).toHaveLength(1);
    expect(invariantViolations[0].message).toContain('Unsupported policy language');
  });
});
