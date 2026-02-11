import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export function traceOperation<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('summit');

  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      const result = await fn();

      span.setStatus({ code: SpanStatusCode.OK });
      try {
        span.setAttribute('result.size', JSON.stringify(result).length);
      } catch (e) {
        // Ignore JSON stringify errors (circular, etc)
      }

      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
