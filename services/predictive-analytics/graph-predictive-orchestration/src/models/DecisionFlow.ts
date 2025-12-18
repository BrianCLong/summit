import { z } from 'zod';
import type { TriggerRule, Prediction } from './PredictionBinding';

// Enums
export enum FlowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum ExecutionOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

// Zod Schemas
export const GraphContextSchema = z.object({
  nodeProperties: z.record(z.any()),
  neighborhoodSize: z.number().int(),
  pathways: z.array(z.string()),
});

export const FlowContextSchema = z.object({
  prediction: z.any(), // Reference to Prediction type
  graphContext: GraphContextSchema,
});

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  policy: z.string(),
});

export const ExecutionStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.nativeEnum(StepStatus),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  result: z.any().optional(),
});

export const FlowExecutionSchema = z.object({
  startedAt: z.date(),
  completedAt: z.date().optional(),
  steps: z.array(ExecutionStepSchema),
  outcome: z.nativeEnum(ExecutionOutcome),
});

export const DecisionFlowSchema = z.object({
  id: z.string(),
  bindingId: z.string(),
  triggeredBy: z.any(), // Reference to TriggerRule type
  workflowTemplate: z.string(),
  status: z.nativeEnum(FlowStatus),
  context: FlowContextSchema,
  policyDecision: PolicyDecisionSchema,
  execution: FlowExecutionSchema.optional(),
  createdAt: z.date(),
});

// TypeScript Types
export type GraphContext = z.infer<typeof GraphContextSchema>;
export type FlowContext = z.infer<typeof FlowContextSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type FlowExecution = z.infer<typeof FlowExecutionSchema>;
export type DecisionFlow = z.infer<typeof DecisionFlowSchema>;

// Input Types
export interface CreateFlowInput {
  bindingId: string;
  triggeredBy: TriggerRule;
  context: {
    prediction: Prediction;
    graphContext: GraphContext;
  };
}

// Model Class
export class DecisionFlowModel {
  private flows: Map<string, DecisionFlow> = new Map();

  /**
   * Create a new decision flow
   */
  create(input: CreateFlowInput, policyDecision: PolicyDecision): DecisionFlow {
    const id = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const flow: DecisionFlow = {
      id,
      bindingId: input.bindingId,
      triggeredBy: input.triggeredBy,
      workflowTemplate: input.triggeredBy.workflowTemplate,
      status: policyDecision.allowed ? FlowStatus.PENDING : FlowStatus.FAILED,
      context: input.context,
      policyDecision,
      createdAt: now,
    };

    // Validate with Zod (partial validation to avoid circular refs)
    const validatedFlow = {
      ...flow,
      triggeredBy: input.triggeredBy,
      context: {
        ...flow.context,
        prediction: input.context.prediction,
      },
    };

    this.flows.set(id, flow);
    return flow;
  }

  /**
   * Get flow by ID
   */
  getById(id: string): DecisionFlow | undefined {
    return this.flows.get(id);
  }

  /**
   * Get flows by binding ID
   */
  getByBindingId(bindingId: string): DecisionFlow[] {
    return Array.from(this.flows.values()).filter(
      (f) => f.bindingId === bindingId,
    );
  }

  /**
   * Get active flows with filters
   */
  getActiveFlows(filters?: {
    status?: FlowStatus;
    workflowTemplate?: string;
    limit?: number;
    offset?: number;
  }): DecisionFlow[] {
    let results = Array.from(this.flows.values());

    if (filters?.status) {
      results = results.filter((f) => f.status === filters.status);
    }

    if (filters?.workflowTemplate) {
      results = results.filter(
        (f) => f.workflowTemplate === filters.workflowTemplate,
      );
    }

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Start flow execution
   */
  startExecution(id: string): boolean {
    const flow = this.flows.get(id);
    if (!flow || flow.status !== FlowStatus.PENDING) {
      return false;
    }

    flow.status = FlowStatus.RUNNING;
    flow.execution = {
      startedAt: new Date(),
      steps: [],
      outcome: ExecutionOutcome.SUCCESS, // Will be updated as steps execute
    };

    return true;
  }

  /**
   * Add execution step
   */
  addStep(flowId: string, step: Omit<ExecutionStep, 'id'>): ExecutionStep | undefined {
    const flow = this.flows.get(flowId);
    if (!flow || !flow.execution) {
      return undefined;
    }

    const stepId = `step_${flowId}_${flow.execution.steps.length}`;
    const fullStep: ExecutionStep = {
      id: stepId,
      ...step,
    };

    flow.execution.steps.push(fullStep);
    return fullStep;
  }

  /**
   * Update step status
   */
  updateStep(
    flowId: string,
    stepId: string,
    status: StepStatus,
    result?: any,
  ): boolean {
    const flow = this.flows.get(flowId);
    if (!flow || !flow.execution) {
      return false;
    }

    const step = flow.execution.steps.find((s) => s.id === stepId);
    if (!step) {
      return false;
    }

    step.status = status;
    if (status === StepStatus.COMPLETED || status === StepStatus.FAILED) {
      step.completedAt = new Date();
    }
    if (result !== undefined) {
      step.result = result;
    }

    return true;
  }

  /**
   * Complete flow execution
   */
  completeExecution(id: string, outcome: ExecutionOutcome): boolean {
    const flow = this.flows.get(id);
    if (!flow || !flow.execution) {
      return false;
    }

    flow.status = outcome === ExecutionOutcome.SUCCESS
      ? FlowStatus.COMPLETED
      : FlowStatus.FAILED;
    flow.execution.completedAt = new Date();
    flow.execution.outcome = outcome;

    return true;
  }

  /**
   * Cancel a flow
   */
  cancel(id: string): boolean {
    const flow = this.flows.get(id);
    if (!flow || flow.status === FlowStatus.COMPLETED) {
      return false;
    }

    flow.status = FlowStatus.FAILED;
    if (flow.execution) {
      flow.execution.completedAt = new Date();
      flow.execution.outcome = ExecutionOutcome.FAILURE;

      // Mark pending steps as skipped
      flow.execution.steps.forEach((step) => {
        if (step.status === StepStatus.PENDING || step.status === StepStatus.RUNNING) {
          step.status = StepStatus.SKIPPED;
          step.completedAt = new Date();
        }
      });
    }

    return true;
  }

  /**
   * Get all flows (for internal use)
   */
  getAll(): DecisionFlow[] {
    return Array.from(this.flows.values());
  }

  /**
   * Delete flow (for testing)
   */
  delete(id: string): boolean {
    return this.flows.delete(id);
  }

  /**
   * Clear all flows (for testing)
   */
  clear(): void {
    this.flows.clear();
  }
}
