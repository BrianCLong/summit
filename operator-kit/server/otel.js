"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318/v1/traces',
});
const sdk = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'symphony-operator-kit',
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: exporter,
    instrumentations: [new instrumentation_express_1.ExpressInstrumentation(), new instrumentation_http_1.HttpInstrumentation()],
});
sdk.start();
console.log('OpenTelemetry SDK started.');
