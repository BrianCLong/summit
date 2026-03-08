"use strict";
/**
 * GraphQL Gateway Metrics
 * Prometheus metrics for Apollo Federation monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gqlLatency = void 0;
exports.recordQueryDuration = recordQueryDuration;
exports.recordError = recordError;
exports.recordResolverDuration = recordResolverDuration;
exports.recordQueryComplexity = recordQueryComplexity;
exports.recordCacheHit = recordCacheHit;
exports.recordCacheMiss = recordCacheMiss;
exports.recordGoldenPathSuccess = recordGoldenPathSuccess;
exports.recordGoldenPathError = recordGoldenPathError;
exports.getOperationInfo = getOperationInfo;
const instrumentation_1 = require("./instrumentation");
const prom_client_1 = __importDefault(require("prom-client")); // Add prom-client for manual registry if needed, though OTEL is preferred.
// Requested export for Day-3
exports.gqlLatency = new prom_client_1.default.Histogram({
    name: "gateway_graphql_latency",
    help: "ms",
    buckets: [50, 100, 200, 400, 800, 1600, 3200]
});
// Histogram for query duration (milliseconds)
const queryDurationHistogram = instrumentation_1.meter.createHistogram('graphql_query_duration_ms', {
    description: 'GraphQL query execution duration in milliseconds',
    unit: 'ms',
    advice: {
        explicitBucketBoundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    },
});
// Counter for total requests
const requestsCounter = instrumentation_1.meter.createCounter('graphql_requests_total', {
    description: 'Total GraphQL requests',
});
// Counter for errors
const errorsCounter = instrumentation_1.meter.createCounter('graphql_errors_total', {
    description: 'Total GraphQL errors',
});
// Histogram for resolver duration
const resolverDurationHistogram = instrumentation_1.meter.createHistogram('graphql_resolver_duration_ms', {
    description: 'GraphQL resolver execution duration in milliseconds',
    unit: 'ms',
    advice: {
        explicitBucketBoundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    },
});
// Gauge for query complexity
const queryComplexityGauge = instrumentation_1.meter.createUpDownCounter('graphql_query_complexity', {
    description: 'GraphQL query complexity score',
});
// Cache metrics
const cacheHitsCounter = instrumentation_1.meter.createCounter('graphql_cache_hits_total', {
    description: 'GraphQL cache hits',
});
const cacheMissesCounter = instrumentation_1.meter.createCounter('graphql_cache_misses_total', {
    description: 'GraphQL cache misses',
});
// Golden path metrics
const goldenPathSuccessCounter = instrumentation_1.meter.createCounter('golden_path_success_total', {
    description: 'Golden path step successes',
});
const goldenPathDurationHistogram = instrumentation_1.meter.createHistogram('golden_path_duration_ms', {
    description: 'Golden path step duration in milliseconds',
    unit: 'ms',
});
const goldenPathErrorsCounter = instrumentation_1.meter.createCounter('golden_path_errors_total', {
    description: 'Golden path step errors',
});
// Metric recording functions
function recordQueryDuration(operationName, operationType, durationMs, status) {
    queryDurationHistogram.record(durationMs, {
        operation: operationName || 'anonymous',
        operationType,
        status,
    });
    requestsCounter.add(1, {
        operation: operationName || 'anonymous',
        operationType,
        status,
    });
}
function recordError(operationName, errorType, errorCode) {
    errorsCounter.add(1, {
        operation: operationName || 'anonymous',
        errorType,
        errorCode: errorCode || 'unknown',
    });
}
function recordResolverDuration(typeName, fieldName, durationMs, status) {
    resolverDurationHistogram.record(durationMs, {
        typeName,
        fieldName,
        status,
    });
}
function recordQueryComplexity(operationName, complexity) {
    queryComplexityGauge.add(complexity, {
        operation: operationName || 'anonymous',
    });
}
function recordCacheHit(operationName) {
    cacheHitsCounter.add(1, {
        operation: operationName || 'anonymous',
    });
}
function recordCacheMiss(operationName) {
    cacheMissesCounter.add(1, {
        operation: operationName || 'anonymous',
    });
}
// Golden path metrics
function recordGoldenPathSuccess(step, durationMs) {
    goldenPathSuccessCounter.add(1, { step });
    goldenPathDurationHistogram.record(durationMs, { step });
}
function recordGoldenPathError(step, errorType) {
    goldenPathErrorsCounter.add(1, { step, errorType });
}
// Helper to extract operation info from request context
function getOperationInfo(requestContext) {
    const operationName = requestContext.request.operationName || null;
    const operation = requestContext.operation;
    let operationType = 'unknown';
    if (operation) {
        operationType = operation.operation; // 'query', 'mutation', 'subscription'
    }
    return { operationName, operationType };
}
