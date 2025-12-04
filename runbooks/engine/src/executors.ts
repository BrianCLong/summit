/**
 * Standard Step Executors
 *
 * Provides built-in executors for common step types:
 * - call-service: Generic HTTP/gRPC service calls
 * - wait-for-event: Wait for external events
 * - human-approval: Human-in-the-loop approval steps
 * - conditional: If/else branching
 * - loop: Iterative execution with limits
 */

import { v4 as uuidv4 } from 'uuid';
import {
  StepExecutor,
  StepDefinition,
  StepIO,
  ExecutionContext,
  StepResult,
  ExecutionStatus,
  ApprovalDecision,
  Condition,
} from './types';

/**
 * Evaluate a condition against data
 */
export function evaluateCondition(
  condition: Condition,
  data: Record<string, any>
): boolean {
  // Resolve field value using simple dot notation
  const fieldValue = resolveField(condition.field, data);

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value;
    case 'ne':
      return fieldValue !== condition.value;
    case 'gt':
      return fieldValue > condition.value;
    case 'lt':
      return fieldValue < condition.value;
    case 'gte':
      return fieldValue >= condition.value;
    case 'lte':
      return fieldValue <= condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    default:
      throw new Error(`Unknown operator: ${condition.operator}`);
  }
}

/**
 * Resolve field value from data using dot notation
 */
