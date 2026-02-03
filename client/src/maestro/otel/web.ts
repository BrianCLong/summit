import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  SpanProcessor,
  ReadableSpan,
  Span,
} from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
// Internal PII scrubbing logic
const scrub = (val: string) =>
  val.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]',
  );

// Custom SpanProcessor for PII redaction in UI
class PiiRedactingWebSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  onStart(span: Span, _parentContext: Context): void {
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
      }
    }
  }
}

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
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
