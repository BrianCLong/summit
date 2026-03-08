"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTrackingService = void 0;
exports.getUsageTrackingService = getUsageTrackingService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'usage-tracking-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'UsageTrackingService',
    };
}
function getPeriodBounds(period, date) {
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
const DEFAULT_CONFIG = {
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
    calculateBillableAmount(usage, tiers, includedQuota = 0) {
        // Apply included quota
        const billableUsage = Math.max(0, usage - includedQuota);
        if (billableUsage === 0 || tiers.length === 0) {
            return { billableUnits: 0, totalCents: 0, tierBreakdown: [] };
        }
        // Sort tiers by minUnits
        const sortedTiers = [...tiers].sort((a, b) => a.minUnits - b.minUnits);
        let remainingUnits = billableUsage;
        let totalCents = 0;
        const tierBreakdown = [];
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
    calculateTrend(currentValue, previousValue) {
        if (previousValue === 0) {
            return { trend: 'stable', percentage: 0 };
        }
        const percentage = ((currentValue - previousValue) / previousValue) * 100;
        if (percentage > 5) {
            return { trend: 'increasing', percentage };
        }
        else if (percentage < -5) {
            return { trend: 'decreasing', percentage };
        }
        return { trend: 'stable', percentage };
    }
}
// ============================================================================
// Alert Manager
// ============================================================================
class AlertManager {
    config;
    alerts = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Check and create alerts for quota usage
     */
    checkQuotaAlerts(pluginId, tenantId, quotaStatus) {
        if (!this.config.enableAlerts)
            return [];
        const newAlerts = [];
        for (const quota of quotaStatus) {
            if (quota.percentUsed >= this.config.alertThresholds.critical) {
                newAlerts.push(this.createAlert(pluginId, tenantId, quota.percentUsed >= 100 ? 'quota_exceeded' : 'quota_warning', quota.percentUsed >= 100 ? 'critical' : 'warning', quota.metricType, quota.metricName, quota.includedUnits, quota.usedUnits, quota.percentUsed >= 100
                    ? `Quota exceeded for ${quota.metricName}`
                    : `${quota.percentUsed.toFixed(1)}% of ${quota.metricName} quota used`));
            }
            else if (quota.percentUsed >= this.config.alertThresholds.warning) {
                newAlerts.push(this.createAlert(pluginId, tenantId, 'quota_warning', 'info', quota.metricType, quota.metricName, quota.includedUnits, quota.usedUnits, `${quota.percentUsed.toFixed(1)}% of ${quota.metricName} quota used`));
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
    getAlerts(tenantId, pluginId) {
        const allAlerts = [];
        for (const [key, alerts] of this.alerts) {
            if (key.startsWith(`${tenantId}:`) && (!pluginId || key.endsWith(`:${pluginId}`))) {
                allAlerts.push(...alerts);
            }
        }
        return allAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        for (const alerts of this.alerts.values()) {
            const alert = alerts.find(a => a.id === alertId);
            if (alert) {
                alert.acknowledgedAt = new Date().toISOString();
                return true;
            }
        }
        return false;
    }
    createAlert(pluginId, tenantId, alertType, severity, metricType, metricName, threshold, currentValue, message) {
        return {
            id: (0, uuid_1.v4)(),
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
class UsageTrackingService extends events_1.EventEmitter {
    config;
    calculator;
    alertManager;
    pluginConfigs = new Map();
    eventBuffer = [];
    records = new Map();
    stats;
    flushTimer;
    constructor(config) {
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
        logger_js_1.default.info({ config: this.config }, 'UsageTrackingService initialized');
    }
    /**
     * Configure usage tracking for a plugin
     */
    configurePlugin(pluginConfig) {
        this.pluginConfigs.set(pluginConfig.pluginId, pluginConfig);
        this.stats.activePlugins = this.pluginConfigs.size;
        logger_js_1.default.info({
            pluginId: pluginConfig.pluginId,
            enabledMetrics: pluginConfig.enabledMetrics,
            aggregationPeriod: pluginConfig.aggregationPeriod,
        }, 'Plugin usage tracking configured');
    }
    /**
     * Record a usage event
     */
    recordEvent(pluginId, tenantId, metricType, metricName, value, unit, metadata = {}) {
        const event = {
            id: (0, uuid_1.v4)(),
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
        return (0, data_envelope_js_1.createDataEnvelope)(event, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Event recorded'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Record multiple usage events
     */
    recordEvents(events) {
        for (const event of events) {
            this.recordEvent(event.pluginId, event.tenantId, event.metricType, event.metricName, event.value, event.unit, event.metadata || {});
        }
        return (0, data_envelope_js_1.createDataEnvelope)(events.length, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `${events.length} events recorded`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get usage summary for a tenant/plugin
     */
    getUsageSummary(pluginId, tenantId, period) {
        const config = this.pluginConfigs.get(pluginId);
        const aggPeriod = period || config?.aggregationPeriod || this.config.defaultAggregationPeriod;
        const { start, end } = getPeriodBounds(aggPeriod, new Date());
        // Get records for the period
        const key = `${tenantId}:${pluginId}`;
        const records = (this.records.get(key) || [])
            .filter(r => new Date(r.periodStart) >= start && new Date(r.periodEnd) <= end);
        // Aggregate metrics
        const metricAggregates = new Map();
        for (const record of records) {
            for (const metric of record.metrics) {
                const metricKey = `${metric.metricType}:${metric.metricName}`;
                const existing = metricAggregates.get(metricKey);
                if (existing) {
                    existing.totalUsage += metric.totalValue;
                    existing.billableAmountCents += metric.totalPriceCents;
                }
                else {
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
        const summary = {
            pluginId,
            tenantId,
            period: { start: start.toISOString(), end: end.toISOString() },
            metrics: Array.from(metricAggregates.values()),
            totalBillableAmountCents: totalBillable,
            estimatedMonthlyAmountCents: estimatedMonthly,
            quotaUsage: quotaStatus,
        };
        return (0, data_envelope_js_1.createDataEnvelope)(summary, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Summary generated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get usage records for billing
     */
    getUsageRecords(tenantId, pluginId, status) {
        const allRecords = [];
        for (const [key, records] of this.records) {
            if (key.startsWith(`${tenantId}:`) && (!pluginId || key.endsWith(`:${pluginId}`))) {
                allRecords.push(...records);
            }
        }
        const filtered = status ? allRecords.filter(r => r.status === status) : allRecords;
        return (0, data_envelope_js_1.createDataEnvelope)(filtered, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Records retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Close a usage record for billing
     */
    closeRecord(recordId, invoiceId) {
        for (const records of this.records.values()) {
            const record = records.find(r => r.id === recordId);
            if (record) {
                record.status = 'closed';
                if (invoiceId) {
                    record.invoiceId = invoiceId;
                    record.status = 'billed';
                    record.billedAt = new Date().toISOString();
                }
                return (0, data_envelope_js_1.createDataEnvelope)(record, {
                    source: 'UsageTrackingService',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Record closed'),
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                });
            }
        }
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Record not found'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get alerts for a tenant
     */
    getAlerts(tenantId, pluginId) {
        const alerts = this.alertManager.getAlerts(tenantId, pluginId);
        return (0, data_envelope_js_1.createDataEnvelope)(alerts, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Alerts retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        const acknowledged = this.alertManager.acknowledgeAlert(alertId);
        return (0, data_envelope_js_1.createDataEnvelope)(acknowledged, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(acknowledged ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY, acknowledged ? 'Alert acknowledged' : 'Alert not found'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'UsageTrackingService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Shutdown service
     */
    shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushEvents();
        logger_js_1.default.info('UsageTrackingService shutdown complete');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    flushEvents() {
        if (this.eventBuffer.length === 0)
            return;
        const events = [...this.eventBuffer];
        this.eventBuffer = [];
        // Group events by tenant, plugin, and period
        const grouped = new Map();
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
        logger_js_1.default.debug({ eventCount: events.length }, 'Usage events flushed');
    }
    updateRecord(tenantId, pluginId, periodStartStr, events) {
        const recordKey = `${tenantId}:${pluginId}`;
        const records = this.records.get(recordKey) || [];
        const periodStart = new Date(periodStartStr);
        const config = this.pluginConfigs.get(pluginId);
        const period = config?.aggregationPeriod || this.config.defaultAggregationPeriod;
        const { end: periodEnd } = getPeriodBounds(period, periodStart);
        // Find existing record for this period
        let record = records.find(r => r.periodStart === periodStart.toISOString() && r.status === 'open');
        if (!record) {
            record = {
                id: (0, uuid_1.v4)(),
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
            let metric = record.metrics.find(m => m.metricType === event.metricType && m.metricName === event.metricName);
            if (!metric) {
                // Get pricing for this metric
                const pricing = config?.pricingTiers.find(p => p.metricType === event.metricType && p.metricName === event.metricName);
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
                const pricing = config.pricingTiers.find(p => p.metricType === event.metricType && p.metricName === event.metricName);
                if (pricing) {
                    const quota = config.includedQuota?.find(q => q.metricType === event.metricType && q.metricName === event.metricName);
                    const included = quota?.includedUnits || 0;
                    const { billableUnits, totalCents } = this.calculator.calculateBillableAmount(metric.totalValue, pricing.tiers, included);
                    metric.billableValue = billableUnits;
                    metric.totalPriceCents = totalCents;
                }
            }
        }
        // Update total billable amount
        record.totalBillableAmount = record.metrics.reduce((sum, m) => sum + m.totalPriceCents, 0);
        // Track active tenants
        const tenants = new Set();
        for (const key of this.records.keys()) {
            tenants.add(key.split(':')[0]);
        }
        this.stats.activeTenants = tenants.size;
    }
    calculateQuotaStatus(pluginId, tenantId, metrics) {
        const config = this.pluginConfigs.get(pluginId);
        if (!config?.includedQuota)
            return [];
        const quotaStatus = [];
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
exports.UsageTrackingService = UsageTrackingService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getUsageTrackingService(config) {
    if (!instance) {
        instance = new UsageTrackingService(config);
    }
    return instance;
}
exports.default = UsageTrackingService;
