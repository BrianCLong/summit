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
  | 'TOOL_COMPLETED'
  | 'TOOL_FAILED'
  | 'DEBUG_NOTE'
  | 'POLICY_CHECK';

export interface TraceEvent {
  id: string;
  timestamp: string;
  type: TraceEventType;
  stepId?: string;
  toolId?: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface WorkflowRunContext {
  actorId?: string;
  roles?: string[];
  attributes?: Record<string, unknown>;
  requestId?: string;
}

export interface GuidedWorkflowPolicyDecision {
  allowed: boolean;
  reason?: string;
  policyId?: string;
}

export interface PolicyEvaluatorInput {
  context: WorkflowRunContext;
  workflow: GuidedWorkflowBlueprint;
  step?: GuidedWorkflowBlueprint['steps'][number];
  toolId?: string;
}

export type PolicyEvaluator = (
  input: PolicyEvaluatorInput
) => Promise<GuidedWorkflowPolicyDecision> | GuidedWorkflowPolicyDecision;

export interface StepRunRecord {
  id: string;
  stepId: string;
  status: 'running' | 'succeeded' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  attempts: number;
  error?: string;
}

export interface ToolCallRecord {
  id: string;
  stepId: string;
  toolId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt?: string;
  inputKeys: string[];
  outputKeys: string[];
  error?: string;
}

export interface WorkflowRunRecord {
  runId: string;
  workflowId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt?: string;
  context: WorkflowRunContext;
  actionTrace: TraceEvent[];
  artifacts: string[];
  outputs: Record<string, unknown>;
  stepRuns: StepRunRecord[];
  toolCalls: ToolCallRecord[];
  policyDecisions: GuidedWorkflowPolicyDecision[];
  explanation?: string;
}

export interface WorkflowRunStore {
  start(run: WorkflowRunRecord): Promise<void> | void;
  appendTrace(runId: string, event: TraceEvent): Promise<void> | void;
  complete(run: WorkflowRunRecord): Promise<void> | void;
}

export interface DebugHandlerInput {
  error: Error;
  step: GuidedWorkflowBlueprint['steps'][number];
  attempt: number;
  context: WorkflowRunContext;
}

export interface DebugHandlerResult {
  note?: string;
  inputPatch?: Record<string, unknown>;
  retry?: boolean;
}

export type DebugHandler = (
  input: DebugHandlerInput
) => Promise<DebugHandlerResult> | DebugHandlerResult;

export interface OrchestratorOptions {
  maxRetries?: number;
  maxSteps?: number;
  maxArtifacts?: number;
  maxRuntimeMs?: number;
  store?: WorkflowRunStore;
  policyEvaluator?: PolicyEvaluator;
  debugHandler?: DebugHandler;
  featureFlags?: {
    guidedWorkflows?: {
      enabled: boolean;
      allowSandboxExec?: boolean;
    };
  };
}

const SafeInputSchema = z.record(z.string(), z.any());

const DEFAULT_OPTIONS: Required<Omit<OrchestratorOptions, 'store' | 'policyEvaluator' | 'debugHandler'>> = {
  maxRetries: 2,
  maxSteps: 100,
  maxArtifacts: 50,
  maxRuntimeMs: 5 * 60 * 1000,
  featureFlags: {
    guidedWorkflows: {
      enabled: false,
      allowSandboxExec: false,
    },
  },
};

export class GuidedWorkflowOrchestrator {
  private registry: ToolRegistry;
  private options: OrchestratorOptions;

