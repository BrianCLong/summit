// @ts-nocheck
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  SpanProcessor,
  ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { Resource } from '@opentelemetry/resources'; // Assuming this import
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'; // Assuming this import
import { scrub } from '../../services/api'; // Assuming scrub function is available or can be imported

// Custom SpanProcessor for PII redaction in UI
class PiiRedactingWebSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  onStart(span: ReadableSpan): void {
    // Redact PII from span attributes
    for (const key in span.attributes) {
      if (typeof span.attributes[key] === 'string') {
        span.attributes[key] = scrub(span.attributes[key] as string);
      }
    }
  }
  onEnd(span: ReadableSpan): void {
    // Redact PII from span events
    for (const event of span.events) {
      for (const key in event.attributes) {
        if (typeof event.attributes[key] === 'string') {
          event.attributes[key] = scrub(event.attributes[key] as string);
        }
        d;
      }
    }
  }
}

const provider = new WebTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'maestro-ui',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
});
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.addSpanProcessor(new PiiRedactingWebSpanProcessor()); // Add PII redacting processor
provider.register(); // W3C TraceContext
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({ propagateTraceHeaderCorsUrls: /.*/ }),
  ],
});
// @ts-nocheck
