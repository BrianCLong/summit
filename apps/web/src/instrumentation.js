"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeInstrumentation = void 0;
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_document_load_1 = require("@opentelemetry/instrumentation-document-load");
const instrumentation_user_interaction_1 = require("@opentelemetry/instrumentation-user-interaction");
const instrumentation_xml_http_request_1 = require("@opentelemetry/instrumentation-xml-http-request");
const instrumentation_fetch_1 = require("@opentelemetry/instrumentation-fetch");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const collectorUrl = 'http://localhost:4318/v1/traces';
// Initialize the OpenTelemetry SDK
const initializeInstrumentation = () => {
    const provider = new sdk_trace_web_1.WebTracerProvider({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-web',
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        }),
    });
    const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: collectorUrl,
    });
    provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(exporter));
    provider.register();
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            new instrumentation_document_load_1.DocumentLoadInstrumentation(),
            new instrumentation_user_interaction_1.UserInteractionInstrumentation(),
            new instrumentation_xml_http_request_1.XMLHttpRequestInstrumentation(),
            new instrumentation_fetch_1.FetchInstrumentation(),
        ],
        tracerProvider: provider,
    });
    console.log('OpenTelemetry instrumentation initialized');
};
exports.initializeInstrumentation = initializeInstrumentation;
