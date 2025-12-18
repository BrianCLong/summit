/**
 * Time-Series Metrics Data Model
 *
 * Defines the core metric types, label strategies, and data structures
 * for the CompanyOS observability platform.
 */

import { z } from 'zod';

// ============================================================================
// METRIC TYPE DEFINITIONS
// ============================================================================

/**
 * Supported metric types following Prometheus conventions
 */
export enum MetricType {
  /** Monotonically increasing value (e.g., total requests) */
  COUNTER = 'counter',
  /** Value that can go up or down (e.g., active connections) */
  GAUGE = 'gauge',
  /** Distribution of values in buckets (e.g., latencies) */
  HISTOGRAM = 'histogram',
  /** Client-side calculated quantiles (e.g., streaming percentiles) */
  SUMMARY = 'summary',
}

/**
 * Aggregation methods for downsampling
 */
export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  LAST = 'last',
  FIRST = 'first',
  P50 = 'p50',
  P90 = 'p90',
  P95 = 'p95',
  P99 = 'p99',
  RATE = 'rate',
  IRATE = 'irate',
  INCREASE = 'increase',
}

// ============================================================================
// LABEL/TAG STRATEGY
// ============================================================================

/**
 * Standard label keys for multi-tenant metrics
 */
export const StandardLabels = {
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
} as const;

/**
 * Label cardinality limits to prevent metric explosion
 */
export const LabelCardinalityLimits = {
  [StandardLabels.SERVICE]: 500,
  [StandardLabels.TENANT]: 10000,
  [StandardLabels.REGION]: 50,
  [StandardLabels.ENVIRONMENT]: 10,
  [StandardLabels.VERSION]: 100,
  [StandardLabels.INSTANCE]: 1000,
  [StandardLabels.METHOD]: 10,
  [StandardLabels.PATH]: 500,
  [StandardLabels.STATUS]: 10,
  [StandardLabels.STATUS_CODE]: 100,
  [StandardLabels.FEATURE]: 200,
  [StandardLabels.COMPONENT]: 100,
  [StandardLabels.OPERATION]: 500,
  [StandardLabels.ERROR_TYPE]: 100,
  [StandardLabels.ERROR_CODE]: 500,
  [StandardLabels.SLO_NAME]: 100,
  [StandardLabels.SLO_CLASS]: 10,
} as const;

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

/**
 * Label validation schema
 */
export const LabelSchema = z.record(
  z.string().regex(/^[a-z_][a-z0-9_]*$/, 'Label key must be snake_case'),
  z.string().max(256, 'Label value must be <= 256 chars'),
);

/**
 * Metric name validation (Prometheus compatible)
 */
export const MetricNameSchema = z
  .string()
  .regex(
    /^[a-zA-Z_:][a-zA-Z0-9_:]*$/,
    'Metric name must match [a-zA-Z_:][a-zA-Z0-9_:]*',
  )
  .min(1)
  .max(128);

/**
 * Counter metric schema
 */
export const CounterMetricSchema = z.object({
  name: MetricNameSchema,
  type: z.literal(MetricType.COUNTER),
  value: z.number().nonnegative(),
  labels: LabelSchema,
  timestamp: z.number().int().positive(),
  help: z.string().optional(),
});

/**
 * Gauge metric schema
 */
export const GaugeMetricSchema = z.object({
  name: MetricNameSchema,
  type: z.literal(MetricType.GAUGE),
  value: z.number(),
  labels: LabelSchema,
  timestamp: z.number().int().positive(),
  help: z.string().optional(),
});

/**
 * Histogram bucket schema
 */
export const HistogramBucketSchema = z.object({
  le: z.union([z.number(), z.literal('+Inf')]),
  count: z.number().int().nonnegative(),
});

/**
 * Histogram metric schema
 */
export const HistogramMetricSchema = z.object({
  name: MetricNameSchema,
  type: z.literal(MetricType.HISTOGRAM),
  labels: LabelSchema,
  timestamp: z.number().int().positive(),
  help: z.string().optional(),
  sum: z.number(),
  count: z.number().int().nonnegative(),
  buckets: z.array(HistogramBucketSchema),
});

/**
 * Summary quantile schema
 */
export const SummaryQuantileSchema = z.object({
  quantile: z.number().min(0).max(1),
  value: z.number(),
});

/**
 * Summary metric schema
 */
export const SummaryMetricSchema = z.object({
  name: MetricNameSchema,
  type: z.literal(MetricType.SUMMARY),
  labels: LabelSchema,
  timestamp: z.number().int().positive(),
  help: z.string().optional(),
  sum: z.number(),
  count: z.number().int().nonnegative(),
  quantiles: z.array(SummaryQuantileSchema),
});

/**
 * Union of all metric types
 */
export const MetricSchema = z.discriminatedUnion('type', [
  CounterMetricSchema,
  GaugeMetricSchema,
  HistogramMetricSchema,
  SummaryMetricSchema,
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Labels = z.infer<typeof LabelSchema>;
export type CounterMetric = z.infer<typeof CounterMetricSchema>;
export type GaugeMetric = z.infer<typeof GaugeMetricSchema>;
export type HistogramBucket = z.infer<typeof HistogramBucketSchema>;
export type HistogramMetric = z.infer<typeof HistogramMetricSchema>;
export type SummaryQuantile = z.infer<typeof SummaryQuantileSchema>;
export type SummaryMetric = z.infer<typeof SummaryMetricSchema>;
export type Metric = z.infer<typeof MetricSchema>;

// ============================================================================
// METRIC DATA POINT (for storage)
// ============================================================================

/**
 * Raw data point for time-series storage
 */
export interface DataPoint {
  timestamp: number;
  value: number;
  labels: Labels;
}

/**
 * Time-series with metadata
 */
export interface TimeSeries {
  metricName: string;
  metricType: MetricType;
  labels: Labels;
  dataPoints: DataPoint[];
  help?: string;
}

/**
 * Metric family (collection of time-series with same name)
 */
export interface MetricFamily {
  name: string;
  type: MetricType;
  help: string;
  series: TimeSeries[];
}

// ============================================================================
// HISTOGRAM BUCKET CONFIGURATIONS
// ============================================================================

/**
 * Standard histogram bucket configurations
 */
export const HistogramBuckets = {
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
} as const;

// ============================================================================
// METRIC NAMING CONVENTIONS
// ============================================================================

/**
 * Metric naming helper following conventions:
 * - Prefix with service/component
 * - Use snake_case
 * - Suffix with unit (_seconds, _bytes, _total, etc.)
 */
export function formatMetricName(
  prefix: string,
  name: string,
  unit?: string,
): string {
  const parts = [prefix, name];
  if (unit) {
    parts.push(unit);
  }
  return parts.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Standard metric units
 */
export const MetricUnits = {
  SECONDS: 'seconds',
  MILLISECONDS: 'milliseconds',
  BYTES: 'bytes',
  TOTAL: 'total',
  RATIO: 'ratio',
  PERCENT: 'percent',
  INFO: 'info',
} as const;
