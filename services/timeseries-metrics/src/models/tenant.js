"use strict";
/**
 * Multi-Tenant Isolation Model
 *
 * Defines tenant configuration, resource limits, and isolation
 * boundaries for the Time-Series Metrics Platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierResourceLimits = exports.TenantConfigSchema = exports.ResourceLimitsSchema = exports.QueryPriority = exports.TenantTier = void 0;
exports.createTenantConfig = createTenantConfig;
exports.isMetricAllowed = isMetricAllowed;
exports.checkQuota = checkQuota;
const zod_1 = require("zod");
// ============================================================================
// TENANT CONFIGURATION
// ============================================================================
/**
 * Tenant tier for resource allocation
 */
var TenantTier;
(function (TenantTier) {
    TenantTier["FREE"] = "free";
    TenantTier["STARTER"] = "starter";
    TenantTier["PROFESSIONAL"] = "professional";
    TenantTier["ENTERPRISE"] = "enterprise";
    TenantTier["UNLIMITED"] = "unlimited";
})(TenantTier || (exports.TenantTier = TenantTier = {}));
/**
 * Query priority levels
 */
var QueryPriority;
(function (QueryPriority) {
    QueryPriority[QueryPriority["LOW"] = 1] = "LOW";
    QueryPriority[QueryPriority["NORMAL"] = 5] = "NORMAL";
    QueryPriority[QueryPriority["HIGH"] = 8] = "HIGH";
    QueryPriority[QueryPriority["CRITICAL"] = 10] = "CRITICAL";
})(QueryPriority || (exports.QueryPriority = QueryPriority = {}));
/**
 * Resource limits schema
 */
exports.ResourceLimitsSchema = zod_1.z.object({
    /** Max metrics ingestion rate (samples/second) */
    maxIngestionRate: zod_1.z.number().int().positive(),
    /** Max active time-series */
    maxActiveSeries: zod_1.z.number().int().positive(),
    /** Max labels per metric */
    maxLabelsPerMetric: zod_1.z.number().int().min(1).max(64),
    /** Max label name length */
    maxLabelNameLength: zod_1.z.number().int().min(1).max(128),
    /** Max label value length */
    maxLabelValueLength: zod_1.z.number().int().min(1).max(512),
    /** Max query time range (ms) */
    maxQueryTimeRange: zod_1.z.number().int().positive(),
    /** Max query data points returned */
    maxQueryDataPoints: zod_1.z.number().int().positive(),
    /** Max concurrent queries */
    maxConcurrentQueries: zod_1.z.number().int().min(1).max(100),
    /** Query timeout (ms) */
    queryTimeout: zod_1.z.number().int().positive(),
    /** Storage quota (bytes) */
    storageQuota: zod_1.z.number().int().positive(),
    /** Retention override (optional) */
    retentionOverride: zod_1.z.string().optional(),
});
/**
 * Tenant configuration schema
 */
exports.TenantConfigSchema = zod_1.z.object({
    /** Tenant ID */
    tenantId: zod_1.z.string().min(1).max(64),
    /** Tenant name */
    name: zod_1.z.string().min(1).max(256),
    /** Tenant tier */
    tier: zod_1.z.nativeEnum(TenantTier),
    /** Is tenant active */
    active: zod_1.z.boolean().default(true),
    /** Resource limits */
    limits: exports.ResourceLimitsSchema,
    /** Query priority */
    queryPriority: zod_1.z.nativeEnum(QueryPriority).default(QueryPriority.NORMAL),
    /** Custom retention policies (policy names) */
    retentionPolicies: zod_1.z.array(zod_1.z.string()).default([]),
    /** Allowed metric prefixes (empty = all) */
    allowedMetricPrefixes: zod_1.z.array(zod_1.z.string()).default([]),
    /** Blocked metric prefixes */
    blockedMetricPrefixes: zod_1.z.array(zod_1.z.string()).default([]),
    /** Metadata */
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
    /** Created timestamp */
    createdAt: zod_1.z.number().int().positive(),
    /** Updated timestamp */
    updatedAt: zod_1.z.number().int().positive(),
});
// ============================================================================
// DEFAULT RESOURCE LIMITS BY TIER
// ============================================================================
exports.TierResourceLimits = {
    [TenantTier.FREE]: {
        maxIngestionRate: 1000, // 1k samples/sec
        maxActiveSeries: 10000,
        maxLabelsPerMetric: 10,
        maxLabelNameLength: 64,
        maxLabelValueLength: 128,
        maxQueryTimeRange: 24 * 60 * 60 * 1000, // 1 day
        maxQueryDataPoints: 10000,
        maxConcurrentQueries: 2,
        queryTimeout: 30000, // 30 seconds
        storageQuota: 1 * 1024 * 1024 * 1024, // 1 GB
    },
    [TenantTier.STARTER]: {
        maxIngestionRate: 10000, // 10k samples/sec
        maxActiveSeries: 100000,
        maxLabelsPerMetric: 20,
        maxLabelNameLength: 64,
        maxLabelValueLength: 256,
        maxQueryTimeRange: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxQueryDataPoints: 50000,
        maxConcurrentQueries: 5,
        queryTimeout: 60000, // 60 seconds
        storageQuota: 10 * 1024 * 1024 * 1024, // 10 GB
    },
    [TenantTier.PROFESSIONAL]: {
        maxIngestionRate: 100000, // 100k samples/sec
        maxActiveSeries: 1000000,
        maxLabelsPerMetric: 32,
        maxLabelNameLength: 128,
        maxLabelValueLength: 512,
        maxQueryTimeRange: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxQueryDataPoints: 500000,
        maxConcurrentQueries: 20,
        queryTimeout: 120000, // 2 minutes
        storageQuota: 100 * 1024 * 1024 * 1024, // 100 GB
    },
    [TenantTier.ENTERPRISE]: {
        maxIngestionRate: 1000000, // 1M samples/sec
        maxActiveSeries: 10000000,
        maxLabelsPerMetric: 64,
        maxLabelNameLength: 128,
        maxLabelValueLength: 512,
        maxQueryTimeRange: 90 * 24 * 60 * 60 * 1000, // 90 days
        maxQueryDataPoints: 5000000,
        maxConcurrentQueries: 50,
        queryTimeout: 300000, // 5 minutes
        storageQuota: 1024 * 1024 * 1024 * 1024, // 1 TB
    },
    [TenantTier.UNLIMITED]: {
        maxIngestionRate: Number.MAX_SAFE_INTEGER,
        maxActiveSeries: Number.MAX_SAFE_INTEGER,
        maxLabelsPerMetric: 64,
        maxLabelNameLength: 128,
        maxLabelValueLength: 512,
        maxQueryTimeRange: Number.MAX_SAFE_INTEGER,
        maxQueryDataPoints: Number.MAX_SAFE_INTEGER,
        maxConcurrentQueries: 100,
        queryTimeout: 600000, // 10 minutes
        storageQuota: Number.MAX_SAFE_INTEGER,
    },
};
/**
 * Create default tenant configuration
 */
