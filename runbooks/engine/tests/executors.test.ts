/**
 * Unit tests for Standard Step Executors
 *
 * Tests:
 * - CallServiceExecutor: HTTP calls, idempotency, error handling
 * - WaitForEventExecutor: Event matching, timeout handling
 * - HumanApprovalExecutor: Multi-approver logic, timeout actions
 * - ConditionalExecutor: Condition evaluation, branch selection
 * - LoopExecutor: Iteration limits, safety checks
 */

import {
  CallServiceExecutor,
  WaitForEventExecutor,
  HumanApprovalExecutor,
  ConditionalExecutor,
  LoopExecutor,
  evaluateCondition,
} from '../src/executors';
import {
  StepDefinition,
  ExecutionContext,
  ExecutionStatus,
  RetryPolicy,
  Condition,
} from '../src/types';

// Mock execution context
const createMockContext = (): ExecutionContext => ({
  legalBasis: {
    authority: 'TEST',
    classification: 'UNCLASSIFIED',
    authorizedUsers: ['user1', 'user2', 'user3'],
  },
  tenantId: 'test-tenant',
  initiatedBy: 'user1',
  assumptions: [],
});

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 10,
  maxDelayMs: 100,
  backoffMultiplier: 2,
};

describe('evaluateCondition', () => {
  it('should evaluate equality condition', () => {
    const condition: Condition = {
      field: 'status',
      operator: 'eq',
      value: 'active',
    };

    expect(evaluateCondition(condition, { status: 'active' })).toBe(true);
    expect(evaluateCondition(condition, { status: 'inactive' })).toBe(false);
  });

  it('should evaluate numeric comparison', () => {
    const data = { count: 10 };

    expect(
      evaluateCondition({ field: 'count', operator: 'gt', value: 5 }, data)
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'count', operator: 'lt', value: 15 }, data)
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'count', operator: 'gte', value: 10 }, data)
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'count', operator: 'lte', value: 10 }, data)
    ).toBe(true);
  });

  it('should evaluate in operator', () => {
    const condition: Condition = {
      field: 'status',
      operator: 'in',
      value: ['active', 'pending'],
    };

    expect(evaluateCondition(condition, { status: 'active' })).toBe(true);
    expect(evaluateCondition(condition, { status: 'inactive' })).toBe(false);
  });

  it('should evaluate contains operator', () => {
    const condition: Condition = {
      field: 'message',
      operator: 'contains',
      value: 'error',
    };

    expect(
      evaluateCondition(condition, { message: 'An error occurred' })
    ).toBe(true);
    expect(evaluateCondition(condition, { message: 'Success' })).toBe(false);
  });

  it('should evaluate exists operator', () => {
    const condition: Condition = {
      field: 'optionalField',
      operator: 'exists',
    };

    expect(
      evaluateCondition(condition, { optionalField: 'value' })
    ).toBe(true);
    expect(evaluateCondition(condition, {})).toBe(false);
  });

  it('should handle nested field paths', () => {
    const condition: Condition = {
      field: 'user.status',
      operator: 'eq',
      value: 'active',
    };

    const data = { user: { status: 'active' } };
    expect(evaluateCondition(condition, data)).toBe(true);
  });
});

describe('CallServiceExecutor', () => {
  let executor: CallServiceExecutor;

  beforeEach(() => {
    executor = new CallServiceExecutor();
  });

  it('should validate step configuration', () => {
    const validStep: StepDefinition = {
      id: 'test-call',
      name: 'Test Call',
      type: 'call-service',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        url: 'https://api.example.com/endpoint',
        method: 'POST',
      },
      retryPolicy: defaultRetryPolicy,
    };

    expect(executor.validate(validStep)).toBe(true);
  });

  it('should reject invalid configuration', () => {
    const invalidStep: StepDefinition = {
      id: 'test-call',
      name: 'Test Call',
      type: 'call-service',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {}, // Missing url and method
      retryPolicy: defaultRetryPolicy,
    };

    expect(() => executor.validate(invalidStep)).toThrow(/missing required config/);
  });

  // Note: Actual HTTP tests would require mocking fetch or using a test server
});

