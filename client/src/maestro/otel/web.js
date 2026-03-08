"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_fetch_1 = require("@opentelemetry/instrumentation-fetch");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// Internal PII scrubbing logic
const scrub = (val) => val.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
// Custom SpanProcessor for PII redaction in UI
class PiiRedactingWebSpanProcessor {
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
    onStart(span, _parentContext) {
        // Redact PII from span attributes
        for (const key in span.attributes) {
            if (typeof span.attributes[key] === 'string') {
                span.attributes[key] = scrub(span.attributes[key]);
            }
        }
    }
    onEnd(span) {
        // Redact PII from span events
        for (const event of span.events) {
            for (const key in event.attributes) {
                if (typeof event.attributes[key] === 'string') {
                    event.attributes[key] = scrub(event.attributes[key]);
                }
            }
        }
    }
}
const provider = new sdk_trace_web_1.WebTracerProvider({
    resource: (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: 'maestro-ui',
        [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
});
provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
provider.addSpanProcessor(new PiiRedactingWebSpanProcessor()); // Add PII redacting processor
provider.register(); // W3C TraceContext
(0, instrumentation_1.registerInstrumentations)({
    instrumentations: [
        new instrumentation_fetch_1.FetchInstrumentation({ propagateTraceHeaderCorsUrls: /.*/ }),
    ],
});
