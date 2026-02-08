/**
 * App Surface Types - Schema Validation Tests
 *
 * Tests that Zod schemas correctly validate and reject inputs.
 */

import { describe, it, expect } from '@jest/globals';
import {
  EnvironmentSchema,
  ToolIdSchema,
  PolicyVerdictSchema,
  PolicyPreflightRequestSchema,
  PolicyPreflightResponseSchema,
  EvidenceBundleSchema,
  AppCardSchema,
  ToolAllowlistConfigSchema,
} from '../../src/app-surface/types.js';

describe('App Surface Types - Schema Validation', () => {
  describe('EnvironmentSchema', () => {
    it('accepts valid environments', () => {
      expect(EnvironmentSchema.parse('dev')).toBe('dev');
      expect(EnvironmentSchema.parse('staging')).toBe('staging');
      expect(EnvironmentSchema.parse('prod')).toBe('prod');
    });

    it('rejects invalid environments', () => {
      expect(() => EnvironmentSchema.parse('local')).toThrow();
      expect(() => EnvironmentSchema.parse('')).toThrow();
      expect(() => EnvironmentSchema.parse(123)).toThrow();
    });
  });

  describe('ToolIdSchema', () => {
    it('accepts valid tool IDs', () => {
      expect(ToolIdSchema.parse('graph-query')).toBe('graph-query');
      expect(ToolIdSchema.parse('entity_search')).toBe('entity_search');
      expect(ToolIdSchema.parse('copilot-ask')).toBe('copilot-ask');
    });

    it('rejects invalid tool IDs', () => {
      expect(() => ToolIdSchema.parse('')).toThrow();
      expect(() => ToolIdSchema.parse('has spaces')).toThrow();
      expect(() => ToolIdSchema.parse('has@special')).toThrow();
      expect(() => ToolIdSchema.parse('a'.repeat(129))).toThrow();
    });
  });

  describe('PolicyVerdictSchema', () => {
    it('accepts ALLOW and DENY', () => {
      expect(PolicyVerdictSchema.parse('ALLOW')).toBe('ALLOW');
      expect(PolicyVerdictSchema.parse('DENY')).toBe('DENY');
    });

    it('rejects other values', () => {
      expect(() => PolicyVerdictSchema.parse('allow')).toThrow();
      expect(() => PolicyVerdictSchema.parse('MAYBE')).toThrow();
    });
  });

  describe('PolicyPreflightRequestSchema', () => {
    it('accepts a valid request', () => {
      const result = PolicyPreflightRequestSchema.parse({
        environment: 'dev',
        tools: ['graph-query', 'entity-search'],
        rationale: 'Testing tool access',
      });
      expect(result.environment).toBe('dev');
      expect(result.tools).toHaveLength(2);
      expect(result.dryRun).toBe(false); // default
    });

    it('applies dryRun default', () => {
      const result = PolicyPreflightRequestSchema.parse({
        environment: 'prod',
        tools: ['copilot-ask'],
        rationale: 'Need AI assistance',
      });
      expect(result.dryRun).toBe(false);
    });

    it('rejects empty tools array', () => {
      expect(() =>
        PolicyPreflightRequestSchema.parse({
          environment: 'dev',
          tools: [],
          rationale: 'Testing',
        }),
      ).toThrow();
    });

    it('rejects missing rationale', () => {
      expect(() =>
        PolicyPreflightRequestSchema.parse({
          environment: 'dev',
          tools: ['graph-query'],
          rationale: '',
        }),
      ).toThrow();
    });

    it('rejects rationale exceeding max length', () => {
      expect(() =>
        PolicyPreflightRequestSchema.parse({
          environment: 'dev',
          tools: ['graph-query'],
          rationale: 'x'.repeat(2001),
        }),
      ).toThrow();
    });
  });

  describe('EvidenceBundleSchema', () => {
    const validBundle = {
      id: 'ev-123',
      version: '1.0' as const,
      timestamp: '2025-01-01T00:00:00.000Z',
      actor: 'test-user',
      action: 'policy_preflight',
      inputsHash: 'abc123',
      outputsHash: 'def456',
      policyDecision: 'ALLOW' as const,
      environment: 'dev' as const,
      details: {},
      integrityHash: 'ghi789',
    };

    it('accepts a valid evidence bundle', () => {
      const result = EvidenceBundleSchema.parse(validBundle);
      expect(result.id).toBe('ev-123');
      expect(result.version).toBe('1.0');
    });

    it('rejects wrong version', () => {
      expect(() =>
        EvidenceBundleSchema.parse({ ...validBundle, version: '2.0' }),
      ).toThrow();
    });

    it('rejects missing required fields', () => {
      const { integrityHash: _, ...incomplete } = validBundle;
      expect(() => EvidenceBundleSchema.parse(incomplete)).toThrow();
    });
  });

  describe('AppCardSchema', () => {
    it('accepts a valid app card', () => {
      const result = AppCardSchema.parse({
        id: 'card-1',
        surface: 'Policy Preflight Runner',
        title: 'Policy Preflight Check',
        summary: 'Check tool permissions',
        status: 'pending',
        timestamp: '2025-01-01T00:00:00.000Z',
      });
      expect(result.id).toBe('card-1');
      expect(result.status).toBe('pending');
    });

    it('accepts a card with result', () => {
      const result = AppCardSchema.parse({
        id: 'card-2',
        surface: 'Policy Preflight Runner',
        title: 'Policy Preflight Check',
        summary: 'Completed check',
        status: 'success',
        timestamp: '2025-01-01T00:00:00.000Z',
        result: {
          verdict: 'ALLOW',
          evidenceId: 'ev-456',
          details: { allowedTools: ['graph-query'] },
        },
      });
      expect(result.result?.verdict).toBe('ALLOW');
    });

    it('rejects invalid status', () => {
      expect(() =>
        AppCardSchema.parse({
          id: 'card-3',
          surface: 'test',
          title: 'test',
          summary: 'test',
          status: 'unknown',
          timestamp: '2025-01-01T00:00:00.000Z',
        }),
      ).toThrow();
    });
  });

  describe('ToolAllowlistConfigSchema', () => {
    it('accepts a valid config', () => {
      const result = ToolAllowlistConfigSchema.parse({
        version: '1.0.0',
        environments: {
          dev: {
            allowedTools: ['graph-query', 'debug-inspect'],
            denyByDefault: true,
            requireRationale: false,
          },
          prod: {
            allowedTools: ['graph-query'],
            denyByDefault: true,
            requireRationale: true,
          },
        },
      });
      expect(result.version).toBe('1.0.0');
      expect(result.environments.dev.allowedTools).toContain('graph-query');
    });
  });
});
