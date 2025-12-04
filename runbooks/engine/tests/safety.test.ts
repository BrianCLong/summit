/**
 * Tests for safety guardrails
 */

import {
  SafetyValidator,
  SafetyViolationError,
  DEFAULT_SAFETY_CONFIG,
  TenantResourceTracker,
} from '../src/safety';
import { RunbookDefinition, ExtendedStepDefinition, ExecutionContext } from '../src/types';

describe('SafetyValidator', () => {
  let validator: SafetyValidator;

  beforeEach(() => {
    validator = new SafetyValidator(DEFAULT_SAFETY_CONFIG);
  });

  describe('validateRunbook', () => {
    it('should accept valid runbook', () => {
      const runbook: RunbookDefinition = {
        id: 'test-runbook',
        name: 'Test Runbook',
        version: '1.0.0',
        description: 'Test',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'test',
            inputSchema: {},
            outputSchema: {},
            dependsOn: [],
            config: {},
            retryPolicy: {
              maxAttempts: 3,
              initialDelayMs: 1000,
              maxDelayMs: 10000,
              backoffMultiplier: 2,
            },
          },
        ],
        defaultRetryPolicy: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
        },
      };

      expect(() => validator.validateRunbook(runbook)).not.toThrow();
    });

    it('should reject runbook with too many steps', () => {
      const steps = Array.from({ length: 1001 }, (_, i) => ({
        id: `step${i}`,
        name: `Step ${i}`,
        type: 'test',
        inputSchema: {},
        outputSchema: {},
        dependsOn: [],
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
        },
      }));

      const runbook: RunbookDefinition = {
        id: 'test-runbook',
        name: 'Test Runbook',
        version: '1.0.0',
        description: 'Test',
        steps,
        defaultRetryPolicy: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
        },
      };

      expect(() => validator.validateRunbook(runbook)).toThrow(SafetyViolationError);
    });

    it('should reject runbook with excessive nesting', () => {
      // Create deeply nested structure
      let nestedSteps: ExtendedStepDefinition[] = [
        {
          id: 'innermost',
          name: 'Innermost',
          type: 'test',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: {
            maxAttempts: 1,
            initialDelayMs: 1000,
            maxDelayMs: 1000,
            backoffMultiplier: 1,
          },
        },
      ];

      // Nest 15 levels deep (exceeds max of 10)
      for (let i = 0; i < 15; i++) {
        nestedSteps = [
          {
            id: `level${i}`,
            name: `Level ${i}`,
            type: 'core:conditional',
            inputSchema: {},
            outputSchema: {},
            dependsOn: [],
            config: {},
            retryPolicy: {
              maxAttempts: 1,
              initialDelayMs: 1000,
              maxDelayMs: 1000,
              backoffMultiplier: 1,
            },
            branches: [
              {
                condition: { left: '$test', operator: 'eq', right: 'test' },
                steps: nestedSteps,
              },
            ],
          },
        ];
      }

      const runbook: RunbookDefinition = {
        id: 'test-runbook',
        name: 'Test Runbook',
        version: '1.0.0',
        description: 'Test',
        steps: nestedSteps,
        defaultRetryPolicy: {
          maxAttempts: 1,
          initialDelayMs: 1000,
          maxDelayMs: 1000,
          backoffMultiplier: 1,
        },
      };

      expect(() => validator.validateRunbook(runbook)).toThrow(SafetyViolationError);
    });

    it('should reject runbook with excessive timeout', () => {
      const runbook: RunbookDefinition = {
        id: 'test-runbook',
        name: 'Test Runbook',
        version: '1.0.0',
        description: 'Test',
        steps: [],
        defaultRetryPolicy: {
          maxAttempts: 1,
          initialDelayMs: 1000,
          maxDelayMs: 1000,
          backoffMultiplier: 1,
        },
        globalTimeoutMs: 10 * 60 * 60 * 1000, // 10 hours (too long)
      };

      expect(() => validator.validateRunbook(runbook)).toThrow(SafetyViolationError);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow execution under rate limit', () => {
      expect(() => validator.checkRateLimit('tenant1')).not.toThrow();
    });

    it('should enforce rate limit', () => {
      const tenantId = 'tenant-with-limit';

      // Execute up to limit
      for (let i = 0; i < DEFAULT_SAFETY_CONFIG.rateLimitPerTenant; i++) {
        expect(() => validator.checkRateLimit(tenantId)).not.toThrow();
      }

      // Next execution should fail
      expect(() => validator.checkRateLimit(tenantId)).toThrow(SafetyViolationError);
    });

    it('should reset rate limit after time window', async () => {
      const tenantId = 'tenant-with-reset';

      // Exhaust rate limit
      for (let i = 0; i < DEFAULT_SAFETY_CONFIG.rateLimitPerTenant; i++) {
        validator.checkRateLimit(tenantId);
      }

      // Clear rate limits (simulating time passage in tests)
      validator.clearRateLimits();

      // Should be able to execute again
      expect(() => validator.checkRateLimit(tenantId)).not.toThrow();
    });
  });

  describe('validateContext', () => {
    it('should accept valid context', () => {
      const context: ExecutionContext = {
        legalBasis: {
          authority: 'INVESTIGATION',
          classification: 'SENSITIVE',
          authorizedUsers: ['user1'],
        },
        tenantId: 'tenant1',
        initiatedBy: 'user1',
        assumptions: [],
      };

      expect(() => validator.validateContext(context)).not.toThrow();
    });

    it('should reject context without tenant ID', () => {
      const context: ExecutionContext = {
        legalBasis: {
          authority: 'INVESTIGATION',
          classification: 'SENSITIVE',
          authorizedUsers: ['user1'],
        },
        tenantId: '',
        initiatedBy: 'user1',
        assumptions: [],
      };

      expect(() => validator.validateContext(context)).toThrow();
    });

    it('should reject context without authorized users', () => {
      const context: ExecutionContext = {
        legalBasis: {
          authority: 'INVESTIGATION',
          classification: 'SENSITIVE',
          authorizedUsers: [],
        },
        tenantId: 'tenant1',
        initiatedBy: 'user1',
        assumptions: [],
      };

      expect(() => validator.validateContext(context)).toThrow();
    });

    it('should enforce tenant isolation', () => {
      const context: ExecutionContext = {
        legalBasis: {
          authority: 'INVESTIGATION',
          classification: 'SENSITIVE',
          authorizedUsers: ['user2'], // Initiator not in list
        },
        tenantId: 'tenant1',
        initiatedBy: 'user1',
        assumptions: [],
      };

      expect(() => validator.validateContext(context)).toThrow(SafetyViolationError);
    });
  });
});

