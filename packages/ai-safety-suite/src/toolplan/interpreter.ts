import crypto from "crypto";

export type ArgType = "string" | "number" | "boolean" | "object";

export interface ArgsSchemaField {
  type: ArgType;
  required?: boolean;
}

export interface ToolPlanStep {
  toolName: string;
  args: Record<string, unknown>;
  argsSchema: Record<string, ArgsSchemaField>;
  expectedResultSchema?: Record<string, ArgsSchemaField>;
  timeoutMs?: number;
}

export interface ToolPlan {
  steps: ToolPlanStep[];
}

export interface ToolExecutionLog {
  correlationId: string;
  step: number;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  redacted: boolean;
}

export interface ExecutionResult {
  logs: ToolExecutionLog[];
}

export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export class ToolPlanInterpreter {
  constructor(
    private allowedTools: string[],
    private maxSteps = 10,
    private tools: Record<string, ToolExecutor> = {}
  ) {}

  validate(plan: ToolPlan): void {
    if (plan.steps.length === 0) {
      throw new Error("Tool plan must include at least one step");
    }
    if (plan.steps.length > this.maxSteps) {
      throw new Error(`Tool plan exceeds maximum steps (${this.maxSteps})`);
    }
    plan.steps.forEach((step, index) => {
      if (!this.allowedTools.includes(step.toolName)) {
        throw new Error(`Tool ${step.toolName} not allowlisted`);
      }
      this.validateArgs(step.args, step.argsSchema, index);
    });
  }

  private validateArgs(
    args: Record<string, unknown>,
    schema: Record<string, ArgsSchemaField>,
    index: number
  ): void {
    const schemaKeys = Object.keys(schema);
    for (const key of schemaKeys) {
      const field = schema[key];
      const value = args[key];
      if (field.required && value === undefined) {
        throw new Error(`Step ${index} missing required arg ${key}`);
      }
      if (value !== undefined && typeof value !== field.type) {
        throw new Error(
          `Step ${index} arg ${key} expected ${field.type} but received ${typeof value}`
        );
      }
    }
    for (const argKey of Object.keys(args)) {
      if (!schemaKeys.includes(argKey)) {
        throw new Error(`Step ${index} has unexpected arg ${argKey}`);
      }
    }
  }

  async run(plan: ToolPlan, context: { correlationId?: string } = {}): Promise<ExecutionResult> {
    this.validate(plan);
    const logs: ToolExecutionLog[] = [];
    const correlationId = context.correlationId ?? crypto.randomUUID();

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const executor = this.tools[step.toolName];
      if (!executor) {
        throw new Error(`Executor for ${step.toolName} not registered`);
      }
      const output = await executor(step.args);
      logs.push({
        correlationId,
        step: i,
        toolName: step.toolName,
        input: step.args,
        output: this.redactOutput(output),
        redacted: typeof output === "string" && output.includes("SECRET"),
      });
    }

    return { logs };
  }

  private redactOutput(output: unknown): unknown {
    if (typeof output === "string") {
      return output.replace(/SECRET/gi, "[REDACTED]");
    }
    return output;
  }
}
