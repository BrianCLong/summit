import { ActionContractRegistry, applyRedactionRules } from './contracts.js';
import { TraceEvent } from './types.js';

export interface ToolExecutionResult<TResult> {
  toolName: string;
  success: boolean;
  output?: TResult;
  error?: string;
  postconditionIssues?: string[];
}

export interface ToolRuntimeConfig {
  strictPostconditions?: boolean;
}

export type ToolHandler<TArgs, TResult> = (args: TArgs) => Promise<TResult> | TResult;

export interface TraceRecorder {
  record(event: TraceEvent): Promise<void> | void;
}

export class ToolRuntime {
  private registry: ActionContractRegistry;
  private handlers = new Map<string, ToolHandler<unknown, unknown>>();
  private config: ToolRuntimeConfig;

  constructor(registry: ActionContractRegistry, config: ToolRuntimeConfig = {}) {
    this.registry = registry;
    this.config = config;
  }

  registerHandler<TArgs, TResult>(toolName: string, handler: ToolHandler<TArgs, TResult>): void {
    this.handlers.set(toolName, handler as ToolHandler<unknown, unknown>);
  }

  async runTool<TArgs, TResult>(
    toolName: string,
    args: TArgs,
    context: {
      runId: string;
      planId?: string;
      stepId?: string;
      recorder?: TraceRecorder;
    },
  ): Promise<ToolExecutionResult<TResult>> {
    const contract = this.registry.get(toolName);
    if (!contract) {
      return { toolName, success: false, error: `No contract for tool ${toolName}` };
    }

    const handler = this.handlers.get(toolName);
    if (!handler) {
      return { toolName, success: false, error: `No handler for tool ${toolName}` };
    }

    const parsedArgs = contract.argsSchema.safeParse(args);
    if (!parsedArgs.success) {
      await context.recorder?.record({
        type: 'tool:validation_failed',
        timestamp: new Date().toISOString(),
        run_id: context.runId,
        plan_id: context.planId,
        step_id: context.stepId,
        tool_name: toolName,
        data: {
          stage: 'args',
          issues: parsedArgs.error.issues.map((issue) => issue.message),
          args: applyRedactionRules(args, contract.redactionRules),
        },
      });
      return {
        toolName,
        success: false,
        error: `Argument validation failed for ${toolName}`,
      };
    }

    await context.recorder?.record({
      type: 'tool:started',
      timestamp: new Date().toISOString(),
      run_id: context.runId,
      plan_id: context.planId,
      step_id: context.stepId,
      tool_name: toolName,
      data: { args: applyRedactionRules(parsedArgs.data, contract.redactionRules) },
    });

    try {
      const output = (await handler(parsedArgs.data)) as TResult;
      const parsedOutput = contract.outputSchema.safeParse(output);
      if (!parsedOutput.success) {
        await context.recorder?.record({
          type: 'tool:validation_failed',
          timestamp: new Date().toISOString(),
          run_id: context.runId,
          plan_id: context.planId,
          step_id: context.stepId,
          tool_name: toolName,
          data: {
            stage: 'output',
            issues: parsedOutput.error.issues.map((issue) => issue.message),
            output: applyRedactionRules(output, contract.redactionRules),
          },
        });
        return {
          toolName,
          success: false,
          error: `Output validation failed for ${toolName}`,
        };
      }

      let postconditionIssues: string[] | undefined;
      if (contract.postcondition) {
        const post = contract.postcondition(parsedOutput.data);
        if (!post.ok) {
          postconditionIssues = post.issues ?? ['Postcondition failed'];
          await context.recorder?.record({
            type: 'tool:postcondition_failed',
            timestamp: new Date().toISOString(),
            run_id: context.runId,
            plan_id: context.planId,
            step_id: context.stepId,
            tool_name: toolName,
            data: {
              issues: postconditionIssues,
              output: applyRedactionRules(parsedOutput.data, contract.redactionRules),
            },
          });

          if (this.config.strictPostconditions) {
            return {
              toolName,
              success: false,
              error: `Postcondition failed for ${toolName}`,
              postconditionIssues,
            };
          }
        }
      }

      await context.recorder?.record({
        type: 'tool:completed',
        timestamp: new Date().toISOString(),
        run_id: context.runId,
        plan_id: context.planId,
        step_id: context.stepId,
        tool_name: toolName,
        data: {
          output: applyRedactionRules(parsedOutput.data, contract.redactionRules),
          postconditionIssues,
        },
      });

      return { toolName, success: true, output: parsedOutput.data, postconditionIssues };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      await context.recorder?.record({
        type: 'tool:failed',
        timestamp: new Date().toISOString(),
        run_id: context.runId,
        plan_id: context.planId,
        step_id: context.stepId,
        tool_name: toolName,
        data: { error: message },
      });

      return { toolName, success: false, error: message };
    }
  }
}