function createTenantConfig(tenantId, name, tier = TenantTier.FREE) {
    const now = Date.now();
    return {
        tenantId,
        name,
        tier,
        active: true,
        limits: exports.TierResourceLimits[tier],
        queryPriority: tier === TenantTier.ENTERPRISE || tier === TenantTier.UNLIMITED
            ? QueryPriority.HIGH
            : QueryPriority.NORMAL,
        retentionPolicies: [],
        allowedMetricPrefixes: [],
        blockedMetricPrefixes: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
    };
}
/**
 * Check if metric is allowed for tenant
 */
function isMetricAllowed(metricName, tenant) {
    // Check blocked prefixes first
    for (const prefix of tenant.blockedMetricPrefixes) {
        if (metricName.startsWith(prefix)) {
            return false;
        }
    }
    // If no allowed prefixes, all (non-blocked) metrics are allowed
    if (tenant.allowedMetricPrefixes.length === 0) {
        return true;
    }
    // Check allowed prefixes
    return tenant.allowedMetricPrefixes.some((prefix) => metricName.startsWith(prefix));
}
/**
 * Check quota for an operation
 */
function checkQuota(operation, value, tenant, usage) {
    switch (operation) {
        case 'ingest': {
            const current = usage.ingestionRate;
            const limit = tenant.limits.maxIngestionRate;
            const utilizationPercent = (current / limit) * 100;
            return {
                allowed: current + value <= limit,
                reason: current + value > limit
                    ? `Ingestion rate limit exceeded (${current}/${limit} samples/sec)`
                    : undefined,
                currentValue: current,
                limitValue: limit,
                utilizationPercent,
            };
        }
        case 'query': {
            const current = usage.concurrentQueries;
            const limit = tenant.limits.maxConcurrentQueries;
            const utilizationPercent = (current / limit) * 100;
            return {
                allowed: current < limit,
                reason: current >= limit
                    ? `Concurrent query limit reached (${current}/${limit})`
                    : undefined,
                currentValue: current,
                limitValue: limit,
                utilizationPercent,
            };
        }
        case 'series': {
            const current = usage.activeSeries;
            const limit = tenant.limits.maxActiveSeries;
            const utilizationPercent = (current / limit) * 100;
            return {
                allowed: current + value <= limit,
                reason: current + value > limit
                    ? `Active series limit exceeded (${current}/${limit})`
                    : undefined,
                currentValue: current,
                limitValue: limit,
                utilizationPercent,
            };
        }
        case 'storage': {
            const current = usage.storageUsed;
            const limit = tenant.limits.storageQuota;
            const utilizationPercent = (current / limit) * 100;
            return {
                allowed: current + value <= limit,
                reason: current + value > limit
                    ? `Storage quota exceeded (${formatBytes(current)}/${formatBytes(limit)})`
                    : undefined,
                currentValue: current,
                limitValue: limit,
                utilizationPercent,
            };
        }
    }
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let unitIndex = 0;
    let value = bytes;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}
