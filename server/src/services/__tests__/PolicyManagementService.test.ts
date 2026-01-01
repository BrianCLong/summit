import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  PolicyManagementService,
  createPolicySchema,
  updatePolicySchema,
  CreatePolicyInput,
  PolicyCategory,
} from '../PolicyManagementService.js';

describe('PolicyManagementService', () => {
  let service: PolicyManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PolicyManagementService();
  });

  describe('createPolicySchema validation', () => {
    const validPolicy: CreatePolicyInput = {
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

    it('validates a correct policy input', () => {
      const result = createPolicySchema.safeParse(validPolicy);
      expect(result.success).toBe(true);
    });

    it('requires name to be lowercase with hyphens only', () => {
      const invalid = { ...validPolicy, name: 'Invalid Name!' };
      const result = createPolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires at least one rule', () => {
      const invalid = { ...validPolicy, rules: [] };
      const result = createPolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires at least one stage in scope', () => {
      const invalid = {
        ...validPolicy,
        scope: { stages: [], tenants: ['tenant-a'] },
      };
      const result = createPolicySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates category enum values', () => {
      const categories: PolicyCategory[] = [
        'access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety',
      ];
      categories.forEach((category) => {
        const policy = { ...validPolicy, category };
        expect(createPolicySchema.safeParse(policy).success).toBe(true);
      });
    });

    it('validates action enum values', () => {
      const actions = ['ALLOW', 'DENY', 'ESCALATE', 'WARN'] as const;
      actions.forEach((action) => {
        const policy = { ...validPolicy, action };
        expect(createPolicySchema.safeParse(policy).success).toBe(true);
      });
    });

    it('validates operator enum in rules', () => {
      const operators = ['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains'] as const;
      operators.forEach((operator) => {
        const policy = {
          ...validPolicy,
          rules: [{ field: 'test', operator, value: 'value' }],
        };
        expect(createPolicySchema.safeParse(policy).success).toBe(true);
      });
    });

    it('enforces priority range 0-1000', () => {
      expect(createPolicySchema.safeParse({ ...validPolicy, priority: 0 }).success).toBe(true);
      expect(createPolicySchema.safeParse({ ...validPolicy, priority: 1000 }).success).toBe(true);
      expect(createPolicySchema.safeParse({ ...validPolicy, priority: 1001 }).success).toBe(false);
      expect(createPolicySchema.safeParse({ ...validPolicy, priority: -1 }).success).toBe(false);
    });
  });

  describe('updatePolicySchema validation', () => {
    it('allows partial updates', () => {
      const result = updatePolicySchema.safeParse({ displayName: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('allows empty update', () => {
      const result = updatePolicySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates category when provided', () => {
      expect(updatePolicySchema.safeParse({ category: 'compliance' }).success).toBe(true);
      expect(updatePolicySchema.safeParse({ category: 'invalid' }).success).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('creates an access control policy correctly', () => {
      const accessPolicy: CreatePolicyInput = {
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
      expect(createPolicySchema.safeParse(accessPolicy).success).toBe(true);
    });

    it('creates a safety guardrail policy correctly', () => {
      const safetyPolicy: CreatePolicyInput = {
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
      expect(createPolicySchema.safeParse(safetyPolicy).success).toBe(true);
    });
  });
});
