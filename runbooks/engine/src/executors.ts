/**
 * Built-in Step Executors
 *
 * Provides executors for common step types:
 * - Conditional branching (if/else)
 * - Loops (for_each, while, count)
 * - Human approvals
 * - Wait for events
 * - Service calls (HTTP/gRPC)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  StepExecutor,
  StepDefinition,
  StepIO,
  ExecutionContext,
  StepResult,
  ExecutionStatus,
  ExtendedStepDefinition,
  Condition,
  ApprovalRequest,
  RunbookLogEntry,
  Evidence,
} from './types';

/**
 * Evaluates a condition
 */
export class ConditionEvaluator {
  /**
   * Evaluate a condition against data
   */
  static evaluate(condition: Condition, data: Record<string, any>): boolean {
    const leftValue = this.resolveValue(condition.left, data);
    const rightValue = condition.right;

    switch (condition.operator) {
      case 'eq':
        return leftValue === rightValue;
      case 'ne':
        return leftValue !== rightValue;
      case 'gt':
        return leftValue > rightValue;
      case 'gte':
        return leftValue >= rightValue;
      case 'lt':
        return leftValue < rightValue;
      case 'lte':
        return leftValue <= rightValue;
      case 'in':
        return Array.isArray(rightValue) && rightValue.includes(leftValue);
      case 'not_in':
        return Array.isArray(rightValue) && !rightValue.includes(leftValue);
      case 'exists':
        return leftValue !== undefined && leftValue !== null;
      case 'not_exists':
        return leftValue === undefined || leftValue === null;
      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }

  /**
   * Resolve a value from data (supports dot notation)
   */
  private static resolveValue(path: string, data: Record<string, any>): any {
    if (path.startsWith('$')) {
      // Reference to data
      const parts = path.substring(1).split('.');
      let value: any = data;
      for (const part of parts) {
        if (value === undefined || value === null) {
          return undefined;
        }
        value = value[part];
      }
      return value;
    }
    // Literal value
    return path;
  }
}

/**
 * Conditional Branching Executor (if/else)
 */
export class ConditionalExecutor implements StepExecutor {
  readonly type = 'core:conditional';

  validate(step: StepDefinition): boolean {
    const extStep = step as ExtendedStepDefinition;
    if (!extStep.branches || extStep.branches.length === 0) {
      throw new Error(`Conditional step ${step.id} must have at least one branch`);
    }
    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs: RunbookLogEntry[] = [];
    const evidence: Evidence[] = [];

    const extStep = step as ExtendedStepDefinition;
    const branches = extStep.branches!;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Evaluating ${branches.length} conditional branches`,
    });

    // Evaluate conditions
    let matchedBranch = null;
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const result = ConditionEvaluator.evaluate(branch.condition, input.data);

      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'debug',
        stepId: step.id,
        executionId: '',
        message: `Branch ${i}: condition evaluated to ${result}`,
        metadata: { condition: branch.condition },
      });

      if (result) {
        matchedBranch = branch;
        break;
      }
    }

    if (!matchedBranch) {
      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info',
        stepId: step.id,
        executionId: '',
        message: 'No branch condition matched, skipping',
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.SKIPPED,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence,
        logs,
      };
    }

    // Return reference to steps that should be executed
    // Note: Actual execution will be handled by DAGExecutor
    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Branch matched, will execute ${matchedBranch.steps.length} steps`,
    });

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: {},
        data: {
          matchedBranch: branches.indexOf(matchedBranch),
          stepsToExecute: matchedBranch.steps.map(s => s.id),
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence,
      logs,
    };
  }
}

/**
 * Loop Executor (for_each, while, count)
 */
export class LoopExecutor implements StepExecutor {
  readonly type = 'core:loop';

