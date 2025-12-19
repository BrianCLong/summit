// @ts-nocheck
import pino from 'pino';
import { PrometheusMetrics } from '../../utils/metrics.js';

export type ResourceType =
  | 'requests_per_minute'
  | 'ingest_bytes_day'
  | 'query_cost_per_minute'
  | 'export_concurrency'
  | string;

export interface Quota {
  tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  requestsPerMinute: number;
  maxTokensPerRequest: number;
}

export interface QuotaLimit {
  hardLimit: number;
  softLimit?: number;
  usage: number;
  windowMs?: number;
  burstCredits?: number;
  resetAt?: number;
}

export type QuotaMap = Record<string, QuotaLimit | undefined>;

export interface HierarchicalQuota {
  org: QuotaMap;
  team?: Record<string, QuotaMap>;
  user?: Record<string, QuotaMap>;
}

export interface QuotaCheckOptions {
  priority?: 'vip' | 'high' | 'standard' | 'low';
  commit?: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
  retryAfterSeconds?: number;
  saturationLevel?: 'normal' | 'elevated' | 'critical';
  throttled?: boolean;
  usedBurst?: boolean;
}

interface QuotaWindowConfig {
  limit: number;
  windowMs: number;
  burstCredits?: number;
}

interface TenantQuotaConfig {
  requestsPerMinute: QuotaWindowConfig;
  ingestBytesPerDay: QuotaWindowConfig;
  queryCostPerMinute: QuotaWindowConfig;
  exportConcurrency: QuotaWindowConfig;
}

interface UsageWindow {
  used: number;
  windowStartedAt: number;
}

interface SaturationSnapshot {
  cpuLoad: number;
  queueDepth: number;
  dbLatencyMs: number;
  updatedAt: number;
}

const logger = pino({ name: 'quota-manager' });

const DEFAULT_QUOTA_CONFIG: TenantQuotaConfig = {
  requestsPerMinute: { limit: 1200, windowMs: 60_000, burstCredits: 100 },
  ingestBytesPerDay: { limit: 5 * 1024 * 1024 * 1024, windowMs: 86_400_000, burstCredits: 256 * 1024 * 1024 },
  queryCostPerMinute: { limit: 10_000, windowMs: 60_000, burstCredits: 1_000 },
  exportConcurrency: { limit: 5, windowMs: 0, burstCredits: 2 },
};

const SATURATION_THRESHOLDS = {
  elevated: { cpuLoad: 0.75, queueDepth: 100, dbLatencyMs: 250 },
  critical: { cpuLoad: 0.9, queueDepth: 200, dbLatencyMs: 500 },
};

class SaturationMonitor {
  private snapshot: SaturationSnapshot = {
    cpuLoad: 0,
    queueDepth: 0,
    dbLatencyMs: 0,
    updatedAt: Date.now(),
  };
  private metrics: PrometheusMetrics;

  constructor(metrics: PrometheusMetrics) {
    this.metrics = metrics;
    this.metrics.createGauge('saturation_cpu_load', 'Current CPU load', []);
    this.metrics.createGauge('saturation_queue_depth', 'Current queue depth', []);
    this.metrics.createGauge('saturation_db_latency_ms', 'Observed DB latency', []);
    this.metrics.createGauge('saturation_level', 'Derived saturation level (0=normal,1=elevated,2=critical)', []);
  }

  update(snapshot: Partial<SaturationSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...snapshot, updatedAt: Date.now() };
    this.metrics.setGauge('saturation_cpu_load', this.snapshot.cpuLoad);
    this.metrics.setGauge('saturation_queue_depth', this.snapshot.queueDepth);
    this.metrics.setGauge('saturation_db_latency_ms', this.snapshot.dbLatencyMs);
    this.metrics.setGauge('saturation_level', this.getLevelScore());
  }

  getLevel(): { level: 'normal' | 'elevated' | 'critical'; indicator: string } {
    const { cpuLoad, queueDepth, dbLatencyMs } = this.snapshot;
    if (
      cpuLoad >= SATURATION_THRESHOLDS.critical.cpuLoad ||
      queueDepth >= SATURATION_THRESHOLDS.critical.queueDepth ||
      dbLatencyMs >= SATURATION_THRESHOLDS.critical.dbLatencyMs
    ) {
      return { level: 'critical', indicator: this.topIndicator() };
    }

    if (
      cpuLoad >= SATURATION_THRESHOLDS.elevated.cpuLoad ||
      queueDepth >= SATURATION_THRESHOLDS.elevated.queueDepth ||
      dbLatencyMs >= SATURATION_THRESHOLDS.elevated.dbLatencyMs
    ) {
      return { level: 'elevated', indicator: this.topIndicator() };
    }

    return { level: 'normal', indicator: 'none' };
  }

  reset(): void {
    this.update({ cpuLoad: 0, queueDepth: 0, dbLatencyMs: 0 });
  }

  private topIndicator(): string {
    const { cpuLoad, queueDepth, dbLatencyMs } = this.snapshot;
    if (cpuLoad >= SATURATION_THRESHOLDS.elevated.cpuLoad) return 'cpu';
    if (queueDepth >= SATURATION_THRESHOLDS.elevated.queueDepth) return 'queue';
    if (dbLatencyMs >= SATURATION_THRESHOLDS.elevated.dbLatencyMs) return 'db';
    return 'none';
  }

  private getLevelScore(): number {
    const level = this.getLevel().level;
    if (level === 'critical') return 2;
    if (level === 'elevated') return 1;
    return 0;
  }
}

