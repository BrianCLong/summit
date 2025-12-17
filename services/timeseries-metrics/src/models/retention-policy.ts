/**
 * Retention, Downsampling, and Rollup Policy Definitions
 *
 * Defines storage tiers and data lifecycle management for the
 * Time-Series Metrics Platform.
 */

import { z } from 'zod';
import { AggregationType } from './metric-types.js';

// ============================================================================
// STORAGE TIER DEFINITIONS
// ============================================================================

/**
 * Storage tier for time-series data
 */
export enum StorageTier {
  /** Recent data, fast queries (< 7 days typically) */
  HOT = 'hot',
  /** Older data, slower but still accessible (7-90 days typically) */
  WARM = 'warm',
  /** Archive data, slowest access (90+ days) */
  COLD = 'cold',
}

/**
 * Storage backend types
 */
export enum StorageBackend {
  /** TimescaleDB for hot/warm tier */
  TIMESCALEDB = 'timescaledb',
  /** Prometheus for real-time metrics */
  PROMETHEUS = 'prometheus',
  /** InfluxDB alternative */
  INFLUXDB = 'influxdb',
  /** S3/Object storage for cold tier */
  OBJECT_STORAGE = 'object_storage',
  /** Parquet files for analytics */
  PARQUET = 'parquet',
}

// ============================================================================
// RETENTION POLICY SCHEMA
// ============================================================================

/**
 * Downsampling rule schema
 */
export const DownsamplingRuleSchema = z.object({
  /** Source resolution (e.g., '15s', '1m') */
  sourceResolution: z.string(),
  /** Target resolution (e.g., '5m', '1h') */
  targetResolution: z.string(),
  /** Age threshold to trigger downsampling (e.g., '24h', '7d') */
  afterAge: z.string(),
  /** Aggregation methods to apply */
  aggregations: z.array(z.nativeEnum(AggregationType)),
});

/**
 * Tier configuration schema
 */
export const TierConfigSchema = z.object({
  tier: z.nativeEnum(StorageTier),
  backend: z.nativeEnum(StorageBackend),
  /** Data resolution in this tier (e.g., '15s', '1m', '1h') */
  resolution: z.string(),
  /** How long to keep data in this tier */
  retentionPeriod: z.string(),
  /** Compression settings */
  compression: z
    .object({
      enabled: z.boolean(),
      algorithm: z.enum(['lz4', 'zstd', 'snappy', 'none']).default('zstd'),
      level: z.number().min(1).max(22).default(3),
    })
    .optional(),
  /** Replication factor */
  replication: z.number().min(1).max(5).default(1),
});

/**
 * Complete retention policy schema
 */
export const RetentionPolicySchema = z.object({
  /** Policy name */
  name: z.string().min(1).max(64),
  /** Policy description */
  description: z.string().optional(),
  /** Is this the default policy? */
  isDefault: z.boolean().default(false),
  /** Tiers configuration (ordered by storage tier) */
  tiers: z.array(TierConfigSchema).min(1),
  /** Downsampling rules */
  downsampling: z.array(DownsamplingRuleSchema).default([]),
  /** Metric name patterns this policy applies to */
  metricPatterns: z.array(z.string()).default(['*']),
  /** Label matchers for policy targeting */
  labelMatchers: z.record(z.string()).default({}),
  /** Delete data entirely after this period (optional) */
  deleteAfter: z.string().optional(),
});

export type DownsamplingRule = z.infer<typeof DownsamplingRuleSchema>;
export type TierConfig = z.infer<typeof TierConfigSchema>;
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

// ============================================================================
// PRE-DEFINED RETENTION POLICIES
// ============================================================================

/**
 * Default retention policy for general metrics
 */
export const DefaultRetentionPolicy: RetentionPolicy = {
  name: 'default',
  description: 'Standard retention policy for general metrics',
  isDefault: true,
  tiers: [
    {
      tier: StorageTier.HOT,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '15s',
      retentionPeriod: '7d',
      compression: { enabled: true, algorithm: 'zstd', level: 3 },
      replication: 1,
    },
    {
      tier: StorageTier.WARM,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1m',
      retentionPeriod: '30d',
      compression: { enabled: true, algorithm: 'zstd', level: 6 },
      replication: 1,
    },
    {
      tier: StorageTier.COLD,
      backend: StorageBackend.OBJECT_STORAGE,
      resolution: '1h',
      retentionPeriod: '365d',
      compression: { enabled: true, algorithm: 'zstd', level: 9 },
      replication: 2,
    },
  ],
  downsampling: [
    {
      sourceResolution: '15s',
      targetResolution: '1m',
      afterAge: '7d',
      aggregations: [
        AggregationType.AVG,
        AggregationType.MAX,
        AggregationType.MIN,
        AggregationType.COUNT,
      ],
    },
    {
      sourceResolution: '1m',
      targetResolution: '1h',
      afterAge: '30d',
      aggregations: [
        AggregationType.AVG,
        AggregationType.MAX,
        AggregationType.MIN,
        AggregationType.SUM,
      ],
    },
  ],
  metricPatterns: ['*'],
  labelMatchers: {},
  deleteAfter: '730d', // 2 years
};

