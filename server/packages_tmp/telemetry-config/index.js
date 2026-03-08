"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = void 0;
// @ts-ignore
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
// @ts-ignore
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
// @ts-ignore
const resources_1 = require("@opentelemetry/resources");
// @ts-ignore
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// @ts-ignore
const sdk_node_1 = require("@opentelemetry/sdk-node");
const initTelemetry = (serviceName) => {
    const traceExporter = new exporter_trace_otlp_grpc_1.OTLPTraceExporter({
        url: 'grpc://otel-collector:4317',
    });
    const sdk = new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
        traceExporter,
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    });
    sdk.start();
    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => { })
            .catch(() => { })
            .finally(() => process.exit(0));
    });
    return sdk;
};
exports.initTelemetry = initTelemetry;