export class QuotaManager {
  private static instance: QuotaManager;
  private tenantTiers: Map<string, 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'> = new Map();
  private tenantQuotas: Map<string, HierarchicalQuota> = new Map();
  private tenantOverrides: Map<string, Partial<TenantQuotaConfig>> = new Map();
  private usageWindows: Map<string, Map<ResourceType, UsageWindow>> = new Map();
  private burstPools: Map<string, Map<ResourceType, number>> = new Map();
  private concurrency: Map<string, number> = new Map();
  private metrics: PrometheusMetrics;
  private saturationMonitor: SaturationMonitor;

  private constructor() {
    this.metrics = new PrometheusMetrics('quota_manager');
    this.metrics.createCounter('quota_checks_total', 'Total quota checks', ['tenant_id', 'resource', 'result']);
    this.metrics.createCounter('quota_throttles_total', 'Total throttled operations', ['tenant_id', 'resource', 'reason']);
    this.metrics.createCounter('burst_credits_used_total', 'Total burst credits consumed', ['tenant_id', 'resource']);
    this.metrics.createGauge('quota_remaining', 'Remaining quota for the active window', ['tenant_id', 'resource']);
    this.saturationMonitor = new SaturationMonitor(this.metrics);
  }

  public static getInstance(): QuotaManager {
    if (!QuotaManager.instance) {
      QuotaManager.instance = new QuotaManager();
    }
    return QuotaManager.instance;
  }

  public resetForTesting(): void {
    this.tenantQuotas.clear();
    this.tenantOverrides.clear();
    this.usageWindows.clear();
    this.burstPools.clear();
    this.concurrency.clear();
    this.saturationMonitor.reset();
  }

  public getQuotaForTenant(tenantId: string): Quota {
    const tier = this.tenantTiers.get(tenantId) || 'FREE';
    return this.getQuotaForTier(tier);
  }

  public getQuotaForTier(tier: string): Quota {
    switch (tier) {
      case 'ENTERPRISE':
        return { tier: 'ENTERPRISE', requestsPerMinute: 10000, maxTokensPerRequest: 32000 };
      case 'PRO':
        return { tier: 'PRO', requestsPerMinute: 1000, maxTokensPerRequest: 16000 };
      case 'STARTER':
        return { tier: 'STARTER', requestsPerMinute: 100, maxTokensPerRequest: 4000 };
      case 'FREE':
      default:
        return { tier: 'FREE', requestsPerMinute: 20, maxTokensPerRequest: 1000 };
    }
  }

  public setTenantTier(tenantId: string, tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'): void {
    this.tenantTiers.set(tenantId, tier);
  }

  public updateTenantQuotas(tenantId: string, quotas: HierarchicalQuota): void {
    this.tenantQuotas.set(tenantId, quotas);
  }

  public getTenantQuotas(tenantId: string): HierarchicalQuota | undefined {
    return this.tenantQuotas.get(tenantId);
  }

  public setTenantOverrides(tenantId: string, overrides: Partial<TenantQuotaConfig>): void {
    this.tenantOverrides.set(tenantId, overrides);
    this.burstPools.delete(tenantId);
    this.usageWindows.delete(tenantId);
  }

  public updateSaturationSnapshot(snapshot: Partial<SaturationSnapshot>): void {
    this.saturationMonitor.update(snapshot);
  }