/**
 * High-resolution policy for SLO metrics
 */
export const SLORetentionPolicy: RetentionPolicy = {
  name: 'slo-metrics',
  description: 'High-resolution retention for SLO and SLI metrics',
  isDefault: false,
  tiers: [
    {
      tier: StorageTier.HOT,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '10s',
      retentionPeriod: '14d',
      compression: { enabled: true, algorithm: 'lz4', level: 1 },
      replication: 2,
    },
    {
      tier: StorageTier.WARM,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1m',
      retentionPeriod: '90d',
      compression: { enabled: true, algorithm: 'zstd', level: 6 },
      replication: 2,
    },
    {
      tier: StorageTier.COLD,
      backend: StorageBackend.PARQUET,
      resolution: '5m',
      retentionPeriod: '1095d', // 3 years
      compression: { enabled: true, algorithm: 'zstd', level: 9 },
      replication: 3,
    },
  ],
  downsampling: [
    {
      sourceResolution: '10s',
      targetResolution: '1m',
      afterAge: '14d',
      aggregations: [
        AggregationType.AVG,
        AggregationType.P95,
        AggregationType.P99,
        AggregationType.MAX,
        AggregationType.COUNT,
        AggregationType.SUM,
      ],
    },
    {
      sourceResolution: '1m',
      targetResolution: '5m',
      afterAge: '90d',
      aggregations: [
        AggregationType.AVG,
        AggregationType.P95,
        AggregationType.P99,
        AggregationType.MAX,
        AggregationType.SUM,
      ],
    },
  ],
  metricPatterns: ['slo_*', '*_sli_*', '*_error_budget_*', '*_burn_rate_*'],
  labelMatchers: {},
};

/**
 * Business metrics policy (longer retention, lower resolution)
 */
export const BusinessMetricsPolicy: RetentionPolicy = {
  name: 'business-metrics',
  description: 'Long-term retention for business and revenue metrics',
  isDefault: false,
  tiers: [
    {
      tier: StorageTier.HOT,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1m',
      retentionPeriod: '30d',
      compression: { enabled: true, algorithm: 'zstd', level: 3 },
      replication: 2,
    },
    {
      tier: StorageTier.WARM,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '15m',
      retentionPeriod: '365d',
      compression: { enabled: true, algorithm: 'zstd', level: 6 },
      replication: 2,
    },
    {
      tier: StorageTier.COLD,
      backend: StorageBackend.PARQUET,
      resolution: '1h',
      retentionPeriod: '1825d', // 5 years
      compression: { enabled: true, algorithm: 'zstd', level: 9 },
      replication: 3,
    },
  ],
  downsampling: [
    {
      sourceResolution: '1m',
      targetResolution: '15m',
      afterAge: '30d',
      aggregations: [AggregationType.SUM, AggregationType.AVG, AggregationType.MAX],
    },
    {
      sourceResolution: '15m',
      targetResolution: '1h',
      afterAge: '365d',
      aggregations: [AggregationType.SUM, AggregationType.AVG],
    },
  ],
  metricPatterns: [
    'business_*',
    'revenue_*',
    'signups_*',
    'churn_*',
    'mrr_*',
    'arr_*',
  ],
  labelMatchers: {},
};

/**
 * Cost/FinOps metrics policy
 */