describe('TenantResourceTracker', () => {
  let tracker: TenantResourceTracker;

  beforeEach(() => {
    tracker = new TenantResourceTracker();
  });

  it('should track execution start and end', () => {
    const tenantId = 'tenant1';

    tracker.trackExecutionStart(tenantId);
    let usage = tracker.getTenantUsage(tenantId);
    expect(usage.activeExecutions).toBe(1);

    tracker.trackExecutionEnd(tenantId, 10, 1000);
    usage = tracker.getTenantUsage(tenantId);
    expect(usage.activeExecutions).toBe(0);
    expect(usage.totalSteps).toBe(10);
    expect(usage.cpuTimeMs).toBe(1000);
  });

  it('should track multiple executions', () => {
    const tenantId = 'tenant1';

    tracker.trackExecutionStart(tenantId);
    tracker.trackExecutionStart(tenantId);

    let usage = tracker.getTenantUsage(tenantId);
    expect(usage.activeExecutions).toBe(2);

    tracker.trackExecutionEnd(tenantId, 5, 500);
    tracker.trackExecutionEnd(tenantId, 10, 1000);

    usage = tracker.getTenantUsage(tenantId);
    expect(usage.activeExecutions).toBe(0);
    expect(usage.totalSteps).toBe(15);
    expect(usage.cpuTimeMs).toBe(1500);
  });

  it('should isolate tenant usage', () => {
    tracker.trackExecutionStart('tenant1');
    tracker.trackExecutionStart('tenant2');

    const usage1 = tracker.getTenantUsage('tenant1');
    const usage2 = tracker.getTenantUsage('tenant2');

    expect(usage1.activeExecutions).toBe(1);
    expect(usage2.activeExecutions).toBe(1);
  });

  it('should return all tenant usage', () => {
    tracker.trackExecutionStart('tenant1');
    tracker.trackExecutionStart('tenant2');

    const allUsage = tracker.getAllTenantUsage();

    expect(allUsage.size).toBe(2);
    expect(allUsage.get('tenant1')?.activeExecutions).toBe(1);
    expect(allUsage.get('tenant2')?.activeExecutions).toBe(1);
  });
});
