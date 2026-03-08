"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk = new sdk_node_1.NodeSDK({
    traceExporter: new sdk_trace_node_1.ConsoleSpanExporter(),
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
sdk.start();
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
