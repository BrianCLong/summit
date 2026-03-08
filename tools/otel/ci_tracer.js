"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@opentelemetry/api");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const p = new sdk_trace_node_1.NodeTracerProvider();
p.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })));
p.register();
const tr = api_1.trace.getTracer('ci');
(async () => {
    const s = tr.startSpan(process.env.CI_STAGE || 'build');
    await new Promise((r) => setTimeout(r, 10));
    s.end();
})();
