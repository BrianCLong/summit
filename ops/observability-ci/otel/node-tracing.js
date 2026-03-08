"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTracing = initTracing;
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_base_2 = require("@opentelemetry/sdk-trace-base");
const instrumentation_1 = require("@opentelemetry/instrumentation");
function initTracing(serviceName) {
    const provider = new sdk_trace_node_1.NodeTracerProvider();
    provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_2.ConsoleSpanExporter()));
    provider.register();
    (0, instrumentation_1.registerInstrumentations)({});
    return provider.getTracer(serviceName);
}
