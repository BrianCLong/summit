/**
 * Tests for built-in executors
 */

import {
  ConditionalExecutor,
  LoopExecutor,
  ApprovalExecutor,
  EventWaitExecutor,
  ServiceCallExecutor,
  ConditionEvaluator,
} from '../src/executors';
import {
  StepDefinition,
  ExtendedStepDefinition,
  ExecutionContext,
  ExecutionStatus,
} from '../src/types';

describe('ConditionEvaluator', () => {
  const testData = {
    status: 'active',
    count: 42,
    items: ['a', 'b', 'c'],
    nested: {
      value: 100,
    },
  };

  it('should evaluate eq operator', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$status', operator: 'eq', right: 'active' },
        testData
      )
    ).toBe(true);

    expect(
      ConditionEvaluator.evaluate(
        { left: '$status', operator: 'eq', right: 'inactive' },
        testData
      )
    ).toBe(false);
  });

  it('should evaluate ne operator', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$status', operator: 'ne', right: 'inactive' },
        testData
      )
    ).toBe(true);
  });

  it('should evaluate gt operator', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$count', operator: 'gt', right: 40 },
        testData
      )
    ).toBe(true);

    expect(
      ConditionEvaluator.evaluate(
        { left: '$count', operator: 'gt', right: 50 },
        testData
      )
    ).toBe(false);
  });

  it('should evaluate gte operator', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$count', operator: 'gte', right: 42 },
        testData
      )
    ).toBe(true);
  });

  it('should evaluate in operator', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$status', operator: 'in', right: ['active', 'pending'] },
        testData
      )
    ).toBe(true);

    expect(
      ConditionEvaluator.evaluate(
        { left: '$status', operator: 'in', right: ['inactive', 'pending'] },
        testData
      )
    ).toBe(false);
  });

  it('should evaluate exists operator', () => {
    expect(
      ConditionEvaluator.evaluate({ left: '$status', operator: 'exists' }, testData)
    ).toBe(true);

    expect(
      ConditionEvaluator.evaluate(
        { left: '$nonexistent', operator: 'exists' },
        testData
      )
    ).toBe(false);
  });

  it('should support nested paths', () => {
    expect(
      ConditionEvaluator.evaluate(
        { left: '$nested.value', operator: 'eq', right: 100 },
        testData
      )
    ).toBe(true);
  });
});

describe('ConditionalExecutor', () => {
  const executor = new ConditionalExecutor();
  const context: ExecutionContext = {
    legalBasis: {
      authority: 'TEST',
      classification: 'UNCLASSIFIED',
      authorizedUsers: ['test-user'],
    },
    tenantId: 'test-tenant',
    initiatedBy: 'test-user',
    assumptions: [],
  };

  it('should validate step with branches', () => {
    const step: ExtendedStepDefinition = {
      id: 'test-conditional',
      name: 'Test Conditional',
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
          condition: { left: '$status', operator: 'eq', right: 'active' },
          steps: [],
        },
      ],
    };

    expect(executor.validate(step)).toBe(true);
  });

  it('should throw error for step without branches', () => {
    const step: StepDefinition = {
      id: 'test-conditional',
      name: 'Test Conditional',
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
    };

    expect(() => executor.validate(step)).toThrow();
  });

  it('should execute and match first true condition', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-conditional',
      name: 'Test Conditional',
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
          condition: { left: '$status', operator: 'eq', right: 'inactive' },
          steps: [],
        },
        {
          condition: { left: '$status', operator: 'eq', right: 'active' },
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
                maxAttempts: 1,
                initialDelayMs: 1000,
                maxDelayMs: 1000,
                backoffMultiplier: 1,
              },
            },
          ],
        },
      ],
    };

    const input = {
      schema: {},
      data: { status: 'active' },
    };

    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.matchedBranch).toBe(1);
    expect(result.output?.data.stepsToExecute).toEqual(['step1']);
  });

  it('should skip if no condition matches', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-conditional',
      name: 'Test Conditional',
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
          condition: { left: '$status', operator: 'eq', right: 'inactive' },
          steps: [],
        },
      ],
    };

    const input = {
      schema: {},
      data: { status: 'active' },
    };

    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.SKIPPED);
  });
});