function resolveField(field: string, data: Record<string, any>): any {
  const parts = field.split('.');
  let value: any = data;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Call Service Executor
 *
 * Makes HTTP/gRPC calls to external services with configurable
 * retry, timeout, and idempotency.
 */
export class CallServiceExecutor implements StepExecutor {
  readonly type = 'call-service';

  validate(step: StepDefinition): boolean {
    const { url, method } = step.config;
    if (!url) {
      throw new Error(`call-service step ${step.id} missing required config: url`);
    }
    if (!method) {
      throw new Error(`call-service step ${step.id} missing required config: method`);
    }
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];

    try {
      const { url, method, headers = {}, body, idempotencyKey } = step.config;

      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info' as const,
        stepId: step.id,
        executionId: context.tenantId,
        message: `Calling service: ${method} ${url}`,
        metadata: { url, method },
      });

      // Build request options
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add idempotency key if configured
      if (idempotencyKey) {
        requestHeaders['Idempotency-Key'] = idempotencyKey;
      }

      // Add authorization context
      requestHeaders['X-Tenant-Id'] = context.tenantId;
      requestHeaders['X-Initiated-By'] = context.initiatedBy;

      // Make request
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify({ ...body, ...input.data }) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `Service call failed: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();

      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info' as const,
        stepId: step.id,
        executionId: context.tenantId,
        message: `Service call succeeded: ${response.status}`,
        metadata: { status: response.status },
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.COMPLETED,
        output: {
          schema: step.outputSchema,
          data: responseData,
        },
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    } catch (error) {
      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'error' as const,
        stepId: step.id,
        executionId: context.tenantId,
        message: `Service call failed: ${(error as Error).message}`,
        metadata: { error: (error as Error).stack },
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.FAILED,
        error: error as Error,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    }
  }
}

/**
 * Wait For Event Executor
 *
 * Waits for an external event to occur, with timeout handling.
 * Events are matched by type and optionally by correlation ID.
 */
export class WaitForEventExecutor implements StepExecutor {
  readonly type = 'wait-for-event';
  private eventStore: Map<string, any> = new Map();

  validate(step: StepDefinition): boolean {
    const { eventType } = step.config;
    if (!eventType) {
      throw new Error(
        `wait-for-event step ${step.id} missing required config: eventType`
      );
    }
    return true;
  }

  /**
   * Register an event (called externally when event occurs)
   */
  registerEvent(eventType: string, correlationId: string, data: any): void {
    const key = `${eventType}:${correlationId}`;
    this.eventStore.set(key, data);
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];
    const { eventType, correlationId, timeoutMs = 60000, pollIntervalMs = 1000 } = step.config;

    const effectiveCorrelationId = correlationId || context.tenantId;
    const key = `${eventType}:${effectiveCorrelationId}`;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: `Waiting for event: ${eventType} (correlation: ${effectiveCorrelationId})`,
      metadata: { eventType, correlationId: effectiveCorrelationId },
    });

    const startWaitTime = Date.now();

    // Poll for event
    while (Date.now() - startWaitTime < timeoutMs) {
      if (this.eventStore.has(key)) {
        const eventData = this.eventStore.get(key);
        this.eventStore.delete(key);

        logs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info' as const,
          stepId: step.id,
          executionId: context.tenantId,
          message: `Event received: ${eventType}`,
          metadata: { eventData },
        });

        return {
          stepId: step.id,
          status: ExecutionStatus.COMPLETED,
          output: {
            schema: step.outputSchema,
            data: eventData,
          },
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          attemptNumber: 1,
          evidence: [],
          logs,
        };
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout
    const error = new Error(
      `Timeout waiting for event: ${eventType} (${timeoutMs}ms)`
    );

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'error' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: error.message,
    });

    return {
      stepId: step.id,
      status: ExecutionStatus.FAILED,
      error,
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence: [],
      logs,
    };
  }
}

/**
 * Human Approval Executor
 *
 * Pauses execution and waits for human approval before proceeding.
 * Supports multiple approvers, minimum approval count, and timeout handling.
 */
export class HumanApprovalExecutor implements StepExecutor {
  readonly type = 'human-approval';
  private approvalStore: Map<string, ApprovalDecision[]> = new Map();

  validate(step: StepDefinition): boolean {
    if (!step.approvalConfig) {
      throw new Error(
        `human-approval step ${step.id} missing required approvalConfig`
      );
    }
    const { approvers, minApprovals } = step.approvalConfig;
    if (!approvers || approvers.length === 0) {
      throw new Error(
        `human-approval step ${step.id} must have at least one approver`
      );
    }
    if (minApprovals > approvers.length) {
      throw new Error(
        `human-approval step ${step.id} minApprovals (${minApprovals}) exceeds number of approvers (${approvers.length})`
      );
    }
    return true;
  }

  /**
   * Submit approval decision (called externally)
   */
  submitApproval(
    stepId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    comments?: string
  ): void {
    if (!this.approvalStore.has(stepId)) {
      this.approvalStore.set(stepId, []);
    }

    const approvals = this.approvalStore.get(stepId)!;
    approvals.push({
      approverId,
      decision,
      timestamp: new Date(),
      comments,
    });
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];
    const { approvers, minApprovals, timeoutMs, timeoutAction, prompt } =
      step.approvalConfig!;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: `Awaiting approval from ${minApprovals} of ${approvers.length} approvers`,
      metadata: {
        approvers,
        minApprovals,
        prompt,
      },
    });

    // Check authorization - are the required approvers authorized?
    for (const approver of approvers) {
      if (!context.legalBasis.authorizedUsers.includes(approver)) {
        const error = new Error(
          `Approver ${approver} is not in authorized users list`
        );
        return {
          stepId: step.id,
          status: ExecutionStatus.FAILED,
          error,
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          attemptNumber: 1,
          evidence: [],
          logs,
        };
      }
    }

    const startWaitTime = Date.now();
    const pollIntervalMs = 1000;

    // Poll for approvals
    while (Date.now() - startWaitTime < timeoutMs) {
      const approvals = this.approvalStore.get(step.id) || [];

      // Count approved/rejected
      const approved = approvals.filter((a) => a.decision === 'approved').length;
      const rejected = approvals.filter((a) => a.decision === 'rejected').length;

      // Check if we have enough approvals
      if (approved >= minApprovals) {
        this.approvalStore.delete(step.id);

        logs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info' as const,
          stepId: step.id,
          executionId: context.tenantId,
          message: `Step approved by ${approved} approvers`,
          metadata: { approvals },
        });

        return {
          stepId: step.id,
          status: ExecutionStatus.COMPLETED,
          output: {
            schema: step.outputSchema,
            data: { approved: true, approvals },
          },
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          attemptNumber: 1,
          evidence: [],
          logs,
          approvals,
        };
      }

      // Check if we have enough rejections to fail
      const maxPossibleApprovals = approvers.length - rejected;
      if (maxPossibleApprovals < minApprovals) {
        this.approvalStore.delete(step.id);

        const error = new Error(
          `Step rejected: ${rejected} rejections, cannot reach minimum ${minApprovals} approvals`
        );

        logs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'error' as const,
          stepId: step.id,
          executionId: context.tenantId,
          message: error.message,
          metadata: { approvals },
        });

        return {
          stepId: step.id,
          status: ExecutionStatus.FAILED,
          error,
          startTime,
          endTime: new Date(),
          durationMs: Date.now() - startTime.getTime(),
          attemptNumber: 1,
          evidence: [],
          logs,
          approvals,
        };
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout - handle based on timeoutAction
    this.approvalStore.delete(step.id);

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'warn' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: `Approval timeout after ${timeoutMs}ms, action: ${timeoutAction}`,
    });

    if (timeoutAction === 'approve') {
      return {
        stepId: step.id,
        status: ExecutionStatus.COMPLETED,
        output: {
          schema: step.outputSchema,
          data: { approved: true, autoApproved: true, reason: 'timeout' },
        },
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    } else {
      // 'reject' or 'fail'
      const error = new Error(`Approval timeout: ${timeoutMs}ms`);
      return {
        stepId: step.id,
        status: ExecutionStatus.FAILED,
        error,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
      };
    }
  }
}

/**
 * Conditional Executor
 *
 * Evaluates conditions and executes different branches based on the result.
 * This is a meta-executor that delegates to other executors.
 */
export class ConditionalExecutor implements StepExecutor {
  readonly type = 'conditional';

  validate(step: StepDefinition): boolean {
    const { condition, trueBranch, falseBranch } = step.config;
    if (!condition) {
      throw new Error(
        `conditional step ${step.id} missing required config: condition`
      );
    }
    if (!trueBranch && !falseBranch) {
      throw new Error(
        `conditional step ${step.id} must have at least one branch (trueBranch or falseBranch)`
      );
    }
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];
    const { condition, trueBranch, falseBranch } = step.config;

    // Evaluate condition
    const conditionResult = evaluateCondition(condition, input.data);

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: `Condition evaluated to: ${conditionResult}`,
      metadata: { condition, result: conditionResult },
    });

    const selectedBranch = conditionResult ? trueBranch : falseBranch;

    if (!selectedBranch) {
      // No branch to execute
      return {
        stepId: step.id,
        status: ExecutionStatus.COMPLETED,
        output: {
          schema: step.outputSchema,
          data: { condition: conditionResult, executed: false },
        },
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence: [],
        logs,
        skipped: true,
        skipReason: `No ${conditionResult ? 'true' : 'false'} branch configured`,
      };
    }

    // Return metadata about which branch would be executed
    // (actual execution would be handled by the DAG executor)
    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: step.outputSchema,
        data: {
          condition: conditionResult,
          branch: conditionResult ? 'trueBranch' : 'falseBranch',
          nextStepId: selectedBranch,
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence: [],
      logs,
    };
  }
}

/**
 * Loop Executor
 *
 * Iterates over a collection or condition with safety limits.
 * This is a meta-executor that tracks iteration state.
 */
export class LoopExecutor implements StepExecutor {
  readonly type = 'loop';

  validate(step: StepDefinition): boolean {
    if (!step.loopConfig) {
      throw new Error(`loop step ${step.id} missing required loopConfig`);
    }
    const { maxIterations } = step.loopConfig;
    if (!maxIterations || maxIterations < 1) {
      throw new Error(
        `loop step ${step.id} must have maxIterations >= 1`
      );
    }
    if (maxIterations > 1000) {
      throw new Error(
        `loop step ${step.id} maxIterations too high (${maxIterations}), max allowed is 1000`
      );
    }
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs = [];
    const { maxIterations, iterateOver, continueWhile } = step.loopConfig!;
    const { bodyStepId } = step.config;

    if (!bodyStepId) {
      throw new Error(`loop step ${step.id} missing config: bodyStepId`);
    }

    // Determine iteration count
    let iterations = 0;
    let items: any[] = [];

    if (iterateOver) {
      // Iterate over array
      items = resolveField(iterateOver, input.data);
      if (!Array.isArray(items)) {
        throw new Error(
          `loop step ${step.id}: iterateOver field "${iterateOver}" is not an array`
        );
      }
      iterations = Math.min(items.length, maxIterations);
    } else if (continueWhile) {
      // Iterate while condition is true
      let currentIteration = 0;
      while (
        currentIteration < maxIterations &&
        evaluateCondition(continueWhile, input.data)
      ) {
        currentIteration++;
      }
      iterations = currentIteration;
    } else {
      // Fixed iteration count
      iterations = maxIterations;
    }

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info' as const,
      stepId: step.id,
      executionId: context.tenantId,
      message: `Loop will execute ${iterations} iterations (max: ${maxIterations})`,
      metadata: { iterations, maxIterations },
    });

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: step.outputSchema,
        data: {
          iterations,
          maxIterations,
          bodyStepId,
          items: items.slice(0, iterations),
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence: [],
      logs,
    };
  }
}
