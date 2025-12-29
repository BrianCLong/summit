import { z } from 'zod';
import { SandboxValidator } from './sandbox.js';

export interface SafeToolExecutionContext {
  dryRun?: boolean;
  sandboxValidator?: SandboxValidator;
}

export class SafeTool<TInput, TResult> {
  constructor(
    private readonly name: string,
    private readonly inputSchema: z.ZodSchema<TInput>,
    private readonly executor: (input: TInput) => Promise<TResult> | TResult,
    private readonly redactor: (result: TResult) => TResult,
  ) {}

  async run(input: unknown, context: SafeToolExecutionContext = {}): Promise<{ result: TResult; redacted: TResult }>
  {
    const parsed = this.inputSchema.parse(input);

    if (context.sandboxValidator) {
      const sandboxDecision = context.sandboxValidator.validate({ command: this.name, args: [], payload: parsed });
      if (!sandboxDecision.allowed) {
        throw new Error(`Sandbox validation failed: ${sandboxDecision.reasons.join('; ')}`);
      }
    }

    if (context.dryRun) {
      return { result: parsed as unknown as TResult, redacted: this.redactor(parsed as unknown as TResult) };
    }

    const executionResult = await this.executor(parsed);
    return { result: executionResult, redacted: this.redactor(executionResult) };
  }
}

export const redactSecrets = <T extends Record<string, unknown>>(result: T): T => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result)) {
    if (/token|secret|password/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
};
