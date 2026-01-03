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

  for (const rule of step.validations) {
    const value = getByPath(inputs, rule.path);
    switch (rule.rule) {
      case 'required':
      case 'nonEmpty':
        if (value === undefined || value === null || value === '') {
          trace.log('validation', rule.message ?? `${rule.path} is required`);
          throw new Error(rule.message ?? `${rule.path} is required`);
        }
        break;
      case 'regex':
        if (typeof value === 'string' && rule.value instanceof RegExp === false && rule.value) {
          const regex = new RegExp(String(rule.value));
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
      case 'minLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length < rule.value) {
          throw new Error(rule.message ?? `${rule.path} must be at least ${rule.value} characters`);
        }
        break;
      case 'maxLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length > rule.value) {
          throw new Error(rule.message ?? `${rule.path} must be at most ${rule.value} characters`);
        }
        break;
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
    let halt = false;

    for (const step of blueprint.steps) {
      if (halt) break;
      const inputs = { ...(this.options.userInputs[step.id] ?? {}) };
      trace.log('input-collected', `Collected inputs for ${step.id}`, inputs as Record<string, unknown>);

      validateInputs(step, inputs, trace);

      for (const condition of step.stopConditions) {
        const value = getByPath(inputs, condition.path);
        if (condition.exists && value !== undefined) {
          trace.log('stop-condition', `Stop condition hit on ${condition.path}`);
          halt = true;
          break;
        }
        if (condition.equals !== undefined && value === condition.equals) {
          trace.log('stop-condition', `Stop condition matched ${condition.path}=${condition.equals}`);
          halt = true;
          break;
        }
      }

      if (halt) break;

      if (step.tool) {
        const payload: Record<string, unknown> = {};
        Object.entries(step.tool.inputMapping).forEach(([targetKey, sourcePath]) => {
          const value = getByPath(inputs, sourcePath);
          if (value !== undefined) {
            setByPath(payload, targetKey, value);
          }
        });

        let attempt = 0;
        const maxAttempts = Math.max(step.retries ?? 0, step.tool.retries ?? 0) + 1;
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
          });

          if (result.status === 'allowed') {
            success = true;
            if (step.tool.outputMapping && result.artifactId) {
              Object.entries(step.tool.outputMapping).forEach(([targetPath, sourceKey]) => {
                setByPath(inputs, targetPath, (payload as Record<string, unknown>)[sourceKey]);
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
          continue;
        }

        if (!success && step.tool.fallbackStepId) {
          trace.log('debug', `Tool-level fallback ${step.tool.fallbackStepId} engaged`);
          continue;
        }

        if (!success) {
          trace.log('error', `Step ${step.id} exhausted retries`, { lastMessage });
          break;
        }
      }
    }

    const finishedAt = new Date().toISOString();
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
