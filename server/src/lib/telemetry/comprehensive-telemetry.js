"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = void 0;
// @ts-nocheck
const metrics_js_1 = require("../observability/metrics.js");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// @deprecated - Use server/src/lib/observability/ instead
class ComprehensiveTelemetry {
    static instance;
    meter;
    // Performance counters
    subsystems;
    // Request/response timing
    requestDuration;
    activeConnections;
    activeConnectionsCount = 0;
    constructor() {
        // Legacy support: Reuse the OTel service or create a bridged meter
        // For now, we stub this to prevent breaking existing consumers but direct them to new metrics
        // Ideally this class should be deleted and consumers migrated.
        // We create a dummy meter provider for backward compat if needed,
        // but really we should just point to the new registry.
        const resource = new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server-legacy',
        });
        const meterProvider = new sdk_metrics_1.MeterProvider({ resource });
        this.meter = meterProvider.getMeter('intelgraph-server-telemetry-legacy');
        // Mocks to satisfy type checker while we migrate
        this.requestDuration = { record: () => { } };
        this.activeConnections = { add: (value) => { } };
        // Wire up subsystems to actual metrics
        this.subsystems = {
            database: {
                queries: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.dbQueriesTotal) {
                            // Use generic labels for legacy adapter usage
                            metrics_js_1.metrics.dbQueriesTotal.labels('unknown', 'query', 'ok').inc(value);
                        }
                    }
                },
                errors: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.dbQueriesTotal) {
                            metrics_js_1.metrics.dbQueriesTotal.labels('unknown', 'query', 'error').inc(value);
                        }
                    }
                },
                latency: {
                    record: (value) => {
                        if (metrics_js_1.metrics.dbQueryDuration) {
                            metrics_js_1.metrics.dbQueryDuration.labels('unknown', 'query').observe(value);
                        }
                        // Also update legacy metric
                        if (metrics_js_1.metrics.intelgraphDatabaseQueryDuration) {
                            metrics_js_1.metrics.intelgraphDatabaseQueryDuration.labels('unknown', 'query').observe(value);
                        }
                    }
                },
            },
            cache: {
                hits: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.intelgraphCacheHits)
                            metrics_js_1.metrics.intelgraphCacheHits.labels('redis').inc(value);
                        if (metrics_js_1.metrics.cacheHits)
                            metrics_js_1.metrics.cacheHits.inc(value);
                    }
                },
                misses: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.intelgraphCacheMisses)
                            metrics_js_1.metrics.intelgraphCacheMisses.inc(value);
                        if (metrics_js_1.metrics.cacheMisses)
                            metrics_js_1.metrics.cacheMisses.inc(value);
                    }
                },
                sets: { add: (value = 1) => { } },
                dels: { add: (value = 1) => { } },
            },
            api: {
                requests: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.stdHttpRequestsTotal) {
                            metrics_js_1.metrics.stdHttpRequestsTotal.labels('GET', 'unknown', '200').inc(value);
                        }
                    }
                },
                errors: {
                    add: (value = 1) => {
                        if (metrics_js_1.metrics.applicationErrors) {
                            metrics_js_1.metrics.applicationErrors.labels('api', 'error', 'high', 'general').inc(value);
                        }
                    }
                }
            },
        };
    }
    static getInstance() {
        if (!ComprehensiveTelemetry.instance) {
            ComprehensiveTelemetry.instance = new ComprehensiveTelemetry();
        }
        return ComprehensiveTelemetry.instance;
    }
    recordRequest(duration, attributes) {
        const labels = {
            method: String(attributes.method || 'GET'),
            route: String(attributes.route || 'unknown'),
            status_code: String(attributes.status || 200),
        };
        // Forward to standard metrics (for dashboard)
        if (metrics_js_1.metrics.stdHttpRequestDuration) {
            metrics_js_1.metrics.stdHttpRequestDuration.observe(labels, duration);
        }
        if (metrics_js_1.metrics.stdHttpRequestsTotal) {
            metrics_js_1.metrics.stdHttpRequestsTotal.inc(labels);
        }
        // Forward to legacy metric (intelgraph_ prefix)
        // Note: legacy metric uses 'status' label instead of 'status_code'
        const legacyLabels = {
            method: String(attributes.method || 'GET'),
            route: String(attributes.route || 'unknown'),
            status_code: String(attributes.status || 200),
        };
        metrics_js_1.metrics.httpRequestDuration.observe(legacyLabels, duration);
    }
    incrementActiveConnections() {
        this.activeConnectionsCount++;
        if (metrics_js_1.metrics.websocketConnections) {
            metrics_js_1.metrics.websocketConnections.inc();
        }
        // Also update legacy metric if possible, assuming single tenant or unknown
        if (metrics_js_1.metrics.intelgraphActiveConnections) {
            metrics_js_1.metrics.intelgraphActiveConnections.set({ tenant: 'unknown' }, this.activeConnectionsCount);
        }
    }
    decrementActiveConnections() {
        this.activeConnectionsCount--;
        if (metrics_js_1.metrics.websocketConnections) {
            metrics_js_1.metrics.websocketConnections.dec();
        }
        if (metrics_js_1.metrics.intelgraphActiveConnections) {
            metrics_js_1.metrics.intelgraphActiveConnections.set({ tenant: 'unknown' }, this.activeConnectionsCount);
        }
    }
    onMetric(_listener) {
        // No-op or reimplement if critical
    }
}
exports.telemetry = ComprehensiveTelemetry.getInstance();