  validate(step: StepDefinition): boolean {
    const extStep = step as ExtendedStepDefinition;
    if (!extStep.loop) {
      throw new Error(`Loop step ${step.id} must have loop configuration`);
    }

    const loop = extStep.loop;
    if (loop.maxIterations <= 0 || loop.maxIterations > 10000) {
      throw new Error(
        `Loop step ${step.id} maxIterations must be between 1 and 10000`
      );
    }

    if (loop.type === 'for_each' && !loop.collection) {
      throw new Error(`for_each loop ${step.id} must specify collection`);
    }

    if (loop.type === 'while' && !loop.condition) {
      throw new Error(`while loop ${step.id} must specify condition`);
    }

    if (loop.type === 'count' && (!loop.count || loop.count <= 0)) {
      throw new Error(`count loop ${step.id} must specify positive count`);
    }

    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs: RunbookLogEntry[] = [];
    const evidence: Evidence[] = [];

    const extStep = step as ExtendedStepDefinition;
    const loop = extStep.loop!;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Starting ${loop.type} loop (max iterations: ${loop.maxIterations})`,
    });

    const iterations: any[] = [];
    let iterationCount = 0;

    switch (loop.type) {
      case 'for_each': {
        const collection = this.resolveCollection(loop.collection!, input.data);
        if (!Array.isArray(collection)) {
          throw new Error(`Collection ${loop.collection} is not an array`);
        }

        for (const item of collection) {
          if (iterationCount >= loop.maxIterations) {
            logs.push({
              id: uuidv4(),
              timestamp: new Date(),
              level: 'warn',
              stepId: step.id,
              executionId: '',
              message: `Reached max iterations limit (${loop.maxIterations})`,
            });
            break;
          }

          iterations.push({ index: iterationCount, item });
          iterationCount++;
        }
        break;
      }

      case 'while': {
        while (
          iterationCount < loop.maxIterations &&
          ConditionEvaluator.evaluate(loop.condition!, input.data)
        ) {
          iterations.push({ index: iterationCount });
          iterationCount++;
        }

        if (iterationCount >= loop.maxIterations) {
          logs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'warn',
            stepId: step.id,
            executionId: '',
            message: `Reached max iterations limit (${loop.maxIterations})`,
          });
        }
        break;
      }

      case 'count': {
        const count = Math.min(loop.count!, loop.maxIterations);
        for (let i = 0; i < count; i++) {
          iterations.push({ index: i });
          iterationCount++;
        }
        break;
      }
    }

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Will execute ${iterationCount} iterations`,
    });

    return {
      stepId: step.id,
      status: ExecutionStatus.COMPLETED,
      output: {
        schema: {},
        data: {
          iterations,
          iterationCount,
          stepsToExecute: loop.steps.map(s => s.id),
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence,
      logs,
    };
  }

  private resolveCollection(path: string, data: Record<string, any>): any {
    if (path.startsWith('$')) {
      const parts = path.substring(1).split('.');
      let value: any = data;
      for (const part of parts) {
        if (value === undefined || value === null) {
          return undefined;
        }
        value = value[part];
      }
      return value;
    }
    return path;
  }
}

/**
 * Approval Executor - for human-in-the-loop approvals
 */
export class ApprovalExecutor implements StepExecutor {
  readonly type = 'core:approval';

  private approvalRequests: Map<string, ApprovalRequest> = new Map();

  validate(step: StepDefinition): boolean {
    const extStep = step as ExtendedStepDefinition;
    if (!extStep.approval) {
      throw new Error(`Approval step ${step.id} must have approval configuration`);
    }

    const approval = extStep.approval;
    if (!approval.requiredApprovers || approval.requiredApprovers.length === 0) {
      throw new Error(`Approval step ${step.id} must specify required approvers`);
    }

    return true;
  }

  async execute(
    step: StepDefinition,
    input: StepIO,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const logs: RunbookLogEntry[] = [];
    const evidence: Evidence[] = [];

    const extStep = step as ExtendedStepDefinition;
    const approvalConfig = extStep.approval!;

    // Create approval request
    const approvalId = uuidv4();
    const approvalRequest: ApprovalRequest = {
      id: approvalId,
      executionId: context.tenantId, // Will be updated with real execution ID
      stepId: step.id,
      message: approvalConfig.message,
      requiredApprovers: approvalConfig.requiredApprovers,
      minApprovals: approvalConfig.minApprovals || 1,
      timeoutMs: approvalConfig.timeoutMs,
      requestedAt: new Date(),
      expiresAt: approvalConfig.timeoutMs
        ? new Date(Date.now() + approvalConfig.timeoutMs)
        : undefined,
      approvals: [],
      status: 'pending',
    };

    this.approvalRequests.set(approvalId, approvalRequest);

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Approval requested: ${approvalConfig.message}`,
      metadata: {
        approvalId,
        requiredApprovers: approvalConfig.requiredApprovers,
        minApprovals: approvalRequest.minApprovals,
      },
    });

    // Note: In real implementation, this would integrate with approval service
    // For now, return WAITING_APPROVAL status
    return {
      stepId: step.id,
      status: ExecutionStatus.WAITING_APPROVAL,
      output: {
        schema: {},
        data: {
          approvalId,
          status: 'pending',
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence,
      logs,
    };
  }

  /**
   * Submit an approval decision
   */
  async submitApproval(
    approvalId: string,
    approverId: string,
    decision: 'approve' | 'reject',
    comment?: string
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request is not pending: ${request.status}`);
    }

    // Check if approver is authorized
    if (!request.requiredApprovers.includes(approverId)) {
      throw new Error(
        `User ${approverId} is not authorized to approve this request`
      );
    }

    // Add approval
    request.approvals.push({
      approverId,
      decision,
      comment,
      approvedAt: new Date(),
    });

    // Check if approval threshold met
    const approvals = request.approvals.filter(a => a.decision === 'approve').length;
    const rejections = request.approvals.filter(a => a.decision === 'reject').length;

    if (rejections > 0) {
      request.status = 'rejected';
    } else if (approvals >= request.minApprovals) {
      request.status = 'approved';
    }

    return request;
  }

  /**
   * Get approval request
   */
  getApprovalRequest(approvalId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(approvalId);
  }
}

