import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone';

const collectorUrl = 'http://localhost:4318/v1/traces';

const exporter = new OTLPTraceExporter({
  url: collectorUrl,
});

const spanProcessor = new BatchSpanProcessor(exporter);

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'webapp-frontend',
  }),
  // @ts-ignore - spanProcessors might be missing in type definition but present in implementation of BasicTracerProvider
  spanProcessors: [spanProcessor],
});

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation({
      eventNames: ['click', 'submit'],
    }),
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /localhost:5001/,
        /localhost:3000/,
        /\/api\//,
      ],
      clearTimingResources: true,
    }),
  ],
});

export const tracer = provider.getTracer('webapp-frontend');

console.log('OpenTelemetry initialized for webapp');
