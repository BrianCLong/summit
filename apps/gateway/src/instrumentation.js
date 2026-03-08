"use strict";
/**
 * OpenTelemetry Instrumentation for GraphQL Gateway
 * Provides comprehensive tracing and metrics for Apollo Federation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.meter = exports.sdk = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const resources = __importStar(require("@opentelemetry/resources"));
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const environment = process.env.NODE_ENV || 'development';
const serviceName = 'graphql-gateway';
const serviceVersion = process.env.SERVICE_VERSION || '0.1.0';
// OTLP collector endpoint (from docker-compose.observability.yml)
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
// Resource attributes
const resource = new resources.Resource({
    [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: serviceName,
    [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
});
// Prometheus exporter for metrics (scraping endpoint)
const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
    port: 9464, // Metrics endpoint on /metrics
}, () => {
    console.log(`Prometheus metrics available at http://localhost:9464/metrics`);
});
// OTLP exporters
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
});
const metricExporter = new exporter_metrics_otlp_http_1.OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
});
// Metric reader for periodic export
const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // Export every 10s
});
// Initialize OpenTelemetry SDK
exports.sdk = new sdk_node_1.NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            '@opentelemetry/instrumentation-http': {
                enabled: true,
                ignoreIncomingRequestHook: (req) => {
                    // Don't trace health checks
                    return req.url?.startsWith('/health') ?? false;
                },
            },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-graphql': {
                enabled: true,
                mergeItems: true,
                allowValues: false, // Don't log variable values (PII risk)
            },
        }),
    ],
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    try {
        await exports.sdk.shutdown();
        console.log('OpenTelemetry SDK shut down successfully');
    }
    catch (error) {
        console.error('Error shutting down OpenTelemetry SDK', error);
    }
});
// Start SDK
exports.sdk.start();
console.log(`OpenTelemetry initialized for ${serviceName} (${environment})`);
// Setup Prometheus metrics exporter separately for scraping
const meterProvider = new sdk_metrics_1.MeterProvider({
    resource,
    readers: [prometheusExporter],
});
exports.meter = meterProvider.getMeter(serviceName, serviceVersion);
