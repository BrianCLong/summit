export interface Span {
  setAttributes(attributes: Record<string, unknown>): void;
  setAttribute(key: string, value: unknown): void;
  recordException(error: Error): void;
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