/**
 * Event Wait Executor - waits for external events
 */
export class EventWaitExecutor implements StepExecutor {
  readonly type = 'core:wait-event';

  private eventHandlers: Map<string, (event: any) => void> = new Map();

  validate(step: StepDefinition): boolean {
    const extStep = step as ExtendedStepDefinition;
    if (!extStep.event) {
      throw new Error(`Event step ${step.id} must have event configuration`);
    }

    const event = extStep.event;
    if (!event.source || !event.type || !event.correlationId) {
      throw new Error(
        `Event step ${step.id} must specify source, type, and correlationId`
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
    const logs: RunbookLogEntry[] = [];
    const evidence: Evidence[] = [];

    const extStep = step as ExtendedStepDefinition;
    const eventConfig = extStep.event!;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Waiting for event: ${eventConfig.type} from ${eventConfig.source}`,
      metadata: {
        correlationId: eventConfig.correlationId,
        timeoutMs: eventConfig.timeoutMs,
      },
    });

    // Note: In real implementation, this would integrate with event bus
    // For now, return WAITING_EVENT status
    return {
      stepId: step.id,
      status: ExecutionStatus.WAITING_EVENT,
      output: {
        schema: {},
        data: {
          eventConfig,
          status: 'waiting',
        },
      },
      startTime,
      endTime: new Date(),
      durationMs: Date.now() - startTime.getTime(),
      attemptNumber: 1,
      evidence,
      logs,
    };
  }

  /**
   * Register event handler
   */
  registerEventHandler(correlationId: string, handler: (event: any) => void): void {
    this.eventHandlers.set(correlationId, handler);
  }

  /**
   * Handle incoming event
   */
  async handleEvent(event: any): Promise<void> {
    const correlationId = event.correlationId;
    const handler = this.eventHandlers.get(correlationId);
    if (handler) {
      handler(event);
    }
  }
}

/**
 * Service Call Executor - calls external services via HTTP/gRPC
 */
export class ServiceCallExecutor implements StepExecutor {
  readonly type = 'core:service-call';

  validate(step: StepDefinition): boolean {
    const extStep = step as ExtendedStepDefinition;
    if (!extStep.serviceCall) {
      throw new Error(`Service call step ${step.id} must have serviceCall configuration`);
    }

    const serviceCall = extStep.serviceCall;
    if (!serviceCall.service || !serviceCall.method) {
      throw new Error(
        `Service call step ${step.id} must specify service and method`
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
    const logs: RunbookLogEntry[] = [];
    const evidence: Evidence[] = [];

    const extStep = step as ExtendedStepDefinition;
    const serviceCall = extStep.serviceCall!;

    // Generate idempotency key if not provided
    const idempotencyKey =
      serviceCall.idempotencyKey ||
      `${context.tenantId}:${step.id}:${Date.now()}`;

    logs.push({
      id: uuidv4(),
      timestamp: new Date(),
      level: 'info',
      stepId: step.id,
      executionId: '',
      message: `Calling service: ${serviceCall.method} ${serviceCall.service}`,
      metadata: {
        idempotencyKey,
        timeoutMs: serviceCall.timeoutMs,
      },
    });

    try {
      // Note: In real implementation, this would make actual HTTP/gRPC calls
      // For now, simulate the call
      const response = await this.makeServiceCall(serviceCall, idempotencyKey);

      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info',
        stepId: step.id,
        executionId: '',
        message: `Service call succeeded`,
        metadata: { response },
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.COMPLETED,
        output: {
          schema: {},
          data: response,
        },
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence,
        logs,
      };
    } catch (error) {
      logs.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'error',
        stepId: step.id,
        executionId: '',
        message: `Service call failed: ${(error as Error).message}`,
      });

      return {
        stepId: step.id,
        status: ExecutionStatus.FAILED,
        error: error as Error,
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        attemptNumber: 1,
        evidence,
        logs,
      };
    }
  }

  private async makeServiceCall(
    config: any,
    idempotencyKey: string
  ): Promise<any> {
    // TODO: Implement actual HTTP/gRPC client
    // For now, return mock response
    return {
      status: 'success',
      idempotencyKey,
      data: {},
    };
  }
}