  public checkQuota(
    tenantId: string,
    resource: ResourceType,
    amount = 1,
    identifiers: { teamId?: string; userId?: string } = {},
    options: QuotaCheckOptions = {},
  ): QuotaCheckResult {
    const useV1 = process.env.QUOTAS_V1 === '1';
    const priority = options.priority || 'standard';

    if (!useV1) {
      return this.checkHierarchicalQuotas(tenantId, resource, amount, identifiers);
    }

    const normalizedResource = this.normalizeResource(resource);
    const config = this.getTenantConfig(tenantId)[normalizedResource];

    // Unknown resource types fall back to allow
    if (!config) {
      return {
        allowed: true,
        limit: Number.POSITIVE_INFINITY,
        remaining: Number.POSITIVE_INFINITY,
        reset: Date.now(),
      };
    }

    const saturation = this.saturationMonitor.getLevel();
    const effectiveLimit = this.applySaturationToLimit(config.limit, priority, saturation.level);

    if (effectiveLimit <= 0) {
      this.metrics.incrementCounter('quota_throttles_total', { tenant_id: tenantId, resource: normalizedResource, reason: 'saturation' });
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        reset: this.computeReset(config.windowMs),
        reason: 'saturation_throttle',
        retryAfterSeconds: Math.ceil(config.windowMs / 1000),
        saturationLevel: saturation.level,
        throttled: true,
      };
    }

    if (normalizedResource === 'export_concurrency') {
      return this.checkConcurrencyQuota(tenantId, effectiveLimit, config, amount, saturation.level, options);
    }

    const usageWindow = this.getUsageWindow(tenantId, normalizedResource, config.windowMs);
    const projected = usageWindow.used + amount;
    const burstPool = this.getBurstPool(tenantId, normalizedResource, config.burstCredits ?? 0, usageWindow, config.windowMs);

    let allowed = projected <= effectiveLimit;
    let usedBurst = false;
    if (!allowed && burstPool > 0 && projected <= effectiveLimit + burstPool) {
      allowed = true;
      usedBurst = true;
      this.consumeBurst(tenantId, normalizedResource, projected - effectiveLimit);
      this.metrics.incrementCounter('burst_credits_used_total', { tenant_id: tenantId, resource: normalizedResource });
    }

    const remaining = Math.max(0, effectiveLimit - (options.commit === false ? usageWindow.used : projected));
    const reset = usageWindow.windowStartedAt + config.windowMs;

    this.metrics.incrementCounter('quota_checks_total', {
      tenant_id: tenantId,
      resource: normalizedResource,
      result: allowed ? 'allowed' : 'blocked',
    });
    this.metrics.setGauge('quota_remaining', remaining, { tenant_id: tenantId, resource: normalizedResource });

    if (allowed && options.commit !== false) {
      usageWindow.used = projected;
      this.persistUsageWindow(tenantId, normalizedResource, usageWindow);
    }

    if (!allowed) {
      this.metrics.incrementCounter('quota_throttles_total', { tenant_id: tenantId, resource: normalizedResource, reason: 'quota' });
    }

