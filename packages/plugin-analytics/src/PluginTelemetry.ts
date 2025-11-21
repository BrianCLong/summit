import { trace, SpanKind, context, Span, Tracer } from '@opentelemetry/api';

/**
 * Telemetry wrapper for plugin tracing
 */
export class PluginTelemetry {
  private tracer: Tracer;
  private pluginId: string;

  constructor(pluginId: string, serviceName: string = 'plugin-system') {
    this.pluginId = pluginId;
    this.tracer = trace.getTracer(serviceName);
  }

  /**
   * Start a new span for plugin operation
   */
  startSpan(operationName: string, attributes?: Record<string, any>): Span {
    return this.tracer.startSpan(`plugin.${this.pluginId}.${operationName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'plugin.id': this.pluginId,
        ...attributes,
      },
    });
  }

  /**
   * Trace an async operation
   */
  async trace<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.startSpan(operationName, attributes);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Record a plugin event
   */
  recordEvent(eventName: string, attributes?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(eventName, {
        'plugin.id': this.pluginId,
        ...attributes,
      });
    }
  }

  /**
   * Add attributes to current span
   */
  setAttributes(attributes: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }
    }
  }
}
