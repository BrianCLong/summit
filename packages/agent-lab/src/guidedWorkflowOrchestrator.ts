import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import path from 'path';

import { ActionTrace } from './actionTrace';
import { ContentBoundary } from './contentBoundary';
import { RunSummary } from './evidence';
import { createDefaultBus } from './toolBus';
import { ToolDefinition } from './tools';
import { GuidedWorkflowBlueprint, GuidedWorkflowStep } from './guidedWorkflowBlueprint';

const ajv = addFormats(new Ajv({ allErrors: true, strict: false }));

const getByPath = (input: Record<string, unknown>, pathExpr: string): unknown => {
  return pathExpr.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, input as unknown);
};

const setByPath = (target: Record<string, unknown>, pathExpr: string, value: unknown) => {
  const parts = pathExpr.split('.');
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i];
    if (i === parts.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = (cursor[key] as Record<string, unknown>) || {};
      cursor = cursor[key] as Record<string, unknown>;
    }
  }
};

export interface GuidedWorkflowRunOptions {
  blueprint: GuidedWorkflowBlueprint;
  runId: string;
  boundary: ContentBoundary;
  artifactsDir: string;
  tools: ToolDefinition[];
  userInputs: Record<string, Record<string, unknown>>;
  featureEnabled?: boolean;
}

export interface GuidedWorkflowResult extends RunSummary {
  actionTracePath: string;
  trace: ReturnType<ActionTrace['toJSON']>;
}

const validateInputs = (step: GuidedWorkflowStep, inputs: Record<string, unknown>, trace: ActionTrace) => {
  if (!step.inputSchema || Object.keys(step.inputSchema).length === 0) return;
  const validator = ajv.compile(step.inputSchema);
  const valid = validator(inputs);
  if (!valid && validator.errors?.length) {
    trace.log('validation', `Schema validation failed for ${step.id}`, {
      errors: validator.errors.map((err) => `${err.instancePath} ${err.message}`),
    });
    throw new Error(`Input validation failed for ${step.id}`);
  }

  const isEmpty = (value: unknown): boolean => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  };

  for (const rule of step.validations) {
    const value = getByPath(inputs, rule.path);
    switch (rule.rule) {
      case 'required':
        if (value === undefined || value === null) {
          trace.log('validation', rule.message ?? `${rule.path} is required`);
          throw new Error(rule.message ?? `${rule.path} is required`);
        }
        break;
      case 'nonEmpty':
        if (isEmpty(value)) {
          trace.log('validation', rule.message ?? `${rule.path} cannot be empty`);
          throw new Error(rule.message ?? `${rule.path} cannot be empty`);
        }
        break;
      case 'regex':
        if (typeof value === 'string' && rule.value) {
          const regex = rule.value instanceof RegExp ? rule.value : new RegExp(String(rule.value));
          if (!regex.test(value)) {
            trace.log('validation', rule.message ?? `${rule.path} failed pattern check`);
            throw new Error(rule.message ?? `${rule.path} failed pattern check`);
          }
        }
        break;
      case 'enum':
        if (rule.value && Array.isArray(rule.value) && !rule.value.includes(value)) {
          trace.log('validation', rule.message ?? `${rule.path} must be one of ${rule.value.join(', ')}`);
          throw new Error(rule.message ?? `${rule.path} must be one of ${rule.value.join(', ')}`);
        }
        break;
      case 'minLength': {
        if (
          (typeof value === 'string' || Array.isArray(value)) &&
          typeof rule.value === 'number' &&
          value.length < rule.value
        ) {
          throw new Error(rule.message ?? `${rule.path} must be at least ${rule.value} characters`);
        }
        break;
      }
      case 'maxLength': {
        if (
          (typeof value === 'string' || Array.isArray(value)) &&
          typeof rule.value === 'number' &&
          value.length > rule.value
        ) {
          throw new Error(rule.message ?? `${rule.path} must be at most ${rule.value} characters`);
        }
        break;
      }
      case 'min': {
        if (typeof rule.value === 'number') {
          const numeric = typeof value === 'number' ? value : Number(value);
          if (!Number.isNaN(numeric) && numeric < rule.value) {
            throw new Error(rule.message ?? `${rule.path} must be at least ${rule.value}`);
          }
        }
        break;
      }
      case 'max': {
        if (typeof rule.value === 'number') {
          const numeric = typeof value === 'number' ? value : Number(value);
          if (!Number.isNaN(numeric) && numeric > rule.value) {
            throw new Error(rule.message ?? `${rule.path} must be at most ${rule.value}`);
          }
        }
        break;
      }
      case 'minItems': {
        if (Array.isArray(value) && typeof rule.value === 'number' && value.length < rule.value) {
          throw new Error(rule.message ?? `${rule.path} must include at least ${rule.value} items`);
        }
        break;
      }
      case 'maxItems': {
        if (Array.isArray(value) && typeof rule.value === 'number' && value.length > rule.value) {
          throw new Error(rule.message ?? `${rule.path} must include at most ${rule.value} items`);
        }
        break;
      }
      case 'uri':
        try {
          if (value) new URL(String(value));
        } catch (err) {
          throw new Error(rule.message ?? `${rule.path} must be a valid URI`);
        }
        break;
      case 'email':
        if (value && typeof value === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
          throw new Error(rule.message ?? `${rule.path} must be an email`);
        }
        break;
      default:
        break;
    }
  }
};