    return {
      allowed,
      limit: effectiveLimit,
      remaining,
      reset,
      reason: allowed ? undefined : this.denialReason(normalizedResource, usedBurst, saturation.level),
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      saturationLevel: saturation.level,
      throttled: saturation.level !== 'normal',
      usedBurst,
    };
  }

  public consumeQuota(
    tenantId: string,
    resource: ResourceType,
    amount = 1,
    identifiers: { teamId?: string; userId?: string } = {},
  ): void {
    const useV1 = process.env.QUOTAS_V1 === '1';
    if (!useV1) {
      this.applyHierarchicalUsage(tenantId, resource, amount, identifiers);
      return;
    }

    const normalizedResource = this.normalizeResource(resource);
    const config = this.getTenantConfig(tenantId)[normalizedResource];
    if (!config) return;

    if (normalizedResource === 'export_concurrency') {
      const key = this.concurrencyKey(tenantId);
      const current = this.concurrency.get(key) || 0;
      this.concurrency.set(key, Math.max(0, current + amount));
      return;
    }

    const usageWindow = this.getUsageWindow(tenantId, normalizedResource, config.windowMs);
    usageWindow.used = Math.max(0, usageWindow.used + amount);
    this.persistUsageWindow(tenantId, normalizedResource, usageWindow);
  }

  public releaseQuota(
    tenantId: string,
    resource: ResourceType,
    amount = 1,
    identifiers: { teamId?: string; userId?: string } = {},
  ): void {
    const useV1 = process.env.QUOTAS_V1 === '1';
    if (!useV1) {
      this.applyHierarchicalUsage(tenantId, resource, -amount, identifiers);
      return;
    }

    const normalizedResource = this.normalizeResource(resource);
    const config = this.getTenantConfig(tenantId)[normalizedResource];
    if (!config) return;

    if (normalizedResource === 'export_concurrency') {
      const key = this.concurrencyKey(tenantId);
      const current = this.concurrency.get(key) || 0;
      this.concurrency.set(key, Math.max(0, current - amount));
      return;
    }

    const usageWindow = this.getUsageWindow(tenantId, normalizedResource, config.windowMs);
    usageWindow.used = Math.max(0, usageWindow.used - amount);
    this.persistUsageWindow(tenantId, normalizedResource, usageWindow);
  }

  private checkConcurrencyQuota(
    tenantId: string,
    effectiveLimit: number,
    config: QuotaWindowConfig,
    amount: number,
    saturationLevel: 'normal' | 'elevated' | 'critical',
    options: QuotaCheckOptions,
  ): QuotaCheckResult {
    const key = this.concurrencyKey(tenantId);
    const current = this.concurrency.get(key) || 0;
    const projected = current + amount;
    const burstPool = this.getBurstPool(tenantId, 'export_concurrency', config.burstCredits ?? 0, { used: current, windowStartedAt: Date.now() }, config.windowMs);

    let allowed = projected <= effectiveLimit;
    let usedBurst = false;
    if (!allowed && burstPool > 0 && projected <= effectiveLimit + burstPool) {
      usedBurst = true;
      allowed = true;
      this.consumeBurst(tenantId, 'export_concurrency', projected - effectiveLimit);
      this.metrics.incrementCounter('burst_credits_used_total', { tenant_id: tenantId, resource: 'export_concurrency' });
    }

    if (allowed && options.commit !== false) {
      this.concurrency.set(key, projected);
    }

    if (!allowed) {
      this.metrics.incrementCounter('quota_throttles_total', { tenant_id: tenantId, resource: 'export_concurrency', reason: 'concurrency' });
    }

    return {
      allowed,
      limit: effectiveLimit,
      remaining: Math.max(0, effectiveLimit - projected),
      reset: this.computeReset(config.windowMs),
      reason: allowed ? undefined : this.denialReason('export_concurrency', usedBurst, saturationLevel),
      retryAfterSeconds: Math.max(1, Math.ceil((config.windowMs || 1000) / 1000)),
      saturationLevel,
      throttled: saturationLevel !== 'normal',
      usedBurst,
    };
  }

  private checkHierarchicalQuotas(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string },
  ): QuotaCheckResult {
    const quotas = this.tenantQuotas.get(tenantId);
    if (!quotas) {
      return {
        allowed: true,
        limit: Number.POSITIVE_INFINITY,
        remaining: Number.POSITIVE_INFINITY,
        reset: Date.now(),
      };
    }

    const scopes: Array<[QuotaLimit | undefined, string]> = [
      [quotas.org?.[resource], 'org'],
      [identifiers.teamId ? quotas.team?.[identifiers.teamId]?.[resource] : undefined, 'team'],
      [identifiers.userId ? quotas.user?.[identifiers.userId]?.[resource] : undefined, 'user'],
    ];

    for (const [quota, scope] of scopes) {
      if (!quota) continue;
      if (quota.usage + amount > quota.hardLimit) {
        return {
          allowed: false,
          limit: quota.hardLimit,
          remaining: Math.max(0, quota.hardLimit - quota.usage),
          reset: this.computeReset(quota.windowMs || 60_000),
          reason: `${scope}_quota_exceeded`,
        };
      }
    }

    // Commit usage when allowed in legacy mode
    this.applyHierarchicalUsage(tenantId, resource, amount, identifiers);
    return {
      allowed: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      reset: Date.now(),
    };
  }

  private applyHierarchicalUsage(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string },
  ): void {
    const quotas = this.tenantQuotas.get(tenantId);
    if (!quotas) return;
    const apply = (quota?: QuotaLimit) => {
      if (!quota) return;
      quota.usage = Math.max(0, quota.usage + amount);
    };
    apply(quotas.org?.[resource]);
    if (identifiers.teamId) apply(quotas.team?.[identifiers.teamId]?.[resource]);
    if (identifiers.userId) apply(quotas.user?.[identifiers.userId]?.[resource]);
  }

  private denialReason(resource: ResourceType, usedBurst: boolean, saturationLevel: 'normal' | 'elevated' | 'critical'): string {
    if (saturationLevel !== 'normal') {
      return 'saturation_throttle';
    }
    if (usedBurst) {
      return 'burst_exhausted';
    }
    switch (resource) {
      case 'requests_per_minute':
        return 'requests_per_minute_exceeded';
      case 'ingest_bytes_day':
        return 'ingest_bytes_day_exceeded';
      case 'query_cost_per_minute':
        return 'query_cost_per_minute_exceeded';
      case 'export_concurrency':
        return 'export_concurrency_exceeded';
      default:
        return 'quota_exceeded';
    }
  }

  private getUsageWindow(tenantId: string, resource: ResourceType, windowMs: number): UsageWindow {
    const tenantUsage = this.usageWindows.get(tenantId) || new Map<ResourceType, UsageWindow>();
    const existing = tenantUsage.get(resource);
    const now = Date.now();
    if (!existing || now - existing.windowStartedAt >= windowMs) {
      const fresh = { used: 0, windowStartedAt: now };
      tenantUsage.set(resource, fresh);
      this.usageWindows.set(tenantId, tenantUsage);
      this.burstPools.delete(`${tenantId}:${resource}`);
      return fresh;
    }
    return existing;
  }

  private persistUsageWindow(tenantId: string, resource: ResourceType, window: UsageWindow): void {
    const tenantUsage = this.usageWindows.get(tenantId) || new Map<ResourceType, UsageWindow>();
    tenantUsage.set(resource, window);
    this.usageWindows.set(tenantId, tenantUsage);
  }

  private normalizeResource(resource: ResourceType): ResourceType {
    switch (resource) {
      case 'api':
      case 'graphql':
      case 'api_calls':
      case 'requests':
        return 'requests_per_minute';
      case 'ingest':
      case 'ingest_bytes':
        return 'ingest_bytes_day';
      case 'query_cost':
      case 'queries':
        return 'query_cost_per_minute';
      case 'export':
      case 'exports':
        return 'export_concurrency';
      default:
        return resource;
    }
  }

  private getTenantConfig(tenantId: string): Record<ResourceType, QuotaWindowConfig> {
    const base = DEFAULT_QUOTA_CONFIG;
    const overrides = this.tenantOverrides.get(tenantId) || {};
    return {
      requests_per_minute: { ...base.requestsPerMinute, ...(overrides.requestsPerMinute || {}) },
      ingest_bytes_day: { ...base.ingestBytesPerDay, ...(overrides.ingestBytesPerDay || {}) },
      query_cost_per_minute: { ...base.queryCostPerMinute, ...(overrides.queryCostPerMinute || {}) },
      export_concurrency: { ...base.exportConcurrency, ...(overrides.exportConcurrency || {}) },
    } as Record<ResourceType, QuotaWindowConfig>;
  }

  private getBurstPool(
    tenantId: string,
    resource: ResourceType,
    burstCredits: number,
    usageWindow: UsageWindow,
    windowMs: number,
  ): number {
    const key = `${tenantId}:${resource}`;
    const now = Date.now();
    const pool = this.burstPools.get(key) || new Map<ResourceType, number>();
    const current = pool.get(resource);

    // Reset burst pool with the window
    if (!current || now - usageWindow.windowStartedAt >= windowMs) {
      pool.set(resource, burstCredits);
      this.burstPools.set(key, pool);
      return burstCredits;
    }

    return current;
  }

  private consumeBurst(tenantId: string, resource: ResourceType, amount: number): void {
    const key = `${tenantId}:${resource}`;
    const pool = this.burstPools.get(key) || new Map<ResourceType, number>();
    const current = pool.get(resource) ?? 0;
    pool.set(resource, Math.max(0, current - amount));
    this.burstPools.set(key, pool);
  }

  private applySaturationToLimit(
    limit: number,
    priority: 'vip' | 'high' | 'standard' | 'low',
    level: 'normal' | 'elevated' | 'critical',
  ): number {
    if (level === 'normal' || priority === 'vip') return limit;
    if (level === 'elevated') {
      return Math.max(1, Math.floor(limit * (priority === 'high' ? 0.9 : 0.75)));
    }
    // critical
    if (priority === 'low') return 0;
    if (priority === 'standard') return Math.max(1, Math.floor(limit * 0.5));
    return Math.max(1, Math.floor(limit * 0.75));
  }

  private computeReset(windowMs: number): number {
    return Date.now() + (windowMs || 1000);
  }

  private concurrencyKey(tenantId: string): string {
    return `${tenantId}:export_concurrency`;
  }
}

export const quotaManager = QuotaManager.getInstance();

export default quotaManager;