  constructor(registry: ToolRegistry, options?: OrchestratorOptions) {
    this.registry = registry;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
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
    initialInputs: Record<string, unknown> = {},
    context: WorkflowRunContext = {}
  ): Promise<WorkflowRunRecord> {
    if (!this.options.featureFlags?.guidedWorkflows?.enabled) {
      throw new Error('guided workflows are disabled by feature flag');
    }

    this.assertAccess(blueprint, context);

    const run: WorkflowRunRecord = {
      runId: crypto.randomUUID(),
      workflowId: blueprint.metadata.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      context,
      actionTrace: [],
      artifacts: [],
      outputs: {},
      stepRuns: [],
      toolCalls: [],
      policyDecisions: [],
    };

    await this.options.store?.start(run);

    const workflowStart = Date.now();
    let currentInputs = { ...initialInputs };
    const steps = blueprint.steps.map((step) => ({ ...step }));
    const fallbackInsertions = new Map<string, number>();

    for (let index = 0; index < steps.length; index += 1) {
      if (Date.now() - workflowStart > (this.options.maxRuntimeMs ?? 0)) {
        run.status = 'failed';
        run.explanation = 'Workflow exceeded maximum runtime.';
        run.completedAt = new Date().toISOString();
        await this.options.store?.complete(run);
        return run;
      }

      if (index >= (this.options.maxSteps ?? steps.length)) {
        run.status = 'failed';
        run.explanation = 'Workflow exceeded maximum step count.';
        run.completedAt = new Date().toISOString();
        await this.options.store?.complete(run);
        return run;
      }

      const step = steps[index];
      const stepRun = this.startStepRun(run, step.id);
      this.appendTrace(run, 'STEP_STARTED', step.id, undefined, step.description);

      const retries = step.retries ?? this.options.maxRetries ?? 0;
      let attempt = 0;
      let success = false;
      let lastError: Error | null = null;

      while (attempt <= retries && !success) {
        try {
          await this.enforcePolicy(run, { context, workflow: blueprint, step });
          const stepInputs = step.input
            ? this.validateAndProjectInputs(currentInputs, step.input.schema, step.input.validation)
            : currentInputs;

          const toolResult = step.tool
            ? await this.invokeTool(
                run,
                blueprint,
                step,
                stepInputs,
                currentInputs,
                context
              )
            : { output: {} };

          currentInputs = { ...currentInputs, ...toolResult.output };
          if (toolResult.artifacts) {
            const remaining = (this.options.maxArtifacts ?? 0) - run.artifacts.length;
            run.artifacts.push(...toolResult.artifacts.slice(0, Math.max(remaining, 0)));
          }

          stepRun.status = 'succeeded';
          stepRun.completedAt = new Date().toISOString();
          stepRun.attempts = attempt + 1;

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
          stepRun.attempts = attempt;
          this.appendTrace(
            run,
            'STEP_FAILED',
            step.id,
            step.tool?.tool_id,
            'Step failed',
            { error: this.redactSecrets((err as Error).message) }
          );

          const debugResult = await this.options.debugHandler?.({
            error: err as Error,
            step,
            attempt,
            context,
          });
          if (debugResult?.note) {
            this.appendTrace(run, 'DEBUG_NOTE', step.id, undefined, debugResult.note);
          }
          if (debugResult?.inputPatch) {
            currentInputs = { ...currentInputs, ...debugResult.inputPatch };
          }
          if (debugResult?.retry === false) {
            break;
          }

          if (attempt > retries) {
            stepRun.status = 'failed';
            stepRun.completedAt = new Date().toISOString();
            stepRun.error = this.redactSecrets((lastError as Error).message);

            if (step.fallback_step) {
              const fallbackStep = steps.find((s) => s.id === step.fallback_step);
              const insertionCount = fallbackInsertions.get(step.fallback_step) ?? 0;
              if (fallbackStep && insertionCount < 1) {
                fallbackInsertions.set(step.fallback_step, insertionCount + 1);
                steps.splice(index + 1, 0, { ...fallbackStep });
                this.appendTrace(
                  run,
                  'DEBUG_NOTE',
                  step.id,
                  undefined,
                  'Falling back to alternate step',
                  { fallback: step.fallback_step }
                );
                break;
              }
            }

            run.status = 'failed';
            run.explanation = this.redactSecrets((lastError as Error).message);
            run.completedAt = new Date().toISOString();
            await this.options.store?.complete(run);
            return run;
          }
        }
      }

      if (success && this.shouldStop(step.stop_condition, currentInputs)) {
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
    run.explanation = 'Workflow completed successfully.';
    await this.options.store?.complete(run);
    return run;
  }

  private startStepRun(run: WorkflowRunRecord, stepId: string) {
    const stepRun: StepRunRecord = {
      id: crypto.randomUUID(),
      stepId,
      status: 'running',
      startedAt: new Date().toISOString(),
      attempts: 0,
    };
    run.stepRuns.push(stepRun);
    return stepRun;
  }

  private async invokeTool(
    run: WorkflowRunRecord,
    workflow: GuidedWorkflowBlueprint,
    step: GuidedWorkflowBlueprint['steps'][number],
    stepInputs: Record<string, unknown>,
    currentInputs: Record<string, unknown>,
    context: WorkflowRunContext
  ) {
    const handler = this.registry.get(step.tool!.tool_id);
    if (!handler) {
      throw new Error(`Tool not registered: ${step.tool!.tool_id}`);
    }

    await this.enforcePolicy(run, {
      context,
      workflow,
      step,
      toolId: step.tool!.tool_id,
    });

    const toolInputs = this.mapInputs(
      step.tool!.input_mapping,
      stepInputs,
      currentInputs
    );

    const toolCall: ToolCallRecord = {
      id: crypto.randomUUID(),
      stepId: step.id,
      toolId: step.tool!.tool_id,
      status: 'running',
      startedAt: new Date().toISOString(),
      inputKeys: Object.keys(toolInputs),
      outputKeys: [],
    };
    run.toolCalls.push(toolCall);

    this.appendTrace(run, 'TOOL_CALLED', step.id, step.tool!.tool_id, 'Executing tool');

    try {
      const result = await handler(toolInputs);
      toolCall.status = 'succeeded';
      toolCall.completedAt = new Date().toISOString();
      toolCall.outputKeys = Object.keys(result.output || {});
      if (result.debugLog) {
        this.appendTrace(run, 'DEBUG_NOTE', step.id, step.tool!.tool_id, 'Tool debug output', {
          log: this.redactSecrets(result.debugLog),
        });
      }

      const mappedOutput = this.mapOutputs(step.tool!.output_mapping, result.output);
      this.appendTrace(run, 'TOOL_COMPLETED', step.id, step.tool!.tool_id, 'Tool completed', {
        outputKeys: Object.keys(mappedOutput),
      });
      return { ...result, output: mappedOutput };
    } catch (error) {
      toolCall.status = 'failed';
      toolCall.completedAt = new Date().toISOString();
      toolCall.error = this.redactSecrets((error as Error).message);
      this.appendTrace(run, 'TOOL_FAILED', step.id, step.tool!.tool_id, 'Tool failed', {
        error: toolCall.error,
      });
      throw error;
    }
  }

  private validateAndProjectInputs(
    inputs: Record<string, unknown>,
    schema: Record<string, unknown>,
    validation?: { required?: string[]; maxLength?: number; minLength?: number }
  ): Record<string, unknown> {
    const parsed = SafeInputSchema.parse(inputs);
    const { properties, required } = this.extractProperties(schema, validation);
    const projected: Record<string, unknown> = {};

    for (const key of required) {
      if (parsed[key] === undefined || parsed[key] === null) {
        throw new Error(`Missing required input: ${key}`);
      }
    }

    for (const [key, definition] of Object.entries(properties)) {
      if (parsed[key] === undefined) {
        continue;
      }
      if (definition && typeof definition === 'object' && 'type' in definition) {
        this.assertType(key, parsed[key], (definition as { type?: string }).type);
      }
      if (typeof parsed[key] === 'string') {
        if (validation?.maxLength && parsed[key].length > validation.maxLength) {
          throw new Error(`Input ${key} exceeds maxLength`);
        }
        if (validation?.minLength && parsed[key].length < validation.minLength) {
          throw new Error(`Input ${key} below minLength`);
        }
      }
      projected[key] = parsed[key];
    }

    return projected;
  }

  private extractProperties(
    schema: Record<string, unknown>,
    validation?: { required?: string[] }
  ) {
    if (schema.type === 'object' && schema.properties) {
      return {
        properties: schema.properties as Record<string, unknown>,
        required: (schema.required as string[] | undefined) ?? validation?.required ?? [],
      };
    }
    return {
      properties: schema,
      required: validation?.required ?? [],
    };
  }

  private assertType(key: string, value: unknown, type?: string) {
    if (!type) return;
    const typeMap: Record<string, (input: unknown) => boolean> = {
      string: (input) => typeof input === 'string',
      number: (input) => typeof input === 'number',
      boolean: (input) => typeof input === 'boolean',
      array: (input) => Array.isArray(input),
      object: (input) => typeof input === 'object' && input !== null && !Array.isArray(input),
    };
    const validator = typeMap[type];
    if (validator && !validator(value)) {
      throw new Error(`Invalid type for ${key}: expected ${type}`);
    }
  }

  private mapInputs(
    mapping: Record<string, unknown>,
    stepInputs: Record<string, unknown>,
    currentInputs: Record<string, unknown>
  ) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return { ...stepInputs };
    }
    const result: Record<string, unknown> = {};
    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      const value = this.getByPath(currentInputs, String(sourcePath));
      result[targetKey] = value ?? this.getByPath(stepInputs, String(sourcePath));
    }
    return result;
  }

