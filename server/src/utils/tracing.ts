/**
 * Interface for a tracing span.
 * Abstraction for OpenTelemetry spans to allow decoupling.
 */
export interface Span {
  /**
   * Sets multiple attributes on the span.
   * @param {Record<string, unknown>} attributes - The attributes to set.
   */
  setAttributes(attributes: Record<string, unknown>): void;

  /**
   * Sets a single attribute on the span.
   * @param {string} key - The attribute key.
   * @param {unknown} value - The attribute value.
   */
  setAttribute(key: string, value: unknown): void;

  /**
   * Records an exception on the span.
   * @param {Error} error - The error to record.
   */
  recordException(error: Error): void;

  /**
   * Ends the span.
   */
  end(): void;
}

/**
 * A no-operation implementation of the Span interface.
 * Used when tracing is disabled or unavailable.
 */
class NoopSpan implements Span {
  /**
   * Creates a new NoopSpan.
   * @param {string} name - The name of the span.
   */
  constructor(private readonly name: string) {}

  setAttributes(_attributes: Record<string, unknown>): void {}

  setAttribute(_key: string, _value: unknown): void {}

  recordException(_error: Error): void {}

  end(): void {}
}

/**
 * A simple tracer wrapper.
 * Provides a mechanism to start active spans, defaulting to no-op if not fully implemented.
 */
export const tracer = {
  /**
   * Starts a new active span and executes the handler within its context.
   *
   * @template T
   * @param {string} name - The name of the span.
   * @param {(span: Span) => Promise<T> | T} handler - The function to execute.
   * @returns {Promise<T>} The result of the handler.
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
