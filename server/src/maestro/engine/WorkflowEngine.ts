import { randomUUID } from 'crypto';

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
    inputs: Record<string, any>
  ): Promise<any> {
    const context: WorkflowContext = {
      runId: randomUUID(),
      inputs,
      steps: {},
    };

    console.log(`[WorkflowEngine] Starting workflow ${definition.id} (${context.runId})`);

    for (const step of definition.steps) {
      console.log(`[WorkflowEngine] Executing step: ${step.id} (${step.tool})`);

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
      } catch (err: any) {
        console.error(`[WorkflowEngine] Step ${step.id} failed:`, err);
        context.steps[step.id] = { error: err.message, status: 'failed' };
        throw err; // Stop execution on failure for now
      }
    }

    console.log(`[WorkflowEngine] Workflow completed.`);
    return context.steps;
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
