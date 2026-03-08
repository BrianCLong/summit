"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = void 0;
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_document_load_1 = require("@opentelemetry/instrumentation-document-load");
const instrumentation_user_interaction_1 = require("@opentelemetry/instrumentation-user-interaction");
const instrumentation_fetch_1 = require("@opentelemetry/instrumentation-fetch");
const context_zone_1 = require("@opentelemetry/context-zone");
const collectorUrl = 'http://localhost:4318/v1/traces';
const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: collectorUrl,
});
const spanProcessor = new sdk_trace_base_1.BatchSpanProcessor(exporter);
const provider = new sdk_trace_web_1.WebTracerProvider({
    resource: (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: 'webapp-frontend',
    }),
    // @ts-ignore - spanProcessors might be missing in type definition but present in implementation of BasicTracerProvider
    spanProcessors: [spanProcessor],
});
provider.register({
    contextManager: new context_zone_1.ZoneContextManager(),
});
(0, instrumentation_1.registerInstrumentations)({
    instrumentations: [
        new instrumentation_document_load_1.DocumentLoadInstrumentation(),
        new instrumentation_user_interaction_1.UserInteractionInstrumentation({
            eventNames: ['click', 'submit'],
        }),
        new instrumentation_fetch_1.FetchInstrumentation({
            propagateTraceHeaderCorsUrls: [
                /localhost:5001/,
                /localhost:3000/,
                /\/api\//,
            ],
            clearTimingResources: true,
        }),
    ],
});
exports.tracer = provider.getTracer('webapp-frontend');
console.log('OpenTelemetry initialized for webapp');
