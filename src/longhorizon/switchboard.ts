import { z } from 'zod';
import { PermissionTier } from './types';
import { Clock, defaultClock, redactValue, sha256, stableStringify } from './utils';

export interface ToolCallLog {
  id: string;
  runId: string;
  stepId: string;
  toolName: string;
  permissionTier: PermissionTier;
  args: unknown;
  timestamp: string;
}

export interface ToolContract<TArgs, TResult> {
  name: string;
  description: string;
  argsSchema: z.ZodSchema<TArgs>;
  permissionTier: PermissionTier;
  handler: (args: TArgs) => Promise<TResult>;
}

export class SwitchboardRouter {
  private readonly tools = new Map<string, ToolContract<any, any>>();
  private readonly logs: ToolCallLog[] = [];
  private readonly clock: Clock;
  private readonly runId: string;

  constructor(runId: string, clock: Clock = defaultClock) {
    this.clock = clock;
    this.runId = runId;
  }

  registerTool<TArgs, TResult>(contract: ToolContract<TArgs, TResult>): void {
    this.tools.set(contract.name, contract);
  }

  async callTool<TArgs, TResult>(
    stepId: string,
    toolName: string,
    args: TArgs,
  ): Promise<TResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} is not registered`);
    }
    const parsed = tool.argsSchema.parse(args);
    const logPayload = redactValue(parsed);
    const log: ToolCallLog = {
      id: sha256(
        `${this.runId}:${stepId}:${toolName}:${stableStringify(logPayload)}`,
      ),
      runId: this.runId,
      stepId,
      toolName,
      permissionTier: tool.permissionTier,
      args: logPayload,
      timestamp: this.clock().toISOString(),
    };
    this.logs.push(log);
    return tool.handler(parsed as TArgs) as Promise<TResult>;
  }

  listLogs(): ToolCallLog[] {
    return [...this.logs];
  }
}
