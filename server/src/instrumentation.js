"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopOTEL = stopOTEL;
// @ts-nocheck
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
// Set up diagnostics logging
api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.INFO);
const resource = new resources_1.Resource({
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'summit-api',
    [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});
// Configure Trace Exporter
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
});
// Configure Metric Exporter
const metricExporter = new exporter_metrics_otlp_http_1.OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
});
const sdk = new sdk_node_1.NodeSDK({
    resource,
    traceExporter,
    metricReader: new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
    }),
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            '@opentelemetry/instrumentation-http': {
                ignoreIncomingRequestHook: (req) => {
                    // Ignore health checks and static assets to reduce noise
                    return req.url?.includes('/health') || req.url?.includes('/metrics') || false;
                },
            },
            '@opentelemetry/instrumentation-express': {},
            '@opentelemetry/instrumentation-pg': {},
            '@opentelemetry/instrumentation-redis': {},
            '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
    ],
});
// Auto-start using top-level await (requires ESM)
try {
    await sdk.start();
    console.log('OpenTelemetry SDK started successfully');
}
catch (error) {
    console.error('Error starting OpenTelemetry SDK:', error);
}
async function stopOTEL() {
    try {
        await sdk.shutdown();
        console.log('OpenTelemetry SDK shut down successfully');
    }
    catch (error) {
        console.error('Error shutting down OpenTelemetry SDK:', error);
    }
}
