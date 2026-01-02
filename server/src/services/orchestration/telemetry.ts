import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export const tracer = trace.getTracer('agent-orchestrator');

export async function traceTask<T>(taskName: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(taskName, async (span: any) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
      throw err;
    } finally {
      span.end();
    }
  });
}
