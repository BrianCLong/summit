"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOtel = initOtel;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_fetch_1 = require("@opentelemetry/instrumentation-fetch");
const context_zone_1 = require("@opentelemetry/context-zone");
const sdk_trace_base_2 = require("@opentelemetry/sdk-trace-base");
const core_1 = require("@opentelemetry/core");
function initOtel(config = {}) {
    const resource = new resources_1.Resource({
        "service.name": config.serviceName || "web-client",
        "deployment.environment": config.environment || process.env.NEXT_PUBLIC_ENV || "local",
    });
    const provider = new sdk_trace_web_1.WebTracerProvider({ resource });
    provider.addSpanProcessor(new sdk_trace_base_2.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
    if (config.otlpEndpoint) {
        provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
    }
    provider.register({
        contextManager: new context_zone_1.ZoneContextManager(),
        propagator: new core_1.W3CTraceContextPropagator(),
    });
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            new instrumentation_fetch_1.FetchInstrumentation({
                propagateTraceHeaderCorsUrls: [/.*/],
                clearTimingResources: true,
                applyCustomAttributesOnSpan: (span, request) => {
                    span.setAttribute("journey.id", request.headers.get("x-journey-id") || "");
                    span.setAttribute("journey.step", request.headers.get("x-journey-step") || "");
                    span.setAttribute("feature.flags", config.featureFlagset || "");
                },
            }),
        ],
    });
    core_1.propagation.setGlobalPropagator(new core_1.W3CTraceContextPropagator());
}
