/**
 * Interface representing a tracing span.
 *
 * This provides an abstraction over OpenTelemetry spans or other tracing implementations.
 */
export interface Span {
  /**
   * Sets multiple attributes on the span.
   * @param attributes - A key-value map of attributes.
   */
  setAttributes(attributes: Record<string, unknown>): void;

  /**
   * Sets a single attribute on the span.
   * @param key - The attribute key.
   * @param value - The attribute value.
   */
  setAttribute(key: string, value: unknown): void;

  /**
   * Records an exception on the span.
   * @param error - The error object to record.
   */
  recordException(error: Error): void;

  /**
   * Ends the span.
   */
  end(): void;
}

class NoopSpan implements Span {
  constructor(private readonly name: string) {}

  setAttributes(_attributes: Record<string, unknown>): void {}

  setAttribute(_key: string, _value: unknown): void {}

  recordException(_error: Error): void {}

  end(): void {}
}

/**
 * A lightweight tracer utility for instrumenting code blocks.
 *
 * Currently implements a No-Op strategy but can be extended to support real tracing.
 */
export const tracer = {
  /**
   * Starts a new active span and executes the provided handler.
   *
   * @typeParam T - The return type of the handler.
   * @param name - The name of the span.
   * @param handler - A function that receives the span and performs the work.
   * @returns The result of the handler.
   */
  async startActiveSpan<T>(
    name: string,
    handler: (span: Span) => Promise<T> | T,
  ): Promise<T> {
    const span = new NoopSpan(name);
    try {
      return await handler(span);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  },
};

export { NoopSpan as SpanImpl };
