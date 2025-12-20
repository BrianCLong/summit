/**
 * Interface representing a distributed tracing span.
 * Follows the OpenTelemetry Span interface.
 */
export interface Span {
  /**
   * Sets attributes on the span.
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
   * @param error - The error object.
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

export const tracer = {
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
