/**
 * Guardrail Abstraction
 *
 * Provides a standardized way to enforce input/output validation, sanitization,
 * and policy checks across any service method.
 */

export interface GuardResult<T> {
  allowed: boolean;
  data: T; // The (possibly transformed/sanitized) data
  reason?: string;
  metadata?: Record<string, any>;
}

export interface Guard<T> {
  validate(data: T, context?: any): Promise<GuardResult<T>>;
}

export class GuardrailPipeline<TInput, TOutput> {
  private inputGuards: Guard<TInput>[] = [];
  private outputGuards: Guard<TOutput>[] = [];

  /**
   * Add a guard that validates and optionally transforms the input.
   */
  addInputGuard(guard: Guard<TInput>) {
    this.inputGuards.push(guard);
    return this;
  }

  /**
   * Add a guard that validates and optionally transforms the output.
   */
  addOutputGuard(guard: Guard<TOutput>) {
    this.outputGuards.push(guard);
    return this;
  }

  /**
   * Execute the protected function through the guardrail pipeline.
   */
  async execute(
    input: TInput,
    executor: (input: TInput) => Promise<TOutput>,
    context?: any
  ): Promise<TOutput> {
    // Input Guards
    let currentInput = input;
    for (const guard of this.inputGuards) {
      const result = await guard.validate(currentInput, context);
      if (!result.allowed) {
        const error = new Error(`Guardrail blocked input: ${result.reason}`);
        (error as any).code = 'GUARDRAIL_VIOLATION';
        (error as any).metadata = result.metadata;
        throw error;
      }
      currentInput = result.data;
    }

    // Execution
    const output = await executor(currentInput);

    // Output Guards
    let currentOutput = output;
    for (const guard of this.outputGuards) {
      const result = await guard.validate(currentOutput, context);
      if (!result.allowed) {
        const error = new Error(`Guardrail blocked output: ${result.reason}`);
        (error as any).code = 'GUARDRAIL_VIOLATION';
        (error as any).metadata = result.metadata;
        throw error;
      }
      currentOutput = result.data;
    }

    return currentOutput;
  }
}