describe('WaitForEventExecutor', () => {
  let executor: WaitForEventExecutor;

  beforeEach(() => {
    executor = new WaitForEventExecutor();
  });

  it('should validate step configuration', () => {
    const validStep: StepDefinition = {
      id: 'wait-step',
      name: 'Wait for Event',
      type: 'wait-for-event',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        eventType: 'approval.completed',
      },
      retryPolicy: defaultRetryPolicy,
    };

    expect(executor.validate(validStep)).toBe(true);
  });

  it('should receive registered events', async () => {
    const step: StepDefinition = {
      id: 'wait-step',
      name: 'Wait for Event',
      type: 'wait-for-event',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        eventType: 'test.event',
        correlationId: 'test-123',
        timeoutMs: 5000,
        pollIntervalMs: 100,
      },
      retryPolicy: defaultRetryPolicy,
    };

    // Register event before execution
    executor.registerEvent('test.event', 'test-123', { result: 'success' });

    const result = await executor.execute(
      step,
      { schema: {}, data: {} },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data).toEqual({ result: 'success' });
  });

  it('should timeout if event not received', async () => {
    const step: StepDefinition = {
      id: 'wait-step',
      name: 'Wait for Event',
      type: 'wait-for-event',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        eventType: 'test.event',
        correlationId: 'test-456',
        timeoutMs: 100, // Short timeout
        pollIntervalMs: 50,
      },
      retryPolicy: defaultRetryPolicy,
    };

    const result = await executor.execute(
      step,
      { schema: {}, data: {} },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.FAILED);
    expect(result.error?.message).toContain('Timeout waiting for event');
  });
});

describe('HumanApprovalExecutor', () => {
  let executor: HumanApprovalExecutor;

  beforeEach(() => {
    executor = new HumanApprovalExecutor();
  });

  it('should validate approval configuration', () => {
    const validStep: StepDefinition = {
      id: 'approval-step',
      name: 'Approval Step',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: defaultRetryPolicy,
      approvalConfig: {
        approvers: ['user1', 'user2'],
        minApprovals: 1,
        timeoutMs: 60000,
        timeoutAction: 'fail',
      },
    };

    expect(executor.validate(validStep)).toBe(true);
  });

  it('should reject invalid approval configuration', () => {
    const invalidStep: StepDefinition = {
      id: 'approval-step',
      name: 'Approval Step',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: defaultRetryPolicy,
      approvalConfig: {
        approvers: ['user1'],
        minApprovals: 2, // More than approvers
        timeoutMs: 60000,
        timeoutAction: 'fail',
      },
    };

    expect(() => executor.validate(invalidStep)).toThrow(/minApprovals/);
  });

  it('should approve when minimum approvals reached', async () => {
    const step: StepDefinition = {
      id: 'approval-step',
      name: 'Approval Step',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: defaultRetryPolicy,
      approvalConfig: {
        approvers: ['user1', 'user2'],
        minApprovals: 2,
        timeoutMs: 5000,
        timeoutAction: 'fail',
      },
    };

    // Submit approvals before execution completes
    setTimeout(() => {
      executor.submitApproval(step.id, 'user1', 'approved', 'LGTM');
    }, 100);

    setTimeout(() => {
      executor.submitApproval(step.id, 'user2', 'approved', 'Approved');
    }, 200);

    const result = await executor.execute(
      step,
      { schema: {}, data: {} },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.approved).toBe(true);
    expect(result.approvals).toHaveLength(2);
  });

  it('should reject when too many rejections', async () => {
    const step: StepDefinition = {
      id: 'approval-step',
      name: 'Approval Step',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: defaultRetryPolicy,
      approvalConfig: {
        approvers: ['user1', 'user2', 'user3'],
        minApprovals: 2,
        timeoutMs: 5000,
        timeoutAction: 'fail',
      },
    };

    // Submit rejections
    setTimeout(() => {
      executor.submitApproval(step.id, 'user1', 'rejected', 'No');
      executor.submitApproval(step.id, 'user2', 'rejected', 'No');
    }, 100);

    const result = await executor.execute(
      step,
      { schema: {}, data: {} },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.FAILED);
    expect(result.error?.message).toContain('rejected');
  });

  it('should handle timeout with auto-approve', async () => {
    const step: StepDefinition = {
      id: 'approval-step',
      name: 'Approval Step',
      type: 'human-approval',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {},
      retryPolicy: defaultRetryPolicy,
      approvalConfig: {
        approvers: ['user1', 'user2'],
        minApprovals: 2,
        timeoutMs: 100, // Short timeout
        timeoutAction: 'approve',
      },
    };

    const result = await executor.execute(
      step,
      { schema: {}, data: {} },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.autoApproved).toBe(true);
  });
});

