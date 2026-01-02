// @ts-nocheck
import { randomUUID as uuidv4 } from 'crypto';
import { EventEmitter } from 'events';
import { RunbookDefinition, RunbookContext, RunbookStep, StepDefinition } from '../lib/types.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'RunbookEngine' });

export class RunbookEngine extends EventEmitter {
  private definitions: Map<string, RunbookDefinition> = new Map();
  private stepImplementations: Map<string, RunbookStep> = new Map();
  private activeContexts: Map<string, RunbookContext> = new Map();

  constructor() {
    super();
  }

  public registerStep(type: string, implementation: RunbookStep) {
    this.stepImplementations.set(type, implementation);
  }

  public registerDefinition(definition: RunbookDefinition) {
    this.definitions.set(definition.id, definition);
  }

  public getDefinition(id: string): RunbookDefinition | undefined {
    return this.definitions.get(id);
  }

  public listDefinitions(): RunbookDefinition[] {
    return Array.from(this.definitions.values());
  }

  public async executeRunbook(
    runbookId: string,
    inputs: Record<string, any>,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const definition = this.definitions.get(runbookId);
    if (!definition) {
      throw new Error(`Runbook definition ${runbookId} not found`);
    }

    const runId = uuidv4();
    const startTime = new Date();

    const context: RunbookContext = {
      runId,
      runbookId,
      userId,
      tenantId,
      startTime,
      inputs,
      outputs: new Map(),
      logs: [],
    };

    this.activeContexts.set(runId, context);

    // Record start in Prov-Ledger
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'RUNBOOK_START',
      resourceType: 'runbook_run',
      resourceId: runId,
      actorId: userId,
      actorType: 'user',
      timestamp: startTime,
      payload: { runbookId, inputs },
      metadata: { purpose: 'Runbook Execution' }
    });

    // Start execution in background (or await if synchronous needed, but typically async)
    this.executeDAG(definition, context).catch(err => {
      logger.error({ runId, err }, 'Runbook execution failed');
      // Record failure
      provenanceLedger.appendEntry({
        tenantId,
        actionType: 'RUNBOOK_FAILURE',
        resourceType: 'runbook_run',
        resourceId: runId,
        actorId: 'system',
        actorType: 'system',
        timestamp: new Date(),
        payload: { error: err.message },
        metadata: {}
      });
    });

    return runId;
  }

  private async executeDAG(definition: RunbookDefinition, context: RunbookContext) {
    const executedSteps = new Set<string>();
    const pendingSteps = new Set<string>(definition.steps.map(s => s.id));

    // Simple topological execution
    while (pendingSteps.size > 0) {
      const runnableSteps = definition.steps.filter(step =>
        pendingSteps.has(step.id) &&
        (step.dependencies || []).every(dep => executedSteps.has(dep))
      );

      if (runnableSteps.length === 0) {
        throw new Error('Circular dependency or invalid DAG detected');
      }

      // Execute runnable steps in parallel
      await Promise.all(runnableSteps.map(async (step) => {
        try {
          await this.executeStep(step, context);
          executedSteps.add(step.id);
          pendingSteps.delete(step.id);
        } catch (err: any) {
          throw err;
        }
      }));
    }

    // Record completion
    await provenanceLedger.appendEntry({
      tenantId: context.tenantId,
      actionType: 'RUNBOOK_COMPLETE',
      resourceType: 'runbook_run',
      resourceId: context.runId,
      actorId: 'system',
      actorType: 'system',
      timestamp: new Date(),
      payload: {
        outputs: Object.fromEntries(context.outputs)
      },
      metadata: {}
    });

    this.emit('runbookCompleted', context.runId);
  }

  private async executeStep(step: StepDefinition, context: RunbookContext) {
    const implementation = this.stepImplementations.get(step.type);
    if (!implementation) {
      throw new Error(`Step implementation ${step.type} not found`);
    }

    const stepStartTime = new Date();

    // Resolve parameters (replace variables from inputs/outputs)
    const resolvedParams = this.resolveParameters(step.parameters || {}, context);

    try {
      const result = await implementation.execute(context, resolvedParams);
      context.outputs.set(step.id, result);

      context.logs.push({
        stepId: step.id,
        status: 'success',
        timestamp: new Date(),
        result
      });

      // Audit step execution
      await provenanceLedger.appendEntry({
        tenantId: context.tenantId,
        actionType: 'RUNBOOK_STEP_EXECUTE',
        resourceType: 'runbook_step',
        resourceId: `${context.runId}:${step.id}`,
        actorId: 'system',
        actorType: 'system',
        timestamp: new Date(),
        payload: {
          stepId: step.id,
          type: step.type,
          params: resolvedParams,
          result
        },
        metadata: {}
      });

    } catch (err: any) {
      context.logs.push({
        stepId: step.id,
        status: 'error',
        timestamp: new Date(),
        error: err.message
      });
      throw err;
    }
  }

  private resolveParameters(params: Record<string, any>, context: RunbookContext): Record<string, any> {
    // Deep clone and replace
    const resolved: Record<string, any> = JSON.parse(JSON.stringify(params));

    // Recursively replace placeholders like {{inputs.x}} or {{steps.stepId.output.y}}
    const replace = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = this.interpolate(obj[key], context);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          replace(obj[key]);
        }
      }
    };

    replace(resolved);
    return resolved;
  }

  private interpolate(str: string, context: RunbookContext): any {
    if (!str.startsWith('{{') || !str.endsWith('}}')) return str;

    const path = str.slice(2, -2).trim();
    const parts = path.split('.');

    if (parts[0] === 'inputs') {
      return context.inputs[parts[1]];
    } else if (parts[0] === 'steps') {
      const stepId = parts[1];
      const outputKey = parts[3]; // steps.id.output.key
      const stepOutput = context.outputs.get(stepId);
      return stepOutput ? stepOutput[outputKey] : undefined;
    }

    return str;
  }

  public getStatus(runId: string): any {
    const context = this.activeContexts.get(runId);
    if (!context) return null;
    return {
      runId: context.runId,
      status: 'running', // Simplified
      logs: context.logs
    };
  }

  public async replay(runId: string, tenantId: string): Promise<any[]> {
    // Fetch logs from Prov-Ledger
    const entries = await provenanceLedger.getEntries(tenantId, {
      resourceType: 'runbook_step'
    });
    // Filter by runId in resourceId or payload (simplified)
    return entries.filter(e => e.resourceId.startsWith(runId + ':'));
  }
}

export const runbookEngine = new RunbookEngine();
