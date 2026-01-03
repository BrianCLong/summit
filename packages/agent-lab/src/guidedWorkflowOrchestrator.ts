import crypto from 'crypto';
import { z } from 'zod';
import { GuidedWorkflowBlueprint } from './guidedWorkflowBlueprint';

export type ToolHandler = (input: Record<string, unknown>) => Promise<{
  output: Record<string, unknown>;
  artifacts?: string[];
  debugLog?: string;
}>;

export interface ToolRegistry {
  register(toolId: string, handler: ToolHandler): void;
  get(toolId: string): ToolHandler | undefined;
}

export class InMemoryToolRegistry implements ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  register(toolId: string, handler: ToolHandler) {
    this.handlers.set(toolId, handler);
  }

  get(toolId: string) {
    return this.handlers.get(toolId);
  }
}

export type TraceEventType =
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'TOOL_CALLED'
  | 'TOOL_FAILED'
  | 'DEBUG_NOTE';

export interface TraceEvent {
  id: string;
  timestamp: string;
  type: TraceEventType;
  stepId?: string;
  toolId?: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface WorkflowRunRecord {
  runId: string;
  workflowId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt?: string;
  actionTrace: TraceEvent[];
  artifacts: string[];
  outputs: Record<string, unknown>;
}

export interface OrchestratorOptions {
  maxRetries?: number;
  featureFlags?: {
    guidedWorkflows?: {
      enabled: boolean;
      allowSandboxExec?: boolean;
    };
  };
}

const SafeInputSchema = z.record(z.string(), z.any());

export class GuidedWorkflowOrchestrator {
  private registry: ToolRegistry;
  private options: Required<OrchestratorOptions>;

  constructor(registry: ToolRegistry, options?: OrchestratorOptions) {
    this.registry = registry;
    this.options = {
      maxRetries: options?.maxRetries ?? 2,
      featureFlags: {
        guidedWorkflows: {
          enabled:
            options?.featureFlags?.guidedWorkflows?.enabled ??
            process.env.GUIDED_WORKFLOWS_ENABLED === 'true',
          allowSandboxExec:
            options?.featureFlags?.guidedWorkflows?.allowSandboxExec ?? false,
        },
      },
    };
  }

  async run(
    blueprint: GuidedWorkflowBlueprint,
    initialInputs: Record<string, unknown> = {}
  ): Promise<WorkflowRunRecord> {
    if (!this.options.featureFlags.guidedWorkflows.enabled) {
      throw new Error('guided workflows are disabled by feature flag');
    }

    const run: WorkflowRunRecord = {
      runId: crypto.randomUUID(),
      workflowId: blueprint.metadata.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      actionTrace: [],
      artifacts: [],
      outputs: {},
    };

    let currentInputs = { ...initialInputs };

    for (const step of blueprint.steps) {
      this.appendTrace(run, 'STEP_STARTED', step.id, undefined, step.description);
      const retries = step.retries ?? this.options.maxRetries;
      let attempt = 0;
      let success = false;
      let lastError: Error | null = null;

      while (attempt <= retries && !success) {
        try {
          const stepInputs = step.input
            ? this.validateAndProjectInputs(currentInputs, step.input.schema)
            : currentInputs;

          const toolResult = step.tool
            ? await this.invokeTool(run, step, stepInputs)
            : { output: {} };

          currentInputs = { ...currentInputs, ...toolResult.output };
          if (toolResult.artifacts) {
            run.artifacts.push(...toolResult.artifacts);
          }

          this.appendTrace(
            run,
            'STEP_COMPLETED',
            step.id,
            step.tool?.tool_id,
            'Step completed successfully',
            { outputKeys: Object.keys(toolResult.output || {}) }
          );
          success = true;
        } catch (err) {
          attempt += 1;
          lastError = err as Error;
          this.appendTrace(
            run,
            'STEP_FAILED',
            step.id,
            step.tool?.tool_id,
            'Step failed',
            { error: this.redactSecrets((err as Error).message) }
          );

          if (attempt > retries) {
            if (step.fallback_step) {
              this.appendTrace(
                run,
                'DEBUG_NOTE',
                step.id,
                undefined,
                'Falling back to alternate step',
                { fallback: step.fallback_step }
              );
              const fallbackStep = blueprint.steps.find(
                (s) => s.id === step.fallback_step
              );
              if (fallbackStep) {
                blueprint.steps.splice(
                  blueprint.steps.indexOf(step) + 1,
                  0,
                  fallbackStep
                );
                break;
              }
            }
            run.status = 'failed';
            run.completedAt = new Date().toISOString();
            return run;
          }
        }
      }

      if (step.stop_condition && currentInputs[step.stop_condition]) {
        this.appendTrace(
          run,
          'DEBUG_NOTE',
          step.id,
          step.tool?.tool_id,
          'Stop condition met',
          { condition: step.stop_condition }
        );
        break;
      }
    }

    run.status = 'succeeded';
    run.completedAt = new Date().toISOString();
    run.outputs = currentInputs;
    return run;
  }

  private async invokeTool(
    run: WorkflowRunRecord,
    step: GuidedWorkflowBlueprint['steps'][number],
    stepInputs: Record<string, unknown>
  ) {
    const handler = this.registry.get(step.tool!.tool_id);
    if (!handler) {
      throw new Error(`Tool not registered: ${step.tool!.tool_id}`);
    }

    this.appendTrace(run, 'TOOL_CALLED', step.id, step.tool!.tool_id, 'Executing tool');

    const result = await handler(stepInputs);
    if (result.debugLog) {
      this.appendTrace(run, 'DEBUG_NOTE', step.id, step.tool!.tool_id, 'Tool debug output', {
        log: this.redactSecrets(result.debugLog),
      });
    }
    return result;
  }

  private validateAndProjectInputs(
    inputs: Record<string, unknown>,
    schema: Record<string, unknown>
  ): Record<string, unknown> {
    const parsed = SafeInputSchema.parse(inputs);
    const projected: Record<string, unknown> = {};
    for (const key of Object.keys(schema)) {
      if (parsed[key] !== undefined) {
        projected[key] = parsed[key];
      }
    }
    return projected;
  }

  private appendTrace(
    run: WorkflowRunRecord,
    type: TraceEventType,
    stepId: string | undefined,
    toolId: string | undefined,
    message: string,
    detail?: Record<string, unknown>
  ) {
    if (!run.actionTrace) {
      run.actionTrace = [];
    }
    const event: TraceEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      stepId,
      toolId,
      message,
      detail,
    };
    run.actionTrace.push(event);
  }

  private redactSecrets(value: string) {
    return value.replace(/[A-Za-z0-9]{16,}/g, '[redacted]');
  }
}