  private mapOutputs(
    mapping: Record<string, unknown>,
    output: Record<string, unknown>
  ) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return output;
    }
    const mapped: Record<string, unknown> = {};
    for (const [workflowKey, outputPath] of Object.entries(mapping)) {
      mapped[workflowKey] = this.getByPath(output, String(outputPath));
    }
    return mapped;
  }

  private getByPath(source: Record<string, unknown>, path: string) {
    if (!path.includes('.')) {
      return source[path];
    }
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
  }

  private shouldStop(
    condition: GuidedWorkflowBlueprint['steps'][number]['stop_condition'],
    inputs: Record<string, unknown>
  ) {
    if (!condition) return false;
    if (typeof condition === 'string') {
      return Boolean(inputs[condition]);
    }
    const value = inputs[condition.key];
    if (condition.equals !== undefined) {
      return value === condition.equals;
    }
    if (condition.not_equals !== undefined) {
      return value !== condition.not_equals;
    }
    if (condition.truthy === false) {
      return !value;
    }
    return Boolean(value);
  }

  private appendTrace(
    run: WorkflowRunRecord,
    type: TraceEventType,
    stepId: string | undefined,
    toolId: string | undefined,
    message: string,
    detail?: Record<string, unknown>
  ) {
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
    void this.options.store?.appendTrace(run.runId, event);
  }

  private redactSecrets(value: string) {
    return value.replace(/(sk-[A-Za-z0-9]{16,}|[A-Za-z0-9]{32,})/g, '[redacted]');
  }

  private assertAccess(blueprint: GuidedWorkflowBlueprint, context: WorkflowRunContext) {
    const access = blueprint.metadata.access;
    if (!access) return;
    if (access.allowed_roles?.length) {
      const roles = context.roles ?? [];
      const allowed = access.allowed_roles.some((role) => roles.includes(role));
      if (!allowed) {
        throw new Error('Actor does not have an allowed role for this workflow');
      }
    }
    if (access.required_attributes) {
      const attributes = context.attributes ?? {};
      for (const [key, expected] of Object.entries(access.required_attributes)) {
        if (attributes[key] !== expected) {
          throw new Error(`Actor missing required attribute: ${key}`);
        }
      }
    }
  }

  private async enforcePolicy(run: WorkflowRunRecord, input: PolicyEvaluatorInput) {
    if (!this.options.policyEvaluator) return;
    const decision = await this.options.policyEvaluator(input);
    run.policyDecisions.push(decision);
    this.appendTrace(run, 'POLICY_CHECK', input.step?.id, input.toolId, 'Policy check', {
      allowed: decision.allowed,
      reason: decision.reason,
      policyId: decision.policyId,
    });
    if (!decision.allowed) {
      throw new Error(decision.reason || 'Policy denied execution');
    }
  }
}
