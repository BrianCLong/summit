import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

const SERVICE_NAME = 'intelgraph-web';

export function initializeTelemetry() {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
  });

  const collectorUrl = import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';

  const exporter = new OTLPTraceExporter({
    url: collectorUrl,
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        ignoreUrls: [/.*localhost:8080\/sockjs-node.*/, /.*\/__vite_ping/],
        propagateTraceHeaderCorsUrls: [/.+/g],
      }),
      new XMLHttpRequestInstrumentation({
         ignoreUrls: [/.*localhost:8080\/sockjs-node.*/, /.*\/__vite_ping/],
         propagateTraceHeaderCorsUrls: [/.+/g],
      }),
    ],
  });

  console.log('OpenTelemetry initialized');
}

export function withSpan<T>(name: string, fn: () => T): T {
  const tracer = trace.getTracer(SERVICE_NAME);
  return tracer.startActiveSpan(name, (span: Span) => {
    try {
      const result = fn();
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
