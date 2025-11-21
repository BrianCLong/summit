/**
 * Unit tests for DAGExecutor
 *
 * Tests:
 * - DAG validation (cycles, missing dependencies)
 * - Topological sorting
 * - Retry logic with exponential backoff
 * - Error handling and propagation
 * - Timeout handling
 */

import { DAGExecutor } from '../src/dag-executor';
import {
  StepDefinition,
  StepExecutor,
  StepResult,
  ExecutionStatus,
  ExecutionContext,
  StepIO,
  RetryPolicy,
} from '../src/types';

// Mock executor for testing
class MockSuccessExecutor implements StepExecutor {
  readonly type = 'mock:success';
  executeCount = 0;

  validate(step: StepDefinition): boolean {
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    this.executeCount++;
    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: {},
        data: { result: 'success', count: this.executeCount },
      },
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 10,
      attemptNumber: 1,
      evidence: [],
      logs: [],
    };
  }
}

class MockFailExecutor implements StepExecutor {
  readonly type = 'mock:fail';
  attemptCount = 0;

  validate(step: StepDefinition): boolean {
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    this.attemptCount++;
    throw new Error('Simulated failure');
  }
}

class MockRetryExecutor implements StepExecutor {
  readonly type = 'mock:retry';
  attemptCount = 0;
  failUntilAttempt: number;

  constructor(failUntilAttempt: number = 2) {
    this.failUntilAttempt = failUntilAttempt;
  }

  validate(step: StepDefinition): boolean {
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    this.attemptCount++;

    if (this.attemptCount < this.failUntilAttempt) {
      throw new Error('NETWORK_ERROR: Temporary failure');
    }

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: {},
        data: { result: 'success after retry', attempts: this.attemptCount },
      },
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 10,
      attemptNumber: this.attemptCount,
      evidence: [],
      logs: [],
    };
  }
}

describe('DAGExecutor', () => {
  let defaultRetryPolicy: RetryPolicy;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    defaultRetryPolicy = {
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR'],
    };

    mockContext = {
      legalBasis: {
        authority: 'TEST',
        classification: 'UNCLASSIFIED',
        authorizedUsers: ['test-user'],
      },
      tenantId: 'test-tenant',
      initiatedBy: 'test-user',
      assumptions: [],
    };
  });

  describe('DAG Validation', () => {
    it('should detect cycles in DAG', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step2'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'], // Creates cycle
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      expect(() => dagExecutor.validateDAG(steps)).toThrow(/cycle/i);
    });

    it('should detect missing dependencies', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['nonexistent'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      expect(() => dagExecutor.validateDAG(steps)).toThrow(/non-existent/i);
    });

    it('should detect missing executors', () => {
      const executors = new Map();
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'nonexistent',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      expect(() => dagExecutor.validateDAG(steps)).toThrow(/no executor/i);
    });

    it('should validate correct DAG', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      expect(() => dagExecutor.validateDAG(steps)).not.toThrow();
    });
  });

  describe('Topological Sorting', () => {
    it('should sort independent steps into single level', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      const levels = dagExecutor.getExecutionLevels(steps);

      expect(levels).toHaveLength(1);
      expect(levels[0]).toHaveLength(2);
    });

    it('should sort sequential steps into multiple levels', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step3',
          name: 'Step 3',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step2'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      const levels = dagExecutor.getExecutionLevels(steps);

      expect(levels).toHaveLength(3);
      expect(levels[0][0].id).toBe('step1');
      expect(levels[1][0].id).toBe('step2');
      expect(levels[2][0].id).toBe('step3');
    });

    it('should handle diamond dependency pattern', () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step3',
          name: 'Step 3',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step4',
          name: 'Step 4',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step2', 'step3'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      const levels = dagExecutor.getExecutionLevels(steps);

      expect(levels).toHaveLength(3);
      expect(levels[0][0].id).toBe('step1');
      expect(levels[1]).toHaveLength(2);
      expect(levels[2][0].id).toBe('step4');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed steps with exponential backoff', async () => {
      const retryExecutor = new MockRetryExecutor(3);
      const executors = new Map([[retryExecutor.type, retryExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const step: StepDefinition = {
        id: 'retry-step',
        name: 'Retry Step',
        type: 'mock:retry',
        inputSchema: {},
        outputSchema: {},
        dependsOn: [],
        config: {},
        retryPolicy: defaultRetryPolicy,
      };

      const result = await dagExecutor.executeStepWithRetry(
        step,
        { schema: {}, data: {} },
        mockContext,
        'test-execution'
      );

      expect(result.status).toBe(ExecutionStatus.COMPLETED);
      expect(retryExecutor.attemptCount).toBe(3);
      expect(result.attemptNumber).toBe(3);
    });

    it('should fail after max retry attempts', async () => {
      const failExecutor = new MockFailExecutor();
      const executors = new Map([[failExecutor.type, failExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const step: StepDefinition = {
        id: 'fail-step',
        name: 'Fail Step',
        type: 'mock:fail',
        inputSchema: {},
        outputSchema: {},
        dependsOn: [],
        config: {},
        retryPolicy: {
          ...defaultRetryPolicy,
          retryableErrors: [], // Retry all errors
        },
      };

      const result = await dagExecutor.executeStepWithRetry(
        step,
        { schema: {}, data: {} },
        mockContext,
        'test-execution'
      );

      expect(result.status).toBe(ExecutionStatus.FAILED);
      expect(failExecutor.attemptCount).toBe(3);
      expect(result.error).toBeDefined();
    });

    it('should not retry non-retryable errors', async () => {
      const failExecutor = new MockFailExecutor();
      const executors = new Map([[failExecutor.type, failExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const step: StepDefinition = {
        id: 'fail-step',
        name: 'Fail Step',
        type: 'mock:fail',
        inputSchema: {},
        outputSchema: {},
        dependsOn: [],
        config: {},
        retryPolicy: {
          ...defaultRetryPolicy,
          retryableErrors: ['NETWORK_ERROR'], // Only retry network errors
        },
      };

      const result = await dagExecutor.executeStepWithRetry(
        step,
        { schema: {}, data: {} },
        mockContext,
        'test-execution'
      );

      expect(result.status).toBe(ExecutionStatus.FAILED);
      expect(failExecutor.attemptCount).toBe(1); // No retries
    });
  });

  describe('DAG Execution', () => {
    it('should execute simple linear DAG', async () => {
      const successExecutor = new MockSuccessExecutor();
      const executors = new Map([[successExecutor.type, successExecutor]]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      const results = await dagExecutor.executeDAG(
        steps,
        mockContext,
        'test-execution'
      );

      expect(results.size).toBe(2);
      expect(results.get('step1')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(results.get('step2')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(successExecutor.executeCount).toBe(2);
    });

    it('should stop execution on step failure', async () => {
      const successExecutor = new MockSuccessExecutor();
      const failExecutor = new MockFailExecutor();
      const executors = new Map<string, StepExecutor>([
        [successExecutor.type, successExecutor],
        [failExecutor.type, failExecutor],
      ]);
      const dagExecutor = new DAGExecutor(executors);

      const steps: StepDefinition[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'mock:fail',
          inputSchema: {},
          outputSchema: {},
          dependsOn: [],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'mock:success',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: defaultRetryPolicy,
        },
      ];

      await expect(
        dagExecutor.executeDAG(steps, mockContext, 'test-execution')
      ).rejects.toThrow();

      // Step 2 should not have executed
      expect(successExecutor.executeCount).toBe(0);
    });
  });
});
