import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  ParentBasedSampler,
  AlwaysOnSampler,
  SpanProcessor,
  ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { scrub } from "../middleware/pii-scrub"; // Import scrub function
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

class PiiRedactingSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  onStart(span: ReadableSpan): void {
    // Redact PII from span attributes
    for (const key in span.attributes) {
      if (typeof span.attributes[key] === "string") {
        span.attributes[key] = scrub(span.attributes[key] as string);
      }
    }
  }
  onEnd(span: ReadableSpan): void {
    // Redact PII from span events
    for (const event of span.events) {
      for (const key in event.attributes) {
        if (typeof event.attributes[key] === "string") {
          event.attributes[key] = scrub(event.attributes[key] as string);
        }
      }
    }
  }
}

if (process.env.OTEL_ENABLED === "true") {
  new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: "maestro-gateway",
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    sampler: new ParentBasedSampler(new AlwaysOnSampler()), // Placeholder for more complex sampling
    spanProcessor: new PiiRedactingSpanProcessor(), // Add PII redacting span processor
  }).start();
} else {
  console.log("OpenTelemetry is disabled for gateway.");
}
