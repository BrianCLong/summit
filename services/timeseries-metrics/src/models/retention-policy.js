"use strict";
/**
 * Retention, Downsampling, and Rollup Policy Definitions
 *
 * Defines storage tiers and data lifecycle management for the
 * Time-Series Metrics Platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredefinedPolicies = exports.InfrastructureMetricsPolicy = exports.CostMetricsPolicy = exports.BusinessMetricsPolicy = exports.SLORetentionPolicy = exports.DefaultRetentionPolicy = exports.RetentionPolicySchema = exports.TierConfigSchema = exports.DownsamplingRuleSchema = exports.StorageBackend = exports.StorageTier = void 0;
exports.matchRetentionPolicy = matchRetentionPolicy;
exports.parseDuration = parseDuration;
exports.formatDuration = formatDuration;
const zod_1 = require("zod");
const metric_types_js_1 = require("./metric-types.js");
// ============================================================================
// STORAGE TIER DEFINITIONS
// ============================================================================
/**
 * Storage tier for time-series data
 */
var StorageTier;
(function (StorageTier) {
    /** Recent data, fast queries (< 7 days typically) */
    StorageTier["HOT"] = "hot";
    /** Older data, slower but still accessible (7-90 days typically) */
    StorageTier["WARM"] = "warm";
    /** Archive data, slowest access (90+ days) */
    StorageTier["COLD"] = "cold";
})(StorageTier || (exports.StorageTier = StorageTier = {}));
/**
 * Storage backend types
 */
var StorageBackend;
(function (StorageBackend) {
    /** TimescaleDB for hot/warm tier */
    StorageBackend["TIMESCALEDB"] = "timescaledb";
    /** Prometheus for real-time metrics */
    StorageBackend["PROMETHEUS"] = "prometheus";
    /** InfluxDB alternative */
    StorageBackend["INFLUXDB"] = "influxdb";
    /** S3/Object storage for cold tier */
    StorageBackend["OBJECT_STORAGE"] = "object_storage";
    /** Parquet files for analytics */
    StorageBackend["PARQUET"] = "parquet";
})(StorageBackend || (exports.StorageBackend = StorageBackend = {}));
// ============================================================================
// RETENTION POLICY SCHEMA
// ============================================================================
/**
 * Downsampling rule schema
 */
exports.DownsamplingRuleSchema = zod_1.z.object({
    /** Source resolution (e.g., '15s', '1m') */
    sourceResolution: zod_1.z.string(),
    /** Target resolution (e.g., '5m', '1h') */
    targetResolution: zod_1.z.string(),
    /** Age threshold to trigger downsampling (e.g., '24h', '7d') */
    afterAge: zod_1.z.string(),
    /** Aggregation methods to apply */
    aggregations: zod_1.z.array(zod_1.z.nativeEnum(metric_types_js_1.AggregationType)),
});
/**
 * Tier configuration schema
 */
exports.TierConfigSchema = zod_1.z.object({
    tier: zod_1.z.nativeEnum(StorageTier),
    backend: zod_1.z.nativeEnum(StorageBackend),
    /** Data resolution in this tier (e.g., '15s', '1m', '1h') */
    resolution: zod_1.z.string(),
    /** How long to keep data in this tier */
    retentionPeriod: zod_1.z.string(),
    /** Compression settings */
    compression: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        algorithm: zod_1.z.enum(['lz4', 'zstd', 'snappy', 'none']).default('zstd'),
        level: zod_1.z.number().min(1).max(22).default(3),
    })
        .optional(),
    /** Replication factor */
    replication: zod_1.z.number().min(1).max(5).default(1),
});
/**
 * Complete retention policy schema
 */
exports.RetentionPolicySchema = zod_1.z.object({
    /** Policy name */
    name: zod_1.z.string().min(1).max(64),
    /** Policy description */
    description: zod_1.z.string().optional(),
    /** Is this the default policy? */
    isDefault: zod_1.z.boolean().default(false),
    /** Tiers configuration (ordered by storage tier) */
    tiers: zod_1.z.array(exports.TierConfigSchema).min(1),
    /** Downsampling rules */
    downsampling: zod_1.z.array(exports.DownsamplingRuleSchema).default([]),
    /** Metric name patterns this policy applies to */
    metricPatterns: zod_1.z.array(zod_1.z.string()).default(['*']),
    /** Label matchers for policy targeting */
    labelMatchers: zod_1.z.record(zod_1.z.string()).default({}),
    /** Delete data entirely after this period (optional) */
    deleteAfter: zod_1.z.string().optional(),
});
// ============================================================================
// PRE-DEFINED RETENTION POLICIES
// ============================================================================
/**
 * Default retention policy for general metrics
 */
