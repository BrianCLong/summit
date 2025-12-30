/**
 * Usage Tracking Service
 *
 * Tracks plugin usage for usage-based billing.
 * Supports metering, aggregation, and billing integration.
 *
 * SOC 2 Controls: CC6.7 (Billing Accuracy), CC7.1 (Usage Monitoring)
 *
 * @module marketplace/UsageTrackingService
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type UsageMetricType =
  | 'api_calls'
  | 'data_processed_bytes'
  | 'compute_seconds'
  | 'storage_bytes'
  | 'active_users'
  | 'events'
  | 'custom';

export type AggregationPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface UsageEvent {
  id: string;
  pluginId: string;
  tenantId: string;
  metricType: UsageMetricType;
  metricName: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface UsageRecord {
  id: string;
  pluginId: string;
  tenantId: string;
  period: AggregationPeriod;
  periodStart: string;
  periodEnd: string;
  metrics: AggregatedMetric[];
  totalBillableAmount: number;
  currency: string;
  status: 'open' | 'closed' | 'billed';
  billedAt?: string;
  invoiceId?: string;
}

export interface AggregatedMetric {
  metricType: UsageMetricType;
  metricName: string;
  unit: string;
  totalValue: number;
  peakValue: number;
  averageValue: number;
  eventCount: number;
  billableValue: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

export interface UsagePricingTier {
  metricType: UsageMetricType;
  metricName: string;
  tiers: PricingTier[];
}

export interface PricingTier {
  minUnits: number;
  maxUnits: number | null;
  unitPriceCents: number;
  flatFeeCents?: number;
}

export interface PluginUsageConfig {
  pluginId: string;
  enabledMetrics: UsageMetricType[];
  pricingTiers: UsagePricingTier[];
  aggregationPeriod: AggregationPeriod;
  billingCycle: 'monthly' | 'weekly' | 'daily';
  includedQuota?: IncludedQuota[];
}

export interface IncludedQuota {
  metricType: UsageMetricType;
  metricName: string;
  includedUnits: number;
  resetPeriod: AggregationPeriod;
}

export interface UsageSummary {
  pluginId: string;
  tenantId: string;
  period: { start: string; end: string };
  metrics: MetricSummary[];
  totalBillableAmountCents: number;
  estimatedMonthlyAmountCents: number;
  quotaUsage: QuotaStatus[];
}

export interface MetricSummary {
  metricType: UsageMetricType;
  metricName: string;
  totalUsage: number;
  unit: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
  billableAmountCents: number;
}

export interface QuotaStatus {
  metricType: UsageMetricType;
  metricName: string;
  includedUnits: number;
  usedUnits: number;
  remainingUnits: number;
  percentUsed: number;
  resetsAt: string;
}

export interface UsageAlert {
  id: string;
  pluginId: string;
  tenantId: string;
  alertType: 'quota_warning' | 'quota_exceeded' | 'anomaly' | 'billing_threshold';
  severity: 'critical' | 'warning' | 'info';
  metricType: UsageMetricType;
  metricName: string;
  threshold: number;
  currentValue: number;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface UsageTrackingConfig {
  /** Default aggregation period */
  defaultAggregationPeriod: AggregationPeriod;
  /** Enable real-time usage events */
  enableRealTimeEvents: boolean;
  /** Batch size for event processing */
  eventBatchSize: number;
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  /** Enable usage alerts */
  enableAlerts: boolean;
  /** Alert thresholds (percentage of quota) */
  alertThresholds: { warning: number; critical: number };
}

export interface UsageTrackingStats {
  totalEventsRecorded: number;
  totalRecordsCreated: number;
  activePlugins: number;
  activeTenants: number;
  eventsPerSecond: number;
  lastEventAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'usage-tracking-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'UsageTrackingService',
  };
}

