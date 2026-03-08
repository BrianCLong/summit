"use strict";
/**
 * Time-Series Metrics Data Model
 *
 * Defines the core metric types, label strategies, and data structures
 * for the CompanyOS observability platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricUnits = exports.HistogramBuckets = exports.MetricSchema = exports.SummaryMetricSchema = exports.SummaryQuantileSchema = exports.HistogramMetricSchema = exports.HistogramBucketSchema = exports.GaugeMetricSchema = exports.CounterMetricSchema = exports.MetricNameSchema = exports.LabelSchema = exports.LabelCardinalityLimits = exports.StandardLabels = exports.AggregationType = exports.MetricType = void 0;
exports.formatMetricName = formatMetricName;
const zod_1 = require("zod");
// ============================================================================
// METRIC TYPE DEFINITIONS
// ============================================================================
/**
 * Supported metric types following Prometheus conventions
 */
var MetricType;
(function (MetricType) {
    /** Monotonically increasing value (e.g., total requests) */
    MetricType["COUNTER"] = "counter";
    /** Value that can go up or down (e.g., active connections) */
    MetricType["GAUGE"] = "gauge";
    /** Distribution of values in buckets (e.g., latencies) */
    MetricType["HISTOGRAM"] = "histogram";
    /** Client-side calculated quantiles (e.g., streaming percentiles) */
    MetricType["SUMMARY"] = "summary";
})(MetricType || (exports.MetricType = MetricType = {}));
/**
 * Aggregation methods for downsampling
 */
var AggregationType;
(function (AggregationType) {
    AggregationType["SUM"] = "sum";
    AggregationType["AVG"] = "avg";
    AggregationType["MIN"] = "min";
    AggregationType["MAX"] = "max";
    AggregationType["COUNT"] = "count";
    AggregationType["LAST"] = "last";
    AggregationType["FIRST"] = "first";
    AggregationType["P50"] = "p50";
    AggregationType["P90"] = "p90";
    AggregationType["P95"] = "p95";
    AggregationType["P99"] = "p99";
    AggregationType["RATE"] = "rate";
    AggregationType["IRATE"] = "irate";
    AggregationType["INCREASE"] = "increase";
})(AggregationType || (exports.AggregationType = AggregationType = {}));
// ============================================================================
// LABEL/TAG STRATEGY
// ============================================================================
/**
 * Standard label keys for multi-tenant metrics
 */
exports.StandardLabels = {
    // Identity labels
    SERVICE: 'service',
    TENANT: 'tenant',
    REGION: 'region',
    ENVIRONMENT: 'environment',
    VERSION: 'version',
    INSTANCE: 'instance',
    // Request labels
    METHOD: 'method',
    PATH: 'path',
    STATUS: 'status',
    STATUS_CODE: 'status_code',
    // Feature labels
    FEATURE: 'feature',
    COMPONENT: 'component',
    OPERATION: 'operation',
    // Error labels
    ERROR_TYPE: 'error_type',
    ERROR_CODE: 'error_code',
    // SLO labels
    SLO_NAME: 'slo_name',
    SLO_CLASS: 'slo_class',
};
/**
 * Label cardinality limits to prevent metric explosion
 */
exports.LabelCardinalityLimits = {
    [exports.StandardLabels.SERVICE]: 500,
    [exports.StandardLabels.TENANT]: 10000,
    [exports.StandardLabels.REGION]: 50,
    [exports.StandardLabels.ENVIRONMENT]: 10,
    [exports.StandardLabels.VERSION]: 100,
    [exports.StandardLabels.INSTANCE]: 1000,
    [exports.StandardLabels.METHOD]: 10,
    [exports.StandardLabels.PATH]: 500,
    [exports.StandardLabels.STATUS]: 10,
    [exports.StandardLabels.STATUS_CODE]: 100,
    [exports.StandardLabels.FEATURE]: 200,
    [exports.StandardLabels.COMPONENT]: 100,
    [exports.StandardLabels.OPERATION]: 500,
    [exports.StandardLabels.ERROR_TYPE]: 100,
    [exports.StandardLabels.ERROR_CODE]: 500,
    [exports.StandardLabels.SLO_NAME]: 100,
    [exports.StandardLabels.SLO_CLASS]: 10,
};
// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================
/**
 * Label validation schema
 */
exports.LabelSchema = zod_1.z.record(zod_1.z.string().regex(/^[a-z_][a-z0-9_]*$/, 'Label key must be snake_case'), zod_1.z.string().max(256, 'Label value must be <= 256 chars'));
/**
 * Metric name validation (Prometheus compatible)
 */
