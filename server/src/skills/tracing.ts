import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';

const tracer = trace.getTracer('skills-controller-runtime', '1.0.0');

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>,
): Promise<{ result: T; span: Span; durationMs: number }>
export async function withSpan<T>(
  name: string,
  fn: () => T,
  attributes?: Record<string, unknown>,
): Promise<{ result: T; span: Span; durationMs: number }>
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T> | T,
  attributes: Record<string, unknown> = {},
): Promise<{ result: T; span: Span; durationMs: number }> {
  const span = tracer.startSpan(name, { attributes });
  const started = performance.now();
  try {
    const result = await Promise.resolve(fn());
    span.setStatus({ code: SpanStatusCode.OK });
    return { result, span, durationMs: performance.now() - started };
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
}
