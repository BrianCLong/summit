"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOTEL = startOTEL;
exports.stopOTEL = stopOTEL;
// @ts-nocheck
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const resource = new resources_1.Resource({
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'api',
    [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'dev',
});
const sdk = new sdk_node_1.NodeSDK({
    resource,
    traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    }),
    metricReader: new exporter_prometheus_1.PrometheusExporter({
        port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
    }),
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            ' @opentelemetry/instrumentation-http': {
                ignoreIncomingRequestHook: () => false,
            },
            ' @opentelemetry/instrumentation-express': {},
        }),
    ],
});
async function startOTEL() {
    await sdk.start();
}
async function stopOTEL() {
    await sdk.shutdown();
}
