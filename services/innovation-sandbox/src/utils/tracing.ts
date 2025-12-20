import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('innovation-sandbox', '1.0.0');

/**
 * Wrap an async function with OpenTelemetry tracing
 */
export function traced<T extends unknown[], R>(
  name: string,
  fn: (...args: T) => Promise<R>,
  attributes?: Record<string, string | number | boolean>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return tracer.startActiveSpan(name, async (span: Span) => {
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  };
}

/**
 * Create a child span for detailed tracing
 */
export function createSpan(name: string): Span {
  return tracer.startSpan(name);
}

/**
 * Get the current active span
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an event on the current span
 */
export function recordEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}