describe('LoopExecutor', () => {
  const executor = new LoopExecutor();
  const context: ExecutionContext = {
    legalBasis: {
      authority: 'TEST',
      classification: 'UNCLASSIFIED',
      authorizedUsers: ['test-user'],
    },
    tenantId: 'test-tenant',
    initiatedBy: 'test-user',
    assumptions: [],
  };

  it('should validate for_each loop', () => {
    const step: ExtendedStepDefinition = {
      id: 'test-loop',
      name: 'Test Loop',
      type: 'core:loop',
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
      loop: {
        type: 'for_each',
        collection: '$items',
        maxIterations: 100,
        steps: [],
      },
    };

    expect(executor.validate(step)).toBe(true);
  });

  it('should throw error for invalid maxIterations', () => {
    const step: ExtendedStepDefinition = {
      id: 'test-loop',
      name: 'Test Loop',
      type: 'core:loop',
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
      loop: {
        type: 'for_each',
        collection: '$items',
        maxIterations: 20000, // Too high
        steps: [],
      },
    };

    expect(() => executor.validate(step)).toThrow();
  });

  it('should execute for_each loop', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-loop',
      name: 'Test Loop',
      type: 'core:loop',
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
      loop: {
        type: 'for_each',
        collection: '$items',
        maxIterations: 100,
        steps: [],
      },
    };

    const input = {
      schema: {},
      data: { items: ['a', 'b', 'c'] },
    };

    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.iterationCount).toBe(3);
    expect(result.output?.data.iterations).toHaveLength(3);
  });

  it('should enforce maxIterations limit', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-loop',
      name: 'Test Loop',
      type: 'core:loop',
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
      loop: {
        type: 'for_each',
        collection: '$items',
        maxIterations: 2, // Limit to 2
        steps: [],
      },
    };

    const input = {
      schema: {},
      data: { items: ['a', 'b', 'c', 'd', 'e'] },
    };

    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.iterationCount).toBe(2); // Only 2 iterations
  });

  it('should execute count loop', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-loop',
      name: 'Test Loop',
      type: 'core:loop',
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
      loop: {
        type: 'count',
        count: 5,
        maxIterations: 10,
        steps: [],
      },
    };

    const input = {
      schema: {},
      data: {},
    };

    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.iterationCount).toBe(5);
  });
});

describe('ApprovalExecutor', () => {
  const executor = new ApprovalExecutor();
  const context: ExecutionContext = {
    legalBasis: {
      authority: 'TEST',
      classification: 'UNCLASSIFIED',
      authorizedUsers: ['test-user'],
    },
    tenantId: 'test-tenant',
    initiatedBy: 'test-user',
    assumptions: [],
  };

  it('should validate approval step', () => {
    const step: ExtendedStepDefinition = {
      id: 'test-approval',
      name: 'Test Approval',
      type: 'core:approval',
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
      approval: {
        message: 'Approve this action',
        requiredApprovers: ['approver1', 'approver2'],
        minApprovals: 1,
      },
    };

    expect(executor.validate(step)).toBe(true);
  });

  it('should execute and return WAITING_APPROVAL', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-approval',
      name: 'Test Approval',
      type: 'core:approval',
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
      approval: {
        message: 'Approve this action',
        requiredApprovers: ['approver1'],
        minApprovals: 1,
      },
    };

    const input = { schema: {}, data: {} };
    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.WAITING_APPROVAL);
    expect(result.output?.data.approvalId).toBeDefined();
  });

  it('should handle approval submission', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-approval',
      name: 'Test Approval',
      type: 'core:approval',
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
      approval: {
        message: 'Approve this action',
        requiredApprovers: ['approver1'],
        minApprovals: 1,
      },
    };

    const input = { schema: {}, data: {} };
    const result = await executor.execute(step, input, context);
    const approvalId = result.output?.data.approvalId;

    // Submit approval
    const approvalRequest = await executor.submitApproval(
      approvalId,
      'approver1',
      'approve'
    );

    expect(approvalRequest.status).toBe('approved');
    expect(approvalRequest.approvals).toHaveLength(1);
  });
});

describe('ServiceCallExecutor', () => {
  const executor = new ServiceCallExecutor();
  const context: ExecutionContext = {
    legalBasis: {
      authority: 'TEST',
      classification: 'UNCLASSIFIED',
      authorizedUsers: ['test-user'],
    },
    tenantId: 'test-tenant',
    initiatedBy: 'test-user',
    assumptions: [],
  };

  it('should validate service call step', () => {
    const step: ExtendedStepDefinition = {
      id: 'test-service-call',
      name: 'Test Service Call',
      type: 'core:service-call',
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
      serviceCall: {
        service: 'http://example.com/api',
        method: 'POST',
        timeoutMs: 5000,
      },
    };

    expect(executor.validate(step)).toBe(true);
  });

  it('should execute service call', async () => {
    const step: ExtendedStepDefinition = {
      id: 'test-service-call',
      name: 'Test Service Call',
      type: 'core:service-call',
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
      serviceCall: {
        service: 'http://example.com/api',
        method: 'POST',
        payload: { data: 'test' },
        timeoutMs: 5000,
        idempotencyKey: 'test-key-123',
      },
    };

    const input = { schema: {}, data: {} };
    const result = await executor.execute(step, input, context);

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.idempotencyKey).toBe('test-key-123');
  });
});