export class GuidedWorkflowOrchestrator {
  constructor(private readonly options: GuidedWorkflowRunOptions) {}

  async run(): Promise<GuidedWorkflowResult> {
    if (this.options.featureEnabled === false) {
      throw new Error('Feature guidedWorkflows.enabled is disabled');
    }

    const { blueprint, boundary, artifactsDir, tools, runId } = this.options;
    const { bus, evidence } = createDefaultBus(blueprint as any, runId, boundary, artifactsDir, tools, false, true);
    evidence.init();
    const trace = new ActionTrace(path.join(artifactsDir, 'runs', runId), blueprint.policies.redactKeys);
    trace.log('step-start', `Starting workflow ${blueprint.metadata.name}`, {
      workflowId: blueprint.metadata.id,
      risk: blueprint.metadata.risk_level,
    });

    const stepsSummary: RunSummary['steps'] = [];
    const runState: Record<string, { inputs: Record<string, unknown>; output?: unknown }> = {};
    const workflowContext: Record<string, unknown> = {};
    const startTime = Date.now();
    const maxSteps = blueprint.policies.rateLimitPerRun.maxSteps;
    let stepIndex = 0;
    let outcome: 'complete' | 'halted' | 'error' = 'complete';

    while (stepIndex < blueprint.steps.length) {
      if (stepIndex + 1 > maxSteps) {
        trace.log('stop-condition', `Rate limit exceeded: maxSteps ${maxSteps}`);
        outcome = 'halted';
        break;
      }
      if (Date.now() - startTime > blueprint.policies.rateLimitPerRun.intervalMs) {
        trace.log('stop-condition', `Rate limit interval exceeded: ${blueprint.policies.rateLimitPerRun.intervalMs}ms`);
        outcome = 'halted';
        break;
      }

      const step = blueprint.steps[stepIndex];
      trace.log('step-start', `Starting step ${step.id}`, { title: step.title });

      const inputs = { ...(this.options.userInputs[step.id] ?? {}) };
      runState[step.id] = { inputs };
      trace.log('input-collected', `Collected inputs for ${step.id}`, inputs as Record<string, unknown>);

      validateInputs(step, inputs, trace);

      const resolverContext = {
        inputs,
        steps: runState,
        context: workflowContext,
      };

      let halt = false;
      for (const condition of step.stopConditions) {
        const value = getByPath(inputs, condition.path) ?? getByPath(resolverContext, condition.path);
        if (condition.exists && value !== undefined) {
          trace.log('stop-condition', `Stop condition hit on ${condition.path}`);
          halt = true;
          outcome = 'halted';
          break;
        }
        if (condition.equals !== undefined && value === condition.equals) {
          trace.log('stop-condition', `Stop condition matched ${condition.path}=${condition.equals}`);
          halt = true;
          outcome = 'halted';
          break;
        }
      }

      if (halt) break;

      if (step.tool) {
        const payload: Record<string, unknown> = {};
        Object.entries(step.tool.inputMapping).forEach(([targetKey, sourcePath]) => {
          const directValue = getByPath(inputs, sourcePath);
          const mappedValue = directValue ?? getByPath(resolverContext, sourcePath);
          if (mappedValue !== undefined) {
            setByPath(payload, targetKey, mappedValue);
          }
        });

        let attempt = 0;
        const declaredAttempts = Math.max(step.retries ?? 0, step.tool.retries ?? 0) + 1;
        const maxAttempts = Math.min(declaredAttempts, blueprint.policies.maxAttempts);
        let success = false;
        let lastMessage = '';

        while (!success && attempt < maxAttempts) {
          attempt += 1;
          trace.log('tool-dispatch', `Dispatching ${step.tool.toolId} (attempt ${attempt}/${maxAttempts})`, payload);
          const result = await bus.execute(step.tool.toolId, payload, evidence, step.title);
          lastMessage = result.message;
          trace.log('tool-result', `Tool ${step.tool.toolId} returned ${result.status}`, {
            status: result.status,
            message: result.message,
            evidenceId: result.artifactId,
            stdout: result.stdout,
            stderr: result.stderr,
          });

          if (result.status === 'allowed') {
            success = true;
            runState[step.id].output = result.output;
            workflowContext.lastOutput = result.output;
            workflowContext.lastStepId = step.id;
            if (step.tool.outputMapping && result.output) {
              Object.entries(step.tool.outputMapping).forEach(([targetPath, sourcePath]) => {
                const sourceValue =
                  typeof result.output === 'object' && result.output
                    ? getByPath(result.output as Record<string, unknown>, sourcePath)
                    : undefined;
                if (sourceValue !== undefined) {
                  setByPath(workflowContext, targetPath, sourceValue);
                }
              });
            }
            stepsSummary.push({
              name: step.title,
              tool: step.tool.toolId,
              status: result.status,
              message: result.message,
              evidenceId: result.artifactId,
            });
          } else if (attempt < maxAttempts) {
            trace.log('retry', `Retrying ${step.tool.toolId} after ${result.status}`);
            if (blueprint.policies.allowDebug) {
              trace.log('debug', `Captured failure details for ${step.tool.toolId}`, {
                stdout: result.stdout,
                stderr: result.stderr,
              });
            }
          } else if (step.fallbackStepId || step.tool.fallbackStepId) {
            trace.log('fallback', `Falling back to ${step.fallbackStepId ?? step.tool.fallbackStepId}`);
          } else {
            stepsSummary.push({
              name: step.title,
              tool: step.tool.toolId,
              status: result.status,
              message: result.message,
              evidenceId: result.artifactId,
            });
          }
        }

        if (!success && step.fallbackStepId) {
          trace.log('debug', `Step ${step.id} failed; delegating to fallback ${step.fallbackStepId}`);
          stepIndex = blueprint.steps.findIndex((candidate) => candidate.id === step.fallbackStepId);
          if (stepIndex === -1) {
            trace.log('error', `Fallback step ${step.fallbackStepId} not found`);
            outcome = 'error';
            break;
          }
          continue;
        }

        if (!success && step.tool.fallbackStepId) {
          trace.log('debug', `Tool-level fallback ${step.tool.fallbackStepId} engaged`);
          stepIndex = blueprint.steps.findIndex((candidate) => candidate.id === step.tool.fallbackStepId);
          if (stepIndex === -1) {
            trace.log('error', `Fallback step ${step.tool.fallbackStepId} not found`);
            outcome = 'error';
            break;
          }
          continue;
        }

        if (!success) {
          trace.log('error', `Step ${step.id} exhausted retries`, { lastMessage });
          outcome = 'error';
          break;
        }
      }

      stepIndex += 1;
    }

    const finishedAt = new Date().toISOString();
    trace.log(outcome === 'error' ? 'error' : 'complete', `Workflow ${blueprint.metadata.name} finished with ${outcome}`, {
      outcome,
    });
    const summary: GuidedWorkflowResult = {
      runId,
      workflow: blueprint.metadata.id,
      startedAt: trace.toJSON()[0]?.timestamp ?? new Date().toISOString(),
      finishedAt,
      steps: stepsSummary,
      objectives: [blueprint.metadata.name],
      expect: [blueprint.metadata.description],
      policyVersion: '1.0.0',
      actionTracePath: trace instanceof ActionTrace ? path.join(artifactsDir, 'runs', runId, 'trace.ndjson') : '',
      trace: trace.toJSON(),
    };
    evidence.writeRunSummary(summary);
    return summary;
  }
}