describe('ConditionalExecutor', () => {
  let executor: ConditionalExecutor;

  beforeEach(() => {
    executor = new ConditionalExecutor();
  });

  it('should validate conditional configuration', () => {
    const validStep: StepDefinition = {
      id: 'conditional-step',
      name: 'Conditional Step',
      type: 'conditional',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        condition: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
        trueBranch: 'step-a',
        falseBranch: 'step-b',
      },
      retryPolicy: defaultRetryPolicy,
    };

    expect(executor.validate(validStep)).toBe(true);
  });

  it('should execute true branch', async () => {
    const step: StepDefinition = {
      id: 'conditional-step',
      name: 'Conditional Step',
      type: 'conditional',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        condition: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
        trueBranch: 'step-a',
        falseBranch: 'step-b',
      },
      retryPolicy: defaultRetryPolicy,
    };

    const result = await executor.execute(
      step,
      { schema: {}, data: { status: 'active' } },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.condition).toBe(true);
    expect(result.output?.data.nextStepId).toBe('step-a');
  });

  it('should execute false branch', async () => {
    const step: StepDefinition = {
      id: 'conditional-step',
      name: 'Conditional Step',
      type: 'conditional',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        condition: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
        trueBranch: 'step-a',
        falseBranch: 'step-b',
      },
      retryPolicy: defaultRetryPolicy,
    };

    const result = await executor.execute(
      step,
      { schema: {}, data: { status: 'inactive' } },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.condition).toBe(false);
    expect(result.output?.data.nextStepId).toBe('step-b');
  });

  it('should skip when no branch configured', async () => {
    const step: StepDefinition = {
      id: 'conditional-step',
      name: 'Conditional Step',
      type: 'conditional',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        condition: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
        trueBranch: 'step-a',
        // No false branch
      },
      retryPolicy: defaultRetryPolicy,
    };

    const result = await executor.execute(
      step,
      { schema: {}, data: { status: 'inactive' } },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.skipped).toBe(true);
  });
});

describe('LoopExecutor', () => {
  let executor: LoopExecutor;

  beforeEach(() => {
    executor = new LoopExecutor();
  });

  it('should validate loop configuration', () => {
    const validStep: StepDefinition = {
      id: 'loop-step',
      name: 'Loop Step',
      type: 'loop',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        bodyStepId: 'process-item',
      },
      retryPolicy: defaultRetryPolicy,
      loopConfig: {
        maxIterations: 10,
      },
    };

    expect(executor.validate(validStep)).toBe(true);
  });

  it('should reject excessive max iterations', () => {
    const invalidStep: StepDefinition = {
      id: 'loop-step',
      name: 'Loop Step',
      type: 'loop',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        bodyStepId: 'process-item',
      },
      retryPolicy: defaultRetryPolicy,
      loopConfig: {
        maxIterations: 2000, // Too high
      },
    };

    expect(() => executor.validate(invalidStep)).toThrow(/too high/);
  });

  it('should iterate over array', async () => {
    const step: StepDefinition = {
      id: 'loop-step',
      name: 'Loop Step',
      type: 'loop',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        bodyStepId: 'process-item',
      },
      retryPolicy: defaultRetryPolicy,
      loopConfig: {
        maxIterations: 100,
        iterateOver: 'items',
      },
    };

    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = await executor.execute(
      step,
      { schema: {}, data: { items } },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.iterations).toBe(5);
    expect(result.output?.data.items).toEqual(items);
  });

  it('should respect max iterations', async () => {
    const step: StepDefinition = {
      id: 'loop-step',
      name: 'Loop Step',
      type: 'loop',
      inputSchema: {},
      outputSchema: {},
      dependsOn: [],
      config: {
        bodyStepId: 'process-item',
      },
      retryPolicy: defaultRetryPolicy,
      loopConfig: {
        maxIterations: 3,
        iterateOver: 'items',
      },
    };

    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = await executor.execute(
      step,
      { schema: {}, data: { items } },
      createMockContext()
    );

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.output?.data.iterations).toBe(3); // Capped at maxIterations
  });
});