export const CostMetricsPolicy: RetentionPolicy = {
  name: 'cost-metrics',
  description: 'Cost tracking and FinOps metrics with extended retention',
  isDefault: false,
  tiers: [
    {
      tier: StorageTier.HOT,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1m',
      retentionPeriod: '14d',
      compression: { enabled: true, algorithm: 'zstd', level: 3 },
      replication: 1,
    },
    {
      tier: StorageTier.WARM,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1h',
      retentionPeriod: '180d',
      compression: { enabled: true, algorithm: 'zstd', level: 6 },
      replication: 2,
    },
    {
      tier: StorageTier.COLD,
      backend: StorageBackend.PARQUET,
      resolution: '1d',
      retentionPeriod: '1825d', // 5 years for financial compliance
      compression: { enabled: true, algorithm: 'zstd', level: 9 },
      replication: 3,
    },
  ],
  downsampling: [
    {
      sourceResolution: '1m',
      targetResolution: '1h',
      afterAge: '14d',
      aggregations: [AggregationType.SUM, AggregationType.MAX, AggregationType.AVG],
    },
    {
      sourceResolution: '1h',
      targetResolution: '1d',
      afterAge: '180d',
      aggregations: [AggregationType.SUM, AggregationType.MAX],
    },
  ],
  metricPatterns: [
    'cost_*',
    'usage_*',
    'billing_*',
    'budget_*',
    'spend_*',
    'credits_*',
  ],
  labelMatchers: {},
};

/**
 * Infrastructure metrics policy (shorter retention, higher resolution)
 */
export const InfrastructureMetricsPolicy: RetentionPolicy = {
  name: 'infrastructure-metrics',
  description: 'Infrastructure and system metrics with high resolution',
  isDefault: false,
  tiers: [
    {
      tier: StorageTier.HOT,
      backend: StorageBackend.PROMETHEUS,
      resolution: '15s',
      retentionPeriod: '3d',
      compression: { enabled: false, algorithm: 'none', level: 1 },
      replication: 1,
    },
    {
      tier: StorageTier.WARM,
      backend: StorageBackend.TIMESCALEDB,
      resolution: '1m',
      retentionPeriod: '14d',
      compression: { enabled: true, algorithm: 'lz4', level: 1 },
      replication: 1,
    },
    {
      tier: StorageTier.COLD,
      backend: StorageBackend.OBJECT_STORAGE,
      resolution: '5m',
      retentionPeriod: '90d',
      compression: { enabled: true, algorithm: 'zstd', level: 6 },
      replication: 1,
    },
  ],
  downsampling: [
    {
      sourceResolution: '15s',
      targetResolution: '1m',
      afterAge: '3d',
      aggregations: [
        AggregationType.AVG,
        AggregationType.MAX,
        AggregationType.P95,
      ],
    },
    {
      sourceResolution: '1m',
      targetResolution: '5m',
      afterAge: '14d',
      aggregations: [AggregationType.AVG, AggregationType.MAX],
    },
  ],
  metricPatterns: [
    'node_*',
    'container_*',
    'kubelet_*',
    'kube_*',
    'process_*',
    'go_*',
  ],
  labelMatchers: {},
};

/**
 * All predefined policies
 */
export const PredefinedPolicies: RetentionPolicy[] = [
  DefaultRetentionPolicy,
  SLORetentionPolicy,
  BusinessMetricsPolicy,
  CostMetricsPolicy,
  InfrastructureMetricsPolicy,
];

// ============================================================================
// POLICY MATCHER
// ============================================================================

/**
 * Match a metric to its retention policy
 */
export function matchRetentionPolicy(
  metricName: string,
  labels: Record<string, string>,
  policies: RetentionPolicy[] = PredefinedPolicies,
): RetentionPolicy {
  // Check non-default policies first
  for (const policy of policies.filter((p) => !p.isDefault)) {
    // Check metric name patterns
    const matchesPattern = policy.metricPatterns.some((pattern) => {
      if (pattern === '*') return false; // Skip wildcard for non-default
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      );
      return regex.test(metricName);
    });

    if (!matchesPattern) continue;

    // Check label matchers
    const matchesLabels = Object.entries(policy.labelMatchers).every(
      ([key, value]) => labels[key] === value,
    );

    if (matchesLabels) {
      return policy;
    }
  }

  // Return default policy
  return policies.find((p) => p.isDefault) || DefaultRetentionPolicy;
}

// ============================================================================
// DURATION PARSING
// ============================================================================

/**
 * Parse duration string to milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w|y)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Format milliseconds to duration string
 */
export function formatDuration(ms: number): string {
  const units = [
    { suffix: 'y', ms: 365 * 24 * 60 * 60 * 1000 },
    { suffix: 'w', ms: 7 * 24 * 60 * 60 * 1000 },
    { suffix: 'd', ms: 24 * 60 * 60 * 1000 },
    { suffix: 'h', ms: 60 * 60 * 1000 },
    { suffix: 'm', ms: 60 * 1000 },
    { suffix: 's', ms: 1000 },
  ];

  for (const unit of units) {
    if (ms >= unit.ms && ms % unit.ms === 0) {
      return `${ms / unit.ms}${unit.suffix}`;
    }
  }

  return `${ms}ms`;
}