function getPeriodBounds(period: AggregationPeriod, date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  switch (period) {
    case 'hourly':
      start.setMinutes(0, 0, 0);
      end.setMinutes(59, 59, 999);
      break;
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: UsageTrackingConfig = {
  defaultAggregationPeriod: 'hourly',
  enableRealTimeEvents: true,
  eventBatchSize: 100,
  flushIntervalMs: 5000,
  enableAlerts: true,
  alertThresholds: { warning: 80, critical: 95 },
};

// ============================================================================
// Usage Calculator
// ============================================================================

class UsageCalculator {
  /**
   * Calculate billable amount for a metric
   */
  calculateBillableAmount(
    usage: number,
    tiers: PricingTier[],
    includedQuota: number = 0
  ): { billableUnits: number; totalCents: number; tierBreakdown: Array<{ tier: number; units: number; amount: number }> } {
    // Apply included quota
    const billableUsage = Math.max(0, usage - includedQuota);

    if (billableUsage === 0 || tiers.length === 0) {
      return { billableUnits: 0, totalCents: 0, tierBreakdown: [] };
    }

    // Sort tiers by minUnits
    const sortedTiers = [...tiers].sort((a, b) => a.minUnits - b.minUnits);

    let remainingUnits = billableUsage;
    let totalCents = 0;
    const tierBreakdown: Array<{ tier: number; units: number; amount: number }> = [];

    for (let i = 0; i < sortedTiers.length && remainingUnits > 0; i++) {
      const tier = sortedTiers[i];
      const tierMax = tier.maxUnits !== null ? tier.maxUnits - tier.minUnits : Infinity;
      const unitsInTier = Math.min(remainingUnits, tierMax);

      const tierAmount = (unitsInTier * tier.unitPriceCents) + (tier.flatFeeCents || 0);
      totalCents += tierAmount;

      tierBreakdown.push({
        tier: i + 1,
        units: unitsInTier,
        amount: tierAmount,
      });

      remainingUnits -= unitsInTier;
    }

    return {
      billableUnits: billableUsage,
      totalCents: Math.round(totalCents),
      tierBreakdown,
    };
  }

  /**
   * Calculate trend from historical data
   */
  calculateTrend(currentValue: number, previousValue: number): {
    trend: 'increasing' | 'stable' | 'decreasing';
    percentage: number;
  } {
    if (previousValue === 0) {
      return { trend: 'stable', percentage: 0 };
    }

    const percentage = ((currentValue - previousValue) / previousValue) * 100;

    if (percentage > 5) {
      return { trend: 'increasing', percentage };
    } else if (percentage < -5) {
      return { trend: 'decreasing', percentage };
    }

    return { trend: 'stable', percentage };
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

class AlertManager {
  private config: UsageTrackingConfig;
  private alerts: Map<string, UsageAlert[]> = new Map();

  constructor(config: UsageTrackingConfig) {
    this.config = config;
  }

  /**
   * Check and create alerts for quota usage
   */
  checkQuotaAlerts(
    pluginId: string,
    tenantId: string,
    quotaStatus: QuotaStatus[]
  ): UsageAlert[] {
    if (!this.config.enableAlerts) {return [];}

    const newAlerts: UsageAlert[] = [];

    for (const quota of quotaStatus) {
      if (quota.percentUsed >= this.config.alertThresholds.critical) {
        newAlerts.push(this.createAlert(
          pluginId,
          tenantId,
          quota.percentUsed >= 100 ? 'quota_exceeded' : 'quota_warning',
          quota.percentUsed >= 100 ? 'critical' : 'warning',
          quota.metricType,
          quota.metricName,
          quota.includedUnits,
          quota.usedUnits,
          quota.percentUsed >= 100
            ? `Quota exceeded for ${quota.metricName}`
            : `${quota.percentUsed.toFixed(1)}% of ${quota.metricName} quota used`
        ));
      } else if (quota.percentUsed >= this.config.alertThresholds.warning) {
        newAlerts.push(this.createAlert(
          pluginId,
          tenantId,
          'quota_warning',
          'info',
          quota.metricType,
          quota.metricName,
          quota.includedUnits,
          quota.usedUnits,
          `${quota.percentUsed.toFixed(1)}% of ${quota.metricName} quota used`
        ));
      }
    }

    // Store alerts
    const key = `${tenantId}:${pluginId}`;
    const existing = this.alerts.get(key) || [];
    this.alerts.set(key, [...existing, ...newAlerts]);

    return newAlerts;
  }

  /**
   * Get alerts for a tenant/plugin
   */
  getAlerts(tenantId: string, pluginId?: string): UsageAlert[] {
    const allAlerts: UsageAlert[] = [];

    for (const [key, alerts] of this.alerts) {
      if (key.startsWith(`${tenantId}:`) && (!pluginId || key.endsWith(`:${pluginId}`))) {
        allAlerts.push(...alerts);
      }
    }

    return allAlerts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledgedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  private createAlert(
    pluginId: string,
    tenantId: string,
    alertType: UsageAlert['alertType'],
    severity: UsageAlert['severity'],
    metricType: UsageMetricType,
    metricName: string,
    threshold: number,
    currentValue: number,
    message: string
  ): UsageAlert {
    return {
      id: uuidv4(),
      pluginId,
      tenantId,
      alertType,
      severity,
      metricType,
      metricName,
      threshold,
      currentValue,
      message,
      createdAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Usage Tracking Service
// ============================================================================

export class UsageTrackingService extends EventEmitter {
  private config: UsageTrackingConfig;
  private calculator: UsageCalculator;
  private alertManager: AlertManager;
  private pluginConfigs: Map<string, PluginUsageConfig> = new Map();
  private eventBuffer: UsageEvent[] = [];
  private records: Map<string, UsageRecord[]> = new Map();
  private stats: UsageTrackingStats;
  private flushTimer?: NodeJS.Timeout;

  constructor(config?: Partial<UsageTrackingConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.calculator = new UsageCalculator();
    this.alertManager = new AlertManager(this.config);
    this.stats = {
      totalEventsRecorded: 0,
      totalRecordsCreated: 0,
      activePlugins: 0,
      activeTenants: 0,
      eventsPerSecond: 0,
      lastEventAt: null,
    };

    // Start flush timer
    if (this.config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flushEvents(), this.config.flushIntervalMs);
    }

    logger.info({ config: this.config }, 'UsageTrackingService initialized');
  }

  /**
   * Configure usage tracking for a plugin
   */
  configurePlugin(pluginConfig: PluginUsageConfig): void {
    this.pluginConfigs.set(pluginConfig.pluginId, pluginConfig);
    this.stats.activePlugins = this.pluginConfigs.size;

    logger.info(
      {
        pluginId: pluginConfig.pluginId,
        enabledMetrics: pluginConfig.enabledMetrics,
        aggregationPeriod: pluginConfig.aggregationPeriod,
      },
      'Plugin usage tracking configured'
    );
  }

  /**
   * Record a usage event
   */
  recordEvent(
    pluginId: string,
    tenantId: string,
    metricType: UsageMetricType,
    metricName: string,
    value: number,
    unit: string,
    metadata: Record<string, unknown> = {}
  ): DataEnvelope<UsageEvent> {
    const event: UsageEvent = {
      id: uuidv4(),
      pluginId,
      tenantId,
      metricType,
      metricName,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Add to buffer
    this.eventBuffer.push(event);
    this.stats.totalEventsRecorded++;
    this.stats.lastEventAt = event.timestamp;

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.eventBatchSize) {
      this.flushEvents();
    }

    // Emit real-time event if enabled
    if (this.config.enableRealTimeEvents) {
      this.emit('usage:event', event);
    }

    return createDataEnvelope(event, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Event recorded'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Record multiple usage events
   */
  recordEvents(events: Array<{
    pluginId: string;
    tenantId: string;
    metricType: UsageMetricType;
    metricName: string;
    value: number;
    unit: string;
    metadata?: Record<string, unknown>;
  }>): DataEnvelope<number> {
    for (const event of events) {
      this.recordEvent(
        event.pluginId,
        event.tenantId,
        event.metricType,
        event.metricName,
        event.value,
        event.unit,
        event.metadata || {}
      );
    }

    return createDataEnvelope(events.length, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `${events.length} events recorded`),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get usage summary for a tenant/plugin
   */
  getUsageSummary(
    pluginId: string,
    tenantId: string,
    period?: AggregationPeriod
  ): DataEnvelope<UsageSummary> {
    const config = this.pluginConfigs.get(pluginId);
    const aggPeriod = period || config?.aggregationPeriod || this.config.defaultAggregationPeriod;
    const { start, end } = getPeriodBounds(aggPeriod, new Date());

    // Get records for the period
    const key = `${tenantId}:${pluginId}`;
    const records = (this.records.get(key) || [])
      .filter(r => new Date(r.periodStart) >= start && new Date(r.periodEnd) <= end);

    // Aggregate metrics
    const metricAggregates = new Map<string, MetricSummary>();

    for (const record of records) {
      for (const metric of record.metrics) {
        const metricKey = `${metric.metricType}:${metric.metricName}`;
        const existing = metricAggregates.get(metricKey);

        if (existing) {
          existing.totalUsage += metric.totalValue;
          existing.billableAmountCents += metric.totalPriceCents;
        } else {
          metricAggregates.set(metricKey, {
            metricType: metric.metricType,
            metricName: metric.metricName,
            totalUsage: metric.totalValue,
            unit: metric.unit,
            trend: 'stable',
            trendPercentage: 0,
            billableAmountCents: metric.totalPriceCents,
          });
        }
      }
    }

    // Calculate quota status
    const quotaStatus = this.calculateQuotaStatus(pluginId, tenantId, metricAggregates);

    // Check for alerts
    this.alertManager.checkQuotaAlerts(pluginId, tenantId, quotaStatus);

    // Calculate totals
    const totalBillable = Array.from(metricAggregates.values())
      .reduce((sum, m) => sum + m.billableAmountCents, 0);

    // Estimate monthly (extrapolate from current period)
    const daysInPeriod = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const estimatedMonthly = Math.round((totalBillable / daysInPeriod) * 30);

    const summary: UsageSummary = {
      pluginId,
      tenantId,
      period: { start: start.toISOString(), end: end.toISOString() },
      metrics: Array.from(metricAggregates.values()),
      totalBillableAmountCents: totalBillable,
      estimatedMonthlyAmountCents: estimatedMonthly,
      quotaUsage: quotaStatus,
    };

    return createDataEnvelope(summary, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Summary generated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get usage records for billing
   */
  getUsageRecords(
    tenantId: string,
    pluginId?: string,
    status?: UsageRecord['status']
  ): DataEnvelope<UsageRecord[]> {
    const allRecords: UsageRecord[] = [];

    for (const [key, records] of this.records) {
      if (key.startsWith(`${tenantId}:`) && (!pluginId || key.endsWith(`:${pluginId}`))) {
        allRecords.push(...records);
      }
    }

    const filtered = status ? allRecords.filter(r => r.status === status) : allRecords;

    return createDataEnvelope(filtered, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Records retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Close a usage record for billing
   */
  closeRecord(recordId: string, invoiceId?: string): DataEnvelope<UsageRecord | null> {
    for (const records of this.records.values()) {
      const record = records.find(r => r.id === recordId);
      if (record) {
        record.status = 'closed';
        if (invoiceId) {
          record.invoiceId = invoiceId;
          record.status = 'billed';
          record.billedAt = new Date().toISOString();
        }

        return createDataEnvelope(record, {
          source: 'UsageTrackingService',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Record closed'),
          classification: DataClassification.CONFIDENTIAL,
        });
      }
    }

    return createDataEnvelope(null, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.DENY, 'Record not found'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get alerts for a tenant
   */
  getAlerts(tenantId: string, pluginId?: string): DataEnvelope<UsageAlert[]> {
    const alerts = this.alertManager.getAlerts(tenantId, pluginId);

    return createDataEnvelope(alerts, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Alerts retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): DataEnvelope<boolean> {
    const acknowledged = this.alertManager.acknowledgeAlert(alertId);

    return createDataEnvelope(acknowledged, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(
        acknowledged ? GovernanceResult.ALLOW : GovernanceResult.DENY,
        acknowledged ? 'Alert acknowledged' : 'Alert not found'
      ),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get statistics
   */
  getStats(): DataEnvelope<UsageTrackingStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'UsageTrackingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
    logger.info('UsageTrackingService shutdown complete');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private flushEvents(): void {
    if (this.eventBuffer.length === 0) {return;}

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Group events by tenant, plugin, and period
    const grouped = new Map<string, UsageEvent[]>();

    for (const event of events) {
      const config = this.pluginConfigs.get(event.pluginId);
      const period = config?.aggregationPeriod || this.config.defaultAggregationPeriod;
      const { start } = getPeriodBounds(period, new Date(event.timestamp));

      const key = `${event.tenantId}:${event.pluginId}:${start.toISOString()}`;
      const group = grouped.get(key) || [];
      group.push(event);
      grouped.set(key, group);
    }

    // Create or update records
    for (const [key, groupEvents] of grouped) {
      const [tenantId, pluginId, periodStart] = key.split(':');
      this.updateRecord(tenantId, pluginId, periodStart, groupEvents);
    }

    logger.debug({ eventCount: events.length }, 'Usage events flushed');
  }

  private updateRecord(
    tenantId: string,
    pluginId: string,
    periodStartStr: string,
    events: UsageEvent[]
  ): void {
    const recordKey = `${tenantId}:${pluginId}`;
    const records = this.records.get(recordKey) || [];
    const periodStart = new Date(periodStartStr);

    const config = this.pluginConfigs.get(pluginId);
    const period = config?.aggregationPeriod || this.config.defaultAggregationPeriod;
    const { end: periodEnd } = getPeriodBounds(period, periodStart);

    // Find existing record for this period
    let record = records.find(r =>
      r.periodStart === periodStart.toISOString() && r.status === 'open'
    );

    if (!record) {
      record = {
        id: uuidv4(),
        pluginId,
        tenantId,
        period,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        metrics: [],
        totalBillableAmount: 0,
        currency: 'USD',
        status: 'open',
      };
      records.push(record);
      this.records.set(recordKey, records);
      this.stats.totalRecordsCreated++;
    }

    // Aggregate events into metrics
    for (const event of events) {
      let metric = record.metrics.find(
        m => m.metricType === event.metricType && m.metricName === event.metricName
      );

      if (!metric) {
        // Get pricing for this metric
        const pricing = config?.pricingTiers.find(
          p => p.metricType === event.metricType && p.metricName === event.metricName
        );
        const unitPrice = pricing?.tiers[0]?.unitPriceCents || 0;

        metric = {
          metricType: event.metricType,
          metricName: event.metricName,
          unit: event.unit,
          totalValue: 0,
          peakValue: 0,
          averageValue: 0,
          eventCount: 0,
          billableValue: 0,
          unitPriceCents: unitPrice,
          totalPriceCents: 0,
        };
        record.metrics.push(metric);
      }

      // Update metric
      metric.totalValue += event.value;
      metric.peakValue = Math.max(metric.peakValue, event.value);
      metric.eventCount++;
      metric.averageValue = metric.totalValue / metric.eventCount;

      // Calculate billable amount
      if (config) {
        const pricing = config.pricingTiers.find(
          p => p.metricType === event.metricType && p.metricName === event.metricName
        );
        if (pricing) {
          const quota = config.includedQuota?.find(
            q => q.metricType === event.metricType && q.metricName === event.metricName
          );
          const included = quota?.includedUnits || 0;

          const { billableUnits, totalCents } = this.calculator.calculateBillableAmount(
            metric.totalValue,
            pricing.tiers,
            included
          );

          metric.billableValue = billableUnits;
          metric.totalPriceCents = totalCents;
        }
      }
    }

    // Update total billable amount
    record.totalBillableAmount = record.metrics.reduce(
      (sum, m) => sum + m.totalPriceCents,
      0
    );

    // Track active tenants
    const tenants = new Set<string>();
    for (const key of this.records.keys()) {
      tenants.add(key.split(':')[0]);
    }
    this.stats.activeTenants = tenants.size;
  }

  private calculateQuotaStatus(
    pluginId: string,
    tenantId: string,
    metrics: Map<string, MetricSummary>
  ): QuotaStatus[] {
    const config = this.pluginConfigs.get(pluginId);
    if (!config?.includedQuota) {return [];}

    const quotaStatus: QuotaStatus[] = [];

    for (const quota of config.includedQuota) {
      const metricKey = `${quota.metricType}:${quota.metricName}`;
      const metric = metrics.get(metricKey);
      const usedUnits = metric?.totalUsage || 0;
      const remainingUnits = Math.max(0, quota.includedUnits - usedUnits);
      const percentUsed = (usedUnits / quota.includedUnits) * 100;

      const { end: resetsAt } = getPeriodBounds(quota.resetPeriod, new Date());

      quotaStatus.push({
        metricType: quota.metricType,
        metricName: quota.metricName,
        includedUnits: quota.includedUnits,
        usedUnits,
        remainingUnits,
        percentUsed,
        resetsAt: resetsAt.toISOString(),
      });
    }

    return quotaStatus;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: UsageTrackingService | null = null;

export function getUsageTrackingService(
  config?: Partial<UsageTrackingConfig>
): UsageTrackingService {
  if (!instance) {
    instance = new UsageTrackingService(config);
  }
  return instance;
}

export default UsageTrackingService;
