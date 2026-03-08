"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const pii_scrub_1 = require("../middleware/pii-scrub"); // Import scrub function
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
class PiiRedactingSpanProcessor {
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
    onStart(span) {
        // Redact PII from span attributes
        for (const key in span.attributes) {
            if (typeof span.attributes[key] === 'string') {
                span.attributes[key] = (0, pii_scrub_1.scrub)(span.attributes[key]);
            }
        }
    }
    onEnd(span) {
        // Redact PII from span events
        for (const event of span.events) {
            for (const key in event.attributes) {
                if (typeof event.attributes[key] === 'string') {
                    event.attributes[key] = (0, pii_scrub_1.scrub)(event.attributes[key]);
                }
            }
        }
    }
}
if (process.env.OTEL_ENABLED === 'true') {
    new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: 'maestro-gateway',
        }),
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
        sampler: new sdk_trace_base_1.ParentBasedSampler(new sdk_trace_base_1.AlwaysOnSampler()), // Placeholder for more complex sampling
        spanProcessor: new PiiRedactingSpanProcessor(), // Add PII redacting span processor
    }).start();
}
else {
    console.log('OpenTelemetry is disabled for gateway.');
}