exports.DefaultRetentionPolicy = {
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
                metric_types_js_1.AggregationType.AVG,
                metric_types_js_1.AggregationType.MAX,
                metric_types_js_1.AggregationType.MIN,
                metric_types_js_1.AggregationType.COUNT,
            ],
        },
        {
            sourceResolution: '1m',
            targetResolution: '1h',
            afterAge: '30d',
            aggregations: [
                metric_types_js_1.AggregationType.AVG,
                metric_types_js_1.AggregationType.MAX,
                metric_types_js_1.AggregationType.MIN,
                metric_types_js_1.AggregationType.SUM,
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
exports.SLORetentionPolicy = {
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
                metric_types_js_1.AggregationType.AVG,
                metric_types_js_1.AggregationType.P95,
                metric_types_js_1.AggregationType.P99,
                metric_types_js_1.AggregationType.MAX,
                metric_types_js_1.AggregationType.COUNT,
                metric_types_js_1.AggregationType.SUM,
            ],
        },
        {
            sourceResolution: '1m',
            targetResolution: '5m',
            afterAge: '90d',
            aggregations: [
                metric_types_js_1.AggregationType.AVG,
                metric_types_js_1.AggregationType.P95,
                metric_types_js_1.AggregationType.P99,
                metric_types_js_1.AggregationType.MAX,
                metric_types_js_1.AggregationType.SUM,
            ],
        },
    ],
    metricPatterns: ['slo_*', '*_sli_*', '*_error_budget_*', '*_burn_rate_*'],
    labelMatchers: {},
};
/**
 * Business metrics policy (longer retention, lower resolution)
 */
exports.BusinessMetricsPolicy = {
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
            aggregations: [metric_types_js_1.AggregationType.SUM, metric_types_js_1.AggregationType.AVG, metric_types_js_1.AggregationType.MAX],
        },
        {
            sourceResolution: '15m',
            targetResolution: '1h',
            afterAge: '365d',
            aggregations: [metric_types_js_1.AggregationType.SUM, metric_types_js_1.AggregationType.AVG],
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
exports.CostMetricsPolicy = {
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
            aggregations: [metric_types_js_1.AggregationType.SUM, metric_types_js_1.AggregationType.MAX, metric_types_js_1.AggregationType.AVG],
        },
        {
            sourceResolution: '1h',
            targetResolution: '1d',
            afterAge: '180d',
            aggregations: [metric_types_js_1.AggregationType.SUM, metric_types_js_1.AggregationType.MAX],
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
exports.InfrastructureMetricsPolicy = {
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
                metric_types_js_1.AggregationType.AVG,
                metric_types_js_1.AggregationType.MAX,
                metric_types_js_1.AggregationType.P95,
            ],
        },
        {
            sourceResolution: '1m',
            targetResolution: '5m',
            afterAge: '14d',
            aggregations: [metric_types_js_1.AggregationType.AVG, metric_types_js_1.AggregationType.MAX],
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
exports.PredefinedPolicies = [
    exports.DefaultRetentionPolicy,
    exports.SLORetentionPolicy,
    exports.BusinessMetricsPolicy,
    exports.CostMetricsPolicy,
    exports.InfrastructureMetricsPolicy,
];
// ============================================================================
// POLICY MATCHER
// ============================================================================
/**
 * Match a metric to its retention policy
 */
function matchRetentionPolicy(metricName, labels, policies = exports.PredefinedPolicies) {
    // Check non-default policies first
    for (const policy of policies.filter((p) => !p.isDefault)) {
        // Check metric name patterns
        const matchesPattern = policy.metricPatterns.some((pattern) => {
            if (pattern === '*')
                return false; // Skip wildcard for non-default
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            return regex.test(metricName);
        });
        if (!matchesPattern)
            continue;
        // Check label matchers
        const matchesLabels = Object.entries(policy.labelMatchers).every(([key, value]) => labels[key] === value);
        if (matchesLabels) {
            return policy;
        }
    }
    // Return default policy
    return policies.find((p) => p.isDefault) || exports.DefaultRetentionPolicy;
}
// ============================================================================
// DURATION PARSING
// ============================================================================
/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d|w|y)$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
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
function formatDuration(ms) {
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
