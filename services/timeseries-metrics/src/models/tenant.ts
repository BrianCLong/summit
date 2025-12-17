/**
 * Multi-Tenant Isolation Model
 *
 * Defines tenant configuration, resource limits, and isolation
 * boundaries for the Time-Series Metrics Platform.
 */

import { z } from 'zod';

// ============================================================================
// TENANT CONFIGURATION
// ============================================================================

/**
 * Tenant tier for resource allocation
 */
export enum TenantTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  UNLIMITED = 'unlimited',
}

/**
 * Query priority levels
 */
export enum QueryPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

/**
 * Resource limits schema
 */
export const ResourceLimitsSchema = z.object({
  /** Max metrics ingestion rate (samples/second) */
  maxIngestionRate: z.number().int().positive(),
  /** Max active time-series */
  maxActiveSeries: z.number().int().positive(),
  /** Max labels per metric */
  maxLabelsPerMetric: z.number().int().min(1).max(64),
  /** Max label name length */
  maxLabelNameLength: z.number().int().min(1).max(128),
  /** Max label value length */
  maxLabelValueLength: z.number().int().min(1).max(512),
  /** Max query time range (ms) */
  maxQueryTimeRange: z.number().int().positive(),
  /** Max query data points returned */
  maxQueryDataPoints: z.number().int().positive(),
  /** Max concurrent queries */
  maxConcurrentQueries: z.number().int().min(1).max(100),
  /** Query timeout (ms) */
  queryTimeout: z.number().int().positive(),
  /** Storage quota (bytes) */
  storageQuota: z.number().int().positive(),
  /** Retention override (optional) */
  retentionOverride: z.string().optional(),
});

/**
 * Tenant configuration schema
 */
export const TenantConfigSchema = z.object({
  /** Tenant ID */
  tenantId: z.string().min(1).max(64),
  /** Tenant name */
  name: z.string().min(1).max(256),
  /** Tenant tier */
  tier: z.nativeEnum(TenantTier),
  /** Is tenant active */
  active: z.boolean().default(true),
  /** Resource limits */
  limits: ResourceLimitsSchema,
  /** Query priority */
  queryPriority: z.nativeEnum(QueryPriority).default(QueryPriority.NORMAL),
  /** Custom retention policies (policy names) */
  retentionPolicies: z.array(z.string()).default([]),
  /** Allowed metric prefixes (empty = all) */
  allowedMetricPrefixes: z.array(z.string()).default([]),
  /** Blocked metric prefixes */
  blockedMetricPrefixes: z.array(z.string()).default([]),
  /** Metadata */
  metadata: z.record(z.unknown()).default({}),
  /** Created timestamp */
  createdAt: z.number().int().positive(),
  /** Updated timestamp */
  updatedAt: z.number().int().positive(),
});

export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type TenantConfig = z.infer<typeof TenantConfigSchema>;

// ============================================================================
// DEFAULT RESOURCE LIMITS BY TIER
// ============================================================================

export const TierResourceLimits: Record<TenantTier, ResourceLimits> = {
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

// ============================================================================
// TENANT USAGE TRACKING
// ============================================================================

/**
 * Tenant usage metrics
 */
export interface TenantUsage {
  tenantId: string;
  /** Current active series count */
  activeSeries: number;
  /** Current ingestion rate (samples/sec, rolling average) */
  ingestionRate: number;
  /** Current storage usage (bytes) */
  storageUsed: number;
  /** Queries executed in current window */
  queriesExecuted: number;
  /** Query errors in current window */
  queryErrors: number;
  /** Samples ingested in current window */
  samplesIngested: number;
  /** Samples rejected in current window */
  samplesRejected: number;
  /** Current concurrent queries */
  concurrentQueries: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Tenant quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentValue?: number;
  limitValue?: number;
  utilizationPercent?: number;
}

// ============================================================================
// TENANT ISOLATION CONTEXT
// ============================================================================

/**
 * Tenant context for request processing
 */
export interface TenantContext {
  tenantId: string;
  config: TenantConfig;
  usage: TenantUsage;
}

/**
 * Create default tenant configuration
 */
export function createTenantConfig(
  tenantId: string,
  name: string,
  tier: TenantTier = TenantTier.FREE,
): TenantConfig {
  const now = Date.now();
  return {
    tenantId,
    name,
    tier,
    active: true,
    limits: TierResourceLimits[tier],
    queryPriority:
      tier === TenantTier.ENTERPRISE || tier === TenantTier.UNLIMITED
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
export function isMetricAllowed(
  metricName: string,
  tenant: TenantConfig,
): boolean {
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
  return tenant.allowedMetricPrefixes.some((prefix) =>
    metricName.startsWith(prefix),
  );
}

/**
 * Check quota for an operation
 */
export function checkQuota(
  operation: 'ingest' | 'query' | 'series' | 'storage',
  value: number,
  tenant: TenantConfig,
  usage: TenantUsage,
): QuotaCheckResult {
  switch (operation) {
    case 'ingest': {
      const current = usage.ingestionRate;
      const limit = tenant.limits.maxIngestionRate;
      const utilizationPercent = (current / limit) * 100;
      return {
        allowed: current + value <= limit,
        reason:
          current + value > limit
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
        reason:
          current >= limit
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
        reason:
          current + value > limit
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
        reason:
          current + value > limit
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
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