exports.MetricNameSchema = zod_1.z
    .string()
    .regex(/^[a-zA-Z_:][a-zA-Z0-9_:]*$/, 'Metric name must match [a-zA-Z_:][a-zA-Z0-9_:]*')
    .min(1)
    .max(128);
/**
 * Counter metric schema
 */
exports.CounterMetricSchema = zod_1.z.object({
    name: exports.MetricNameSchema,
    type: zod_1.z.literal(MetricType.COUNTER),
    value: zod_1.z.number().nonnegative(),
    labels: exports.LabelSchema,
    timestamp: zod_1.z.number().int().positive(),
    help: zod_1.z.string().optional(),
});
/**
 * Gauge metric schema
 */
exports.GaugeMetricSchema = zod_1.z.object({
    name: exports.MetricNameSchema,
    type: zod_1.z.literal(MetricType.GAUGE),
    value: zod_1.z.number(),
    labels: exports.LabelSchema,
    timestamp: zod_1.z.number().int().positive(),
    help: zod_1.z.string().optional(),
});
/**
 * Histogram bucket schema
 */
exports.HistogramBucketSchema = zod_1.z.object({
    le: zod_1.z.union([zod_1.z.number(), zod_1.z.literal('+Inf')]),
    count: zod_1.z.number().int().nonnegative(),
});
/**
 * Histogram metric schema
 */
exports.HistogramMetricSchema = zod_1.z.object({
    name: exports.MetricNameSchema,
    type: zod_1.z.literal(MetricType.HISTOGRAM),
    labels: exports.LabelSchema,
    timestamp: zod_1.z.number().int().positive(),
    help: zod_1.z.string().optional(),
    sum: zod_1.z.number(),
    count: zod_1.z.number().int().nonnegative(),
    buckets: zod_1.z.array(exports.HistogramBucketSchema),
});
/**
 * Summary quantile schema
 */
exports.SummaryQuantileSchema = zod_1.z.object({
    quantile: zod_1.z.number().min(0).max(1),
    value: zod_1.z.number(),
});
/**
 * Summary metric schema
 */
exports.SummaryMetricSchema = zod_1.z.object({
    name: exports.MetricNameSchema,
    type: zod_1.z.literal(MetricType.SUMMARY),
    labels: exports.LabelSchema,
    timestamp: zod_1.z.number().int().positive(),
    help: zod_1.z.string().optional(),
    sum: zod_1.z.number(),
    count: zod_1.z.number().int().nonnegative(),
    quantiles: zod_1.z.array(exports.SummaryQuantileSchema),
});
/**
 * Union of all metric types
 */
exports.MetricSchema = zod_1.z.discriminatedUnion('type', [
    exports.CounterMetricSchema,
    exports.GaugeMetricSchema,
    exports.HistogramMetricSchema,
    exports.SummaryMetricSchema,
]);
// ============================================================================
// HISTOGRAM BUCKET CONFIGURATIONS
// ============================================================================
/**
 * Standard histogram bucket configurations
 */
exports.HistogramBuckets = {
    /** HTTP request latencies (ms) */
    HTTP_LATENCY_MS: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    /** Database query latencies (ms) */
    DB_LATENCY_MS: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
    /** Cache operation latencies (microseconds) */
    CACHE_LATENCY_US: [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000],
    /** Message processing latencies (ms) */
    MESSAGE_LATENCY_MS: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    /** Request sizes (bytes) */
    REQUEST_SIZE_BYTES: [
        100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
    ],
    /** Response sizes (bytes) */
    RESPONSE_SIZE_BYTES: [
        100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
    ],
    /** Job durations (seconds) */
    JOB_DURATION_S: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
    /** GraphQL query complexity */
    GRAPHQL_COMPLEXITY: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
};
// ============================================================================
// METRIC NAMING CONVENTIONS
// ============================================================================
/**
 * Metric naming helper following conventions:
 * - Prefix with service/component
 * - Use snake_case
 * - Suffix with unit (_seconds, _bytes, _total, etc.)
 */
function formatMetricName(prefix, name, unit) {
    const parts = [prefix, name];
    if (unit) {
        parts.push(unit);
    }
    return parts.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
/**
 * Standard metric units
 */
exports.MetricUnits = {
    SECONDS: 'seconds',
    MILLISECONDS: 'milliseconds',
    BYTES: 'bytes',
    TOTAL: 'total',
    RATIO: 'ratio',
    PERCENT: 'percent',
    INFO: 'info',
};
