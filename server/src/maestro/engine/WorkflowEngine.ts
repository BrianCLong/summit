import { randomUUID } from 'crypto';
import { metrics } from '../../observability/metrics.js';
import logger from '../../utils/logger.js';

export interface WorkflowDefinition {
  id: string;
  steps: WorkflowStep[];
  inputs?: WorkflowInputDef[];
}

export interface WorkflowInputDef {
  name: string;
  type: string;
  optional?: boolean;
}

export interface WorkflowStep {
  id: string;
  tool: string;
  params: Record<string, any>;
  retries?: number;
}

export interface WorkflowContext {
  runId: string;
  tenantId: string;
  inputs: Record<string, any>;
  steps: Record<string, any>; // Stores output of each step by ID
}

export interface ToolExecutor {
  execute(params: any, context: WorkflowContext): Promise<any>;
}

// Simple Registry (In-memory for now)
export class ToolRegistry {
  private tools = new Map<string, ToolExecutor>();

  register(name: string, executor: ToolExecutor) {
    this.tools.set(name, executor);
  }

  get(name: string): ToolExecutor | undefined {
    return this.tools.get(name);
  }
}

// Built-in Echo Tool for testing
class EchoTool implements ToolExecutor {
  async execute(params: any): Promise<any> {
    return params;
  }
}

export class WorkflowEngine {
  private registry: ToolRegistry;

  constructor() {
    this.registry = new ToolRegistry();
    this.registry.register('utils.echo', new EchoTool());
  }

  async execute(
    definition: WorkflowDefinition,
    inputs: Record<string, any>,
    tenantId: string = 'default'
  ): Promise<any> {
    const context: WorkflowContext = {
      runId: randomUUID(),
      tenantId,
      inputs,
      steps: {},
    };
    const startTime = Date.now();

    logger.info({ workflowId: definition.id, runId: context.runId, tenantId }, 'Starting workflow');

    try {
      for (const step of definition.steps) {
        logger.debug({ stepId: step.id, tool: step.tool, runId: context.runId }, 'Executing step');
        const stepStartTime = Date.now();

        const tool = this.registry.get(step.tool);
        if (!tool) {
          throw new Error(`Tool not found: ${step.tool}`);
        }

        // 1. Resolve Parameters
        const resolvedParams = this.resolveParams(step.params, context);

        // 2. Execute
        try {
          const result = await tool.execute(resolvedParams, context);
          context.steps[step.id] = { output: result, status: 'completed' };

          // Record Job (Step) Metrics
          if (metrics.maestroJobExecutionDurationSeconds) {
            metrics.maestroJobExecutionDurationSeconds.observe(
              { job_type: step.tool, status: 'success', tenant_id: tenantId },
              (Date.now() - stepStartTime) / 1000
            );
          }
        } catch (err: any) {
          logger.error({ stepId: step.id, error: err.message, runId: context.runId }, 'Step failed');
          context.steps[step.id] = { error: err.message, status: 'failed' };

          // Record Job (Step) Metrics
          if (metrics.maestroJobExecutionDurationSeconds) {
            metrics.maestroJobExecutionDurationSeconds.observe(
              { job_type: step.tool, status: 'failed', tenant_id: tenantId },
              (Date.now() - stepStartTime) / 1000
            );
          }
          throw err; // Stop execution on failure for now
        }
      }

      // Record DAG (Workflow) Metrics
      if (metrics.maestroDagExecutionDurationSeconds) {
        metrics.maestroDagExecutionDurationSeconds.observe(
          { dag_id: definition.id, status: 'success', tenant_id: tenantId },
          (Date.now() - startTime) / 1000
        );
      }

      logger.info({ workflowId: definition.id, runId: context.runId }, 'Workflow completed');
      return context.steps;
    } catch (error: any) {
       // Record DAG (Workflow) Metrics
       if (metrics.maestroDagExecutionDurationSeconds) {
        metrics.maestroDagExecutionDurationSeconds.observe(
          { dag_id: definition.id, status: 'failed', tenant_id: tenantId },
          (Date.now() - startTime) / 1000
        );
      }
      throw error;
    }
  }

  /**
   * Resolves parameters with variable substitution.
   * - Exact match "{{foo}}" -> returns raw value (Object, Array, etc.)
   * - Partial match "Value: {{foo}}" -> returns interpolated string
   */
  private resolveParams(params: any, context: WorkflowContext): any {
    if (typeof params === 'string') {
      // Check for exact match: starts with {{, ends with }}, and no other characters outside
      const exactMatch = params.match(/^\{\{([\w\.]+)\}\}$/);
      if (exactMatch) {
        // Return the raw value directly to preserve type
        return this.getValueByPath(context, exactMatch[1]);
      }

      // Fallback to string interpolation for partial matches
      return params.replace(/\{\{([\w\.]+)\}\}/g, (_, path) => {
        const val = this.getValueByPath(context, path);
        if (typeof val === 'object') {
          return JSON.stringify(val); // Avoid [object Object]
        }
        return String(val);
      });
    } else if (Array.isArray(params)) {
      return params.map(p => this.resolveParams(p, context));
    } else if (typeof params === 'object' && params !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
