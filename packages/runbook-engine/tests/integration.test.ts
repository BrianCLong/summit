/**
 * Integration tests - End-to-end runbook execution
 */

import {
  RunbookEngine,
  RunbookDefinition,
  StepExecutor,
  StepDefinition,
  StepIO,
  ExecutionContext,
  StepResult,
  ExecutionStatus,
  ConditionalExecutor,
  LoopExecutor,
  ApprovalExecutor,
  ServiceCallExecutor,
} from '../src';

// Mock step executor for testing
class TestStepExecutor implements StepExecutor {
  readonly type = 'test:mock';

  validate(step: StepDefinition): boolean {
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: {},
        data: {
          result: 'success',
          input: input.data,
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence: [],
      logs: [],
    };
  }
}

describe('Integration Tests', () => {
  let engine: RunbookEngine;
  const context: ExecutionContext = {
    legalBasis: {
      authority: 'TEST',
      classification: 'UNCLASSIFIED',
      authorizedUsers: ['test-user'],
    },
    tenantId: 'test-tenant',
    initiatedBy: 'test-user',
    assumptions: ['Test execution'],
  };

  beforeEach(() => {
    engine = new RunbookEngine({
      maxConcurrentSteps: 5,
      defaultRetryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      },
      storageBackend: 'memory',
      detailedLogging: true,
    });

    // Register executors
    engine.registerExecutor(new TestStepExecutor());
    engine.registerExecutor(new ConditionalExecutor());
    engine.registerExecutor(new LoopExecutor());
    engine.registerExecutor(new ApprovalExecutor());
    engine.registerExecutor(new ServiceCallExecutor());
  });

  it('should execute simple runbook end-to-end', async () => {
    const runbook: RunbookDefinition = {
      id: 'simple-runbook',
      name: 'Simple Runbook',
      version: '1.0.0',
      description: 'Simple test runbook',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
        {
          id: 'step2',
          name: 'Step 2',
          type: 'test:mock',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
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

    engine.registerRunbook(runbook);

    const executionId = await engine.startRunbook(runbook.id, context, {
      testInput: 'value',
    });

    // Wait for execution to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const execution = await engine.getStatus(executionId);

    expect(execution).toBeDefined();
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.stepResults.size).toBe(2);
  });

  it('should execute parallel steps', async () => {
    const runbook: RunbookDefinition = {
      id: 'parallel-runbook',
      name: 'Parallel Runbook',
      version: '1.0.0',
      description: 'Test parallel execution',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
        {
          id: 'step2',
          name: 'Step 2',
          type: 'test:mock',
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
        {
          id: 'step3',
          name: 'Step 3',
          type: 'test:mock',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1', 'step2'],
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

    engine.registerRunbook(runbook);

    const executionId = await engine.startRunbook(runbook.id, context);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const execution = await engine.getStatus(executionId);

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.stepResults.size).toBe(3);
  });

  it('should support pause and resume', async () => {
    const runbook: RunbookDefinition = {
      id: 'pausable-runbook',
      name: 'Pausable Runbook',
      version: '1.0.0',
      description: 'Test pause/resume',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
      defaultRetryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 1,
      },
    };

    engine.registerRunbook(runbook);

    const executionId = await engine.startRunbook(runbook.id, context);

    // Let it start
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Pause
    await engine.pauseExecution(executionId);

    let execution = await engine.getStatus(executionId);
    expect(execution?.status).toBe(ExecutionStatus.PAUSED);

    // Resume
    await engine.resumeExecution(executionId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    execution = await engine.getStatus(executionId);
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('should support cancellation', async () => {
    const runbook: RunbookDefinition = {
      id: 'cancellable-runbook',
      name: 'Cancellable Runbook',
      version: '1.0.0',
      description: 'Test cancellation',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
      defaultRetryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 1,
      },
    };

    engine.registerRunbook(runbook);

    const executionId = await engine.startRunbook(runbook.id, context);

    // Let it start
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Cancel
    await engine.cancelExecution(executionId, 'Test cancellation');

    const execution = await engine.getStatus(executionId);
    expect(execution?.status).toBe(ExecutionStatus.CANCELLED);
  });

  it('should track execution stats', async () => {
    const runbook: RunbookDefinition = {
      id: 'stats-runbook',
      name: 'Stats Runbook',
      version: '1.0.0',
      description: 'Test stats tracking',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
        {
          id: 'step2',
          name: 'Step 2',
          type: 'test:mock',
          inputSchema: {},
          outputSchema: {},
          dependsOn: ['step1'],
          config: {},
          retryPolicy: {
            maxAttempts: 1,
            initialDelayMs: 1000,
            maxDelayMs: 1000,
            backoffMultiplier: 1,
          },
        },
      ],
      defaultRetryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 1,
      },
    };

    engine.registerRunbook(runbook);

    const executionId = await engine.startRunbook(runbook.id, context);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const stats = await engine.getExecutionStats(executionId);

    expect(stats.totalSteps).toBe(2);
    expect(stats.completedSteps).toBe(2);
    expect(stats.failedSteps).toBe(0);
    expect(stats.progress).toBe(100);
  });

  it('should prevent duplicate executions with idempotency', async () => {
    const runbook: RunbookDefinition = {
      id: 'idempotent-runbook',
      name: 'Idempotent Runbook',
      version: '1.0.0',
      description: 'Test idempotency',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'test:mock',
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
      defaultRetryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 1,
      },
    };

    engine.registerRunbook(runbook);

    const input = { testValue: 'same-input' };

    const executionId1 = await engine.startRunbook(runbook.id, context, input);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Try to start again with same input
    const executionId2 = await engine.startRunbook(runbook.id, context, input);

    // Should return same execution ID
    expect(executionId2).toBe(executionId1);
  });
});
