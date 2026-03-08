"use strict";
/**
 * @intelgraph/platform-telemetry
 *
 * Unified telemetry SDK for Summit platform.
 * Implements Prompts 31-32: Metrics Taxonomy and Distributed Tracing
 *
 * Features:
 * - Standardized metrics taxonomy with Prometheus export
 * - OpenTelemetry-based distributed tracing
 * - Pre-configured instrumentations for common libraries
 * - Summit-specific span attributes and conventions
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitAttributes = exports.spans = exports.Trace = exports.traced = exports.extractTraceContext = exports.getTraceContext = exports.recordSpanError = exports.setSpanAttributes = exports.withSpan = exports.createSpan = exports.getTracer = exports.shutdownTracing = exports.initializeTracing = exports.cacheMetrics = exports.dbMetrics = exports.httpMetrics = exports.getMetricsRegistry = exports.MetricsRegistry = exports.getMetricByName = exports.getAllMetrics = exports.RuntimeMetrics = exports.BusinessMetrics = exports.CacheMetrics = exports.GraphMetrics = exports.DatabaseMetrics = exports.HTTPMetrics = exports.StandardLabels = exports.MetricsTaxonomy = void 0;
exports.initializeTelemetry = initializeTelemetry;
// Metrics exports
__exportStar(require("./metrics/taxonomy.js"), exports);
__exportStar(require("./metrics/registry.js"), exports);
// Tracing exports
__exportStar(require("./tracing/tracer.js"), exports);
// Re-export commonly used types
var taxonomy_js_1 = require("./metrics/taxonomy.js");
Object.defineProperty(exports, "MetricsTaxonomy", { enumerable: true, get: function () { return taxonomy_js_1.MetricsTaxonomy; } });
Object.defineProperty(exports, "StandardLabels", { enumerable: true, get: function () { return taxonomy_js_1.StandardLabels; } });
Object.defineProperty(exports, "HTTPMetrics", { enumerable: true, get: function () { return taxonomy_js_1.HTTPMetrics; } });
Object.defineProperty(exports, "DatabaseMetrics", { enumerable: true, get: function () { return taxonomy_js_1.DatabaseMetrics; } });
Object.defineProperty(exports, "GraphMetrics", { enumerable: true, get: function () { return taxonomy_js_1.GraphMetrics; } });
Object.defineProperty(exports, "CacheMetrics", { enumerable: true, get: function () { return taxonomy_js_1.CacheMetrics; } });
Object.defineProperty(exports, "BusinessMetrics", { enumerable: true, get: function () { return taxonomy_js_1.BusinessMetrics; } });
Object.defineProperty(exports, "RuntimeMetrics", { enumerable: true, get: function () { return taxonomy_js_1.RuntimeMetrics; } });
Object.defineProperty(exports, "getAllMetrics", { enumerable: true, get: function () { return taxonomy_js_1.getAllMetrics; } });
Object.defineProperty(exports, "getMetricByName", { enumerable: true, get: function () { return taxonomy_js_1.getMetricByName; } });
var registry_js_1 = require("./metrics/registry.js");
Object.defineProperty(exports, "MetricsRegistry", { enumerable: true, get: function () { return registry_js_1.MetricsRegistry; } });
Object.defineProperty(exports, "getMetricsRegistry", { enumerable: true, get: function () { return registry_js_1.getMetricsRegistry; } });
Object.defineProperty(exports, "httpMetrics", { enumerable: true, get: function () { return registry_js_1.httpMetrics; } });
Object.defineProperty(exports, "dbMetrics", { enumerable: true, get: function () { return registry_js_1.dbMetrics; } });
Object.defineProperty(exports, "cacheMetrics", { enumerable: true, get: function () { return registry_js_1.cacheMetrics; } });
var tracer_js_1 = require("./tracing/tracer.js");
Object.defineProperty(exports, "initializeTracing", { enumerable: true, get: function () { return tracer_js_1.initializeTracing; } });
Object.defineProperty(exports, "shutdownTracing", { enumerable: true, get: function () { return tracer_js_1.shutdownTracing; } });
Object.defineProperty(exports, "getTracer", { enumerable: true, get: function () { return tracer_js_1.getTracer; } });
Object.defineProperty(exports, "createSpan", { enumerable: true, get: function () { return tracer_js_1.createSpan; } });
Object.defineProperty(exports, "withSpan", { enumerable: true, get: function () { return tracer_js_1.withSpan; } });
Object.defineProperty(exports, "setSpanAttributes", { enumerable: true, get: function () { return tracer_js_1.setSpanAttributes; } });
Object.defineProperty(exports, "recordSpanError", { enumerable: true, get: function () { return tracer_js_1.recordSpanError; } });
Object.defineProperty(exports, "getTraceContext", { enumerable: true, get: function () { return tracer_js_1.getTraceContext; } });
Object.defineProperty(exports, "extractTraceContext", { enumerable: true, get: function () { return tracer_js_1.extractTraceContext; } });
Object.defineProperty(exports, "traced", { enumerable: true, get: function () { return tracer_js_1.traced; } });
Object.defineProperty(exports, "Trace", { enumerable: true, get: function () { return tracer_js_1.Trace; } });
Object.defineProperty(exports, "spans", { enumerable: true, get: function () { return tracer_js_1.spans; } });
Object.defineProperty(exports, "SummitAttributes", { enumerable: true, get: function () { return tracer_js_1.SummitAttributes; } });
const tracer_js_2 = require("./tracing/tracer.js");
const registry_js_2 = require("./metrics/registry.js");
/**
 * Initialize all telemetry systems
 */
function initializeTelemetry(config = {}) {
    const tracer = config.tracing ? (0, tracer_js_2.initializeTracing)(config.tracing) : null;
    const metrics = (0, registry_js_2.getMetricsRegistry)(config.metrics);
    return {
        tracer: tracer,
        metrics,
    };
}
