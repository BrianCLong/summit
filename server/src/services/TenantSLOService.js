"use strict";
/**
 * Maestro Conductor v24.4.0 - Tenant-Level SLO Metrics & Dashboards
 * Epic E22: Tenant-Level SLO Observability
 *
 * Comprehensive tenant-specific SLO tracking, alerting, and dashboard generation
 * Provides per-tenant error budgets, burn rates, and availability metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantSLOService = exports.TenantSLOService = void 0;
const events_1 = require("events");
const metrics_js_1 = require("../utils/metrics.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const tracing_js_1 = require("../utils/tracing.js");
const DatabaseService_js_1 = require("./DatabaseService.js");
class TenantSLOService extends events_1.EventEmitter {
    config;
    metrics;
    db;
    // SLO tracking
    tenantSLOs = new Map();
    activeAlerts = new Map();
    dashboards = new Map();
    // Burn rate tracking
    burnRateHistory = new Map();
    constructor(config = {}, db) {
        super();
        this.config = {
            enabled: true,
            sloTargets: this.getDefaultSLOTargets(),
            alertThresholds: {
                criticalBurnRate: 5.0,
                warningBurnRate: 2.0,
                budgetExhaustion: 2, // 2 days
                anomalyDetection: true,
            },
            burnRateWindows: this.getDefaultBurnRateWindows(),
            retentionDays: 90,
            dashboardRefreshMinutes: 5,
            autoScalingEnabled: true,
            ...config,
        };
        this.db = db;
        this.metrics = new metrics_js_1.PrometheusMetrics('tenant_slo');
        this.initializeMetrics();
        this.startSLOTracking();
        this.startBurnRateMonitoring();
    }
    getDefaultSLOTargets() {
        return {
            availability: 99.9, // 99.9% uptime
            responseTimeP50: 200, // 200ms P50
            responseTimeP95: 800, // 800ms P95
            responseTimeP99: 2000, // 2s P99
            errorRate: 0.1, // 0.1% error rate
            throughputRPS: 10, // 10 RPS minimum
            dataFreshness: 300, // 5 minutes max staleness
        };
    }
    getDefaultBurnRateWindows() {
        return [
            {
                name: 'immediate',
                shortWindow: 5, // 5 minutes
                longWindow: 60, // 1 hour
                alertBurnRate: 14.4, // 2% of monthly budget in 1 hour
                severity: 'critical',
            },
            {
                name: 'short_term',
                shortWindow: 30, // 30 minutes
                longWindow: 360, // 6 hours
                alertBurnRate: 6.0, // 5% of monthly budget in 6 hours
                severity: 'critical',
            },
            {
                name: 'medium_term',
                shortWindow: 120, // 2 hours
                longWindow: 1440, // 24 hours
                alertBurnRate: 3.0, // 10% of monthly budget in 1 day
                severity: 'warning',
            },
            {
                name: 'long_term',
                shortWindow: 360, // 6 hours
                longWindow: 10080, // 1 week
                alertBurnRate: 1.0, // Normal burn rate
                severity: 'info',
            },
        ];
    }
    initializeMetrics() {
        // Core SLO metrics
        this.metrics.createGauge('tenant_slo_availability', 'Tenant availability percentage', ['tenant_id']);
        this.metrics.createGauge('tenant_slo_response_time_p50', 'P50 response time', ['tenant_id']);
        this.metrics.createGauge('tenant_slo_response_time_p95', 'P95 response time', ['tenant_id']);
        this.metrics.createGauge('tenant_slo_response_time_p99', 'P99 response time', ['tenant_id']);
        this.metrics.createGauge('tenant_slo_error_rate', 'Error rate percentage', [
            'tenant_id',
        ]);
        this.metrics.createGauge('tenant_slo_throughput', 'Requests per second', [
            'tenant_id',
        ]);
        // Error budget metrics
        this.metrics.createGauge('tenant_error_budget_remaining', 'Remaining error budget', ['tenant_id']);
        this.metrics.createGauge('tenant_error_budget_burn_rate', 'Error budget burn rate', ['tenant_id']);
        this.metrics.createGauge('tenant_error_budget_exhaustion_hours', 'Hours until budget exhaustion', ['tenant_id']);
        // SLO compliance metrics
        this.metrics.createGauge('tenant_slo_compliance', 'Overall SLO compliance', ['tenant_id', 'slo_type']);
        this.metrics.createCounter('tenant_slo_violations', 'SLO violations', [
            'tenant_id',
            'slo_type',
            'severity',
        ]);
        // Alert metrics
        this.metrics.createCounter('tenant_slo_alerts', 'SLO alerts generated', [
            'tenant_id',
            'alert_type',
            'severity',
        ]);
        this.metrics.createGauge('tenant_active_alerts', 'Active SLO alerts', [
            'tenant_id',
        ]);
        // Performance breakdown
        this.metrics.createGauge('tenant_latency_breakdown', 'Latency breakdown by component', ['tenant_id', 'component']);
        // Resource utilization
        this.metrics.createGauge('tenant_resource_utilization', 'Resource utilization', ['tenant_id', 'resource']);
    }
    startSLOTracking() {
        // Calculate SLO metrics every minute
        setInterval(async () => {
            await this.calculateAllTenantSLOs();
        }, 60000);
        // Generate hourly reports
        setInterval(async () => {
            await this.generateHourlyReports();
        }, 3600000);
        // Update dashboards
        setInterval(async () => {
            await this.updateAllDashboards();
        }, this.config.dashboardRefreshMinutes * 60000);
        logger_js_1.default.info('Tenant SLO tracking started', {
            sloTargets: this.config.sloTargets,
            refreshInterval: this.config.dashboardRefreshMinutes,
        });
    }
    startBurnRateMonitoring() {
        // Monitor burn rates every minute
        setInterval(async () => {
            await this.monitorBurnRates();
        }, 60000);
        // Clean up old burn rate history
        setInterval(() => {
            this.cleanupBurnRateHistory();
        }, 3600000); // Every hour
        logger_js_1.default.info('Burn rate monitoring started', {
            windows: this.config.burnRateWindows.length,
            criticalBurnRate: this.config.alertThresholds.criticalBurnRate,
        });
    }
    // Core SLO calculation methods
    async calculateTenantSLO(tenantId, period = 'minute') {
        return tracing_js_1.tracer.startActiveSpan('tenant_slo.calculate', async (span) => {
            span.setAttributes({
                'tenant_slo.tenant_id': tenantId,
                'tenant_slo.period': period,
            });
            try {
                // Get raw metrics for the period
                const rawMetrics = await this.getRawMetrics(tenantId, period);
                // Calculate SLI values
                const sli = {
                    availability: this.calculateAvailability(rawMetrics),
                    responseTimeP50: this.calculatePercentile(rawMetrics.responseTimes, 0.5),
                    responseTimeP95: this.calculatePercentile(rawMetrics.responseTimes, 0.95),
                    responseTimeP99: this.calculatePercentile(rawMetrics.responseTimes, 0.99),
                    errorRate: this.calculateErrorRate(rawMetrics),
                    throughput: this.calculateThroughput(rawMetrics),
                    dataFreshness: this.calculateDataFreshness(rawMetrics),
                };
                // Check SLO compliance
                const slo = {
                    availabilityCompliant: sli.availability >= this.config.sloTargets.availability,
                    responseTimeCompliant: sli.responseTimeP95 <= this.config.sloTargets.responseTimeP95,
                    errorRateCompliant: sli.errorRate <= this.config.sloTargets.errorRate,
                    throughputCompliant: sli.throughput >= this.config.sloTargets.throughputRPS,
                    dataFreshnessCompliant: sli.dataFreshness <= this.config.sloTargets.dataFreshness,
                    overallCompliant: false,
                };
                slo.overallCompliant =
                    slo.availabilityCompliant &&
                        slo.responseTimeCompliant &&
                        slo.errorRateCompliant &&
                        slo.throughputCompliant &&
                        slo.dataFreshnessCompliant;
                // Calculate error budget
                const errorBudget = await this.calculateErrorBudget(tenantId, sli, period);
                // Get performance breakdown
                const breakdown = await this.getPerformanceBreakdown(tenantId, rawMetrics);
                // Get resource utilization
                const resources = await this.getResourceUtilization(tenantId);
                const sloMetrics = {
                    tenantId,
                    timestamp: new Date(),
                    period,
                    sli,
                    slo,
                    errorBudget,
                    breakdown,
                    resources,
                };
                // Store metrics
                this.tenantSLOs.set(tenantId, sloMetrics);
                await this.storeSLOMetrics(sloMetrics);
                // Update Prometheus metrics
                this.updatePrometheusMetrics(sloMetrics);
                // Check for violations
                await this.checkSLOViolations(sloMetrics);
                return sloMetrics;
            }
            catch (error) {
                logger_js_1.default.error('Failed to calculate tenant SLO', {
                    tenantId,
                    period,
                    error: error instanceof Error ? error.message : String(error),
                });
                span.recordException(error);
                throw error;
            }
        });
    }
    async getRawMetrics(tenantId, period) {
        let interval;
        switch (period) {
            case 'minute':
                interval = '1 minute';
                break;
            case 'hour':
                interval = '1 hour';
                break;
            case 'day':
                interval = '1 day';
                break;
            default:
                interval = '1 minute';
        }
        // Query metrics from database
        const result = await this.db.query(`
      SELECT 
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE status_code >= 400) as errors,
        array_agg(response_time_ms) as response_times,
        COUNT(*) FILTER (WHERE status_code < 500) as successful_requests,
        EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as period_seconds
      FROM request_logs 
      WHERE tenant_id = $1 
      AND timestamp >= NOW() - INTERVAL '${interval}'
    `, [tenantId]);
        const row = result.rows[0] || {};
        return {
            requests: parseInt(row.requests) || 0,
            errors: parseInt(row.errors) || 0,
            responseTimes: row.response_times || [],
            uptime: parseInt(row.successful_requests) || 0,
            totalTime: parseFloat(row.period_seconds) || 1,
            lastDataUpdate: new Date(), // Would be from actual data timestamp
        };
    }
    calculateAvailability(metrics) {
        if (metrics.requests === 0)
            return 100;
        return ((metrics.requests - metrics.errors) / metrics.requests) * 100;
    }
    calculatePercentile(values, percentile) {
        if (!values || values.length === 0)
            return 0;
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    calculateErrorRate(metrics) {
        if (metrics.requests === 0)
            return 0;
        return (metrics.errors / metrics.requests) * 100;
    }
    calculateThroughput(metrics) {
        return metrics.totalTime > 0 ? metrics.requests / metrics.totalTime : 0;
    }
    calculateDataFreshness(metrics) {
        return (Date.now() - metrics.lastDataUpdate.getTime()) / 1000;
    }
    async calculateErrorBudget(tenantId, sli, period) {
        // Error budget calculation based on availability SLO
        const availabilityTarget = this.config.sloTargets.availability;
        const allowedDowntime = (100 - availabilityTarget) / 100;
        // Monthly error budget (assume 30 days)
        const monthlyBudget = allowedDowntime * 30 * 24 * 60; // minutes
        // Get consumed budget for current month
        const consumedBudget = await this.getConsumedErrorBudget(tenantId);
        const remainingBudget = Math.max(0, monthlyBudget - consumedBudget);
        // Calculate current burn rate
        const currentDowntime = (100 - sli.availability) / 100;
        const normalBurnRate = allowedDowntime;
        const burnRate = normalBurnRate > 0 ? currentDowntime / normalBurnRate : 0;
        // Estimate exhaustion date
        let exhaustionDate;
        if (burnRate > 0 && remainingBudget > 0) {
            const hoursToExhaustion = remainingBudget / (burnRate * 60);
            exhaustionDate = new Date(Date.now() + hoursToExhaustion * 60 * 60 * 1000);
        }
        return {
            totalBudget: monthlyBudget,
            consumedBudget,
            remainingBudget,
            burnRate,
            exhaustionDate,
        };
    }
    async getConsumedErrorBudget(tenantId) {
        // Query error budget consumption for current month
        const result = await this.db.query(`
      SELECT COALESCE(SUM(downtime_minutes), 0) as consumed
      FROM tenant_downtime_log
      WHERE tenant_id = $1
      AND date_trunc('month', timestamp) = date_trunc('month', NOW())
    `, [tenantId]);
        return parseFloat(result.rows[0]?.consumed) || 0;
    }
    async getPerformanceBreakdown(tenantId, rawMetrics) {
        // This would query detailed performance metrics
        return {
            graphqlLatency: 50, // Would be calculated from actual metrics
            databaseLatency: 30,
            networkLatency: 10,
            processingLatency: 40,
            queueLatency: 5,
        };
    }
    async getResourceUtilization(tenantId) {
        // This would query resource utilization metrics
        return {
            cpuUtilization: 45,
            memoryUtilization: 60,
            networkUtilization: 25,
            storageUtilization: 30,
        };
    }
    async storeSLOMetrics(metrics) {
        try {
            await this.db.query(`
        INSERT INTO tenant_slo_metrics (
          tenant_id, period, timestamp, metrics_data
        ) VALUES ($1, $2, $3, $4)
      `, [
                metrics.tenantId,
                metrics.period,
                metrics.timestamp,
                JSON.stringify(metrics),
            ]);
        }
        catch (error) {
            logger_js_1.default.error('Failed to store SLO metrics', {
                tenantId: metrics.tenantId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    updatePrometheusMetrics(metrics) {
        const { tenantId } = metrics;
        // Core SLO metrics
        this.metrics.setGauge('tenant_slo_availability', metrics.sli.availability, {
            tenant_id: tenantId,
        });
        this.metrics.setGauge('tenant_slo_response_time_p50', metrics.sli.responseTimeP50, { tenant_id: tenantId });
        this.metrics.setGauge('tenant_slo_response_time_p95', metrics.sli.responseTimeP95, { tenant_id: tenantId });
        this.metrics.setGauge('tenant_slo_response_time_p99', metrics.sli.responseTimeP99, { tenant_id: tenantId });
        this.metrics.setGauge('tenant_slo_error_rate', metrics.sli.errorRate, {
            tenant_id: tenantId,
        });
        this.metrics.setGauge('tenant_slo_throughput', metrics.sli.throughput, {
            tenant_id: tenantId,
        });
        // Error budget metrics
        this.metrics.setGauge('tenant_error_budget_remaining', metrics.errorBudget.remainingBudget, { tenant_id: tenantId });
        this.metrics.setGauge('tenant_error_budget_burn_rate', metrics.errorBudget.burnRate, { tenant_id: tenantId });
        if (metrics.errorBudget.exhaustionDate) {
            const hoursToExhaustion = (metrics.errorBudget.exhaustionDate.getTime() - Date.now()) /
                (1000 * 60 * 60);
            this.metrics.setGauge('tenant_error_budget_exhaustion_hours', hoursToExhaustion, { tenant_id: tenantId });
        }
        // SLO compliance
        this.metrics.setGauge('tenant_slo_compliance', metrics.slo.availabilityCompliant ? 1 : 0, {
            tenant_id: tenantId,
            slo_type: 'availability',
        });
        this.metrics.setGauge('tenant_slo_compliance', metrics.slo.responseTimeCompliant ? 1 : 0, {
            tenant_id: tenantId,
            slo_type: 'response_time',
        });
        this.metrics.setGauge('tenant_slo_compliance', metrics.slo.errorRateCompliant ? 1 : 0, {
            tenant_id: tenantId,
            slo_type: 'error_rate',
        });
        // Performance breakdown
        this.metrics.setGauge('tenant_latency_breakdown', metrics.breakdown.graphqlLatency, {
            tenant_id: tenantId,
            component: 'graphql',
        });
        this.metrics.setGauge('tenant_latency_breakdown', metrics.breakdown.databaseLatency, {
            tenant_id: tenantId,
            component: 'database',
        });
        this.metrics.setGauge('tenant_latency_breakdown', metrics.breakdown.networkLatency, {
            tenant_id: tenantId,
            component: 'network',
        });
        // Resource utilization
        this.metrics.setGauge('tenant_resource_utilization', metrics.resources.cpuUtilization, {
            tenant_id: tenantId,
            resource: 'cpu',
        });
        this.metrics.setGauge('tenant_resource_utilization', metrics.resources.memoryUtilization, {
            tenant_id: tenantId,
            resource: 'memory',
        });
    }
    async checkSLOViolations(metrics) {
        const violations = [];
        // Check availability violation
        if (!metrics.slo.availabilityCompliant) {
            const severity = metrics.sli.availability < this.config.sloTargets.availability - 1.0
                ? 'critical'
                : 'warning';
            violations.push({ type: 'availability', severity });
        }
        // Check response time violation
        if (!metrics.slo.responseTimeCompliant) {
            const severity = metrics.sli.responseTimeP95 >
                this.config.sloTargets.responseTimeP95 * 1.5
                ? 'critical'
                : 'warning';
            violations.push({ type: 'response_time', severity });
        }
        // Check error rate violation
        if (!metrics.slo.errorRateCompliant) {
            const severity = metrics.sli.errorRate > this.config.sloTargets.errorRate * 2
                ? 'critical'
                : 'warning';
            violations.push({ type: 'error_rate', severity });
        }
        // Generate alerts for violations
        for (const violation of violations) {
            await this.generateSLOAlert(metrics.tenantId, 'slo_violation', violation.severity, {
                sloType: violation.type,
                currentValue: this.getSLIValue(metrics.sli, violation.type),
                targetValue: this.getTargetValue(violation.type),
                burnRate: metrics.errorBudget.burnRate,
            });
            this.metrics.incrementCounter('tenant_slo_violations', {
                tenant_id: metrics.tenantId,
                slo_type: violation.type,
                severity: violation.severity,
            }, 1);
        }
    }
    getSLIValue(sli, type) {
        switch (type) {
            case 'availability':
                return sli.availability;
            case 'response_time':
                return sli.responseTimeP95;
            case 'error_rate':
                return sli.errorRate;
            case 'throughput':
                return sli.throughput;
            case 'data_freshness':
                return sli.dataFreshness;
            default:
                return 0;
        }
    }
    getTargetValue(type) {
        switch (type) {
            case 'availability':
                return this.config.sloTargets.availability;
            case 'response_time':
                return this.config.sloTargets.responseTimeP95;
            case 'error_rate':
                return this.config.sloTargets.errorRate;
            case 'throughput':
                return this.config.sloTargets.throughputRPS;
            case 'data_freshness':
                return this.config.sloTargets.dataFreshness;
            default:
                return 0;
        }
    }
    // Burn rate monitoring
    async monitorBurnRates() {
        for (const [tenantId, sloMetrics] of this.tenantSLOs.entries()) {
            // Track burn rate history
            const burnRateHistory = this.burnRateHistory.get(tenantId) || [];
            burnRateHistory.push({
                timestamp: new Date(),
                burnRate: sloMetrics.errorBudget.burnRate,
            });
            // Keep only recent history
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
            const recentHistory = burnRateHistory.filter((h) => h.timestamp.getTime() > cutoff);
            this.burnRateHistory.set(tenantId, recentHistory);
            // Check burn rate windows
            for (const window of this.config.burnRateWindows) {
                const shortBurnRate = this.calculateWindowBurnRate(recentHistory, window.shortWindow);
                const longBurnRate = this.calculateWindowBurnRate(recentHistory, window.longWindow);
                if (shortBurnRate > window.alertBurnRate &&
                    longBurnRate > window.alertBurnRate) {
                    await this.generateSLOAlert(tenantId, 'burn_rate', window.severity, {
                        sloType: 'error_budget',
                        currentValue: shortBurnRate,
                        targetValue: window.alertBurnRate,
                        burnRate: shortBurnRate,
                        timeToExhaustion: this.calculateTimeToExhaustion(tenantId, shortBurnRate),
                    });
                }
            }
        }
    }
    calculateWindowBurnRate(history, windowMinutes) {
        const cutoff = Date.now() - windowMinutes * 60 * 1000;
        const windowHistory = history.filter((h) => h.timestamp.getTime() > cutoff);
        if (windowHistory.length === 0)
            return 0;
        return (windowHistory.reduce((sum, h) => sum + h.burnRate, 0) /
            windowHistory.length);
    }
    calculateTimeToExhaustion(tenantId, burnRate) {
        const sloMetrics = this.tenantSLOs.get(tenantId);
        if (!sloMetrics || burnRate <= 0)
            return Infinity;
        return sloMetrics.errorBudget.remainingBudget / burnRate;
    }
    cleanupBurnRateHistory() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
        for (const [tenantId, history] of this.burnRateHistory.entries()) {
            const recentHistory = history.filter((h) => h.timestamp.getTime() > cutoff);
            this.burnRateHistory.set(tenantId, recentHistory);
        }
    }
    // Alert generation
    async generateSLOAlert(tenantId, alertType, severity, details) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            timestamp: new Date(),
            severity,
            type: alertType,
            details,
            context: {
                affectedServices: this.getAffectedServices(tenantId, details.sloType),
                potentialCauses: this.getPotentialCauses(alertType, details),
                recommendedActions: this.getRecommendedActions(alertType, details),
                escalationRequired: severity === 'critical',
            },
        };
        // Store alert
        await this.storeAlert(alert);
        // Add to active alerts
        const tenantAlerts = this.activeAlerts.get(tenantId) || [];
        tenantAlerts.push(alert);
        this.activeAlerts.set(tenantId, tenantAlerts);
        // Update metrics
        this.metrics.incrementCounter('tenant_slo_alerts', {
            tenant_id: tenantId,
            alert_type: alertType,
            severity,
        }, 1);
        this.metrics.setGauge('tenant_active_alerts', tenantAlerts.length, {
            tenant_id: tenantId,
        });
        // Emit alert event
        this.emit('sloAlert', alert);
        logger_js_1.default.warn('SLO alert generated', {
            tenantId,
            alertType,
            severity,
            sloType: details.sloType,
            currentValue: details.currentValue,
            targetValue: details.targetValue,
        });
    }
    getAffectedServices(tenantId, sloType) {
        // This would determine which services are affected based on the SLO type
        switch (sloType) {
            case 'availability':
                return ['api-gateway', 'graphql-server', 'database'];
            case 'response_time':
                return ['graphql-server', 'database', 'cache'];
            case 'error_rate':
                return ['api-gateway', 'graphql-server'];
            default:
                return ['unknown'];
        }
    }
    getPotentialCauses(alertType, details) {
        const causes = [];
        switch (alertType) {
            case 'burn_rate':
                causes.push('High error rate', 'Increased latency', 'Service degradation');
                break;
            case 'slo_violation':
                if (details.sloType === 'availability') {
                    causes.push('Service outages', 'Database connectivity issues', 'High error rates');
                }
                else if (details.sloType === 'response_time') {
                    causes.push('Database slow queries', 'Network latency', 'Resource contention');
                }
                break;
            case 'budget_exhaustion':
                causes.push('Sustained high error rate', 'Multiple service incidents');
                break;
            case 'anomaly':
                causes.push('Unusual traffic patterns', 'System anomalies', 'Data quality issues');
                break;
        }
        return causes;
    }
    getRecommendedActions(alertType, details) {
        const actions = [];
        switch (alertType) {
            case 'burn_rate':
                actions.push('Investigate recent changes', 'Check service health dashboards', 'Review error logs', 'Consider temporary traffic throttling');
                break;
            case 'slo_violation':
                actions.push('Check service dependencies', 'Review recent deployments', 'Scale resources if needed', 'Implement circuit breaker patterns');
                break;
            case 'budget_exhaustion':
                actions.push('Immediate incident response', 'Stop non-critical operations', 'Focus on error reduction', 'Consider emergency maintenance');
                break;
        }
        return actions;
    }
    async storeAlert(alert) {
        try {
            await this.db.query(`
        INSERT INTO tenant_slo_alerts (id, tenant_id, alert_data, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [alert.id, alert.tenantId, JSON.stringify(alert)]);
        }
        catch (error) {
            logger_js_1.default.error('Failed to store SLO alert', {
                alertId: alert.id,
                tenantId: alert.tenantId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Dashboard generation
    async generateTenantDashboard(tenantId) {
        return tracing_js_1.tracer.startActiveSpan('tenant_slo.generate_dashboard', async (span) => {
            try {
                span.setAttributes({ 'tenant_slo.tenant_id': tenantId });
                const dashboard = {
                    tenantId,
                    dashboardId: `tenant_slo_${tenantId}`,
                    title: `SLO Dashboard - ${tenantId}`,
                    panels: this.createDashboardPanels(tenantId),
                    metadata: {
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        version: '1.0.0',
                        autoGenerated: true,
                    },
                    grafanaConfig: this.generateGrafanaConfig(tenantId),
                };
                this.dashboards.set(tenantId, dashboard);
                await this.storeDashboard(dashboard);
                logger_js_1.default.info('Generated tenant dashboard', {
                    tenantId,
                    dashboardId: dashboard.dashboardId,
                    panelCount: dashboard.panels.length,
                });
                return dashboard;
            }
            catch (error) {
                logger_js_1.default.error('Failed to generate tenant dashboard', {
                    tenantId,
                    error: error instanceof Error ? error.message : String(error),
                });
                span.recordException(error);
                throw error;
            }
        });
    }
    createDashboardPanels(tenantId) {
        return [
            {
                id: 'availability',
                title: 'Availability',
                type: 'singlestat',
                query: `tenant_slo_availability{tenant_id="${tenantId}"}`,
                position: { x: 0, y: 0, width: 6, height: 4 },
                thresholds: { warning: 99.5, critical: 99.0 },
            },
            {
                id: 'response_time',
                title: 'Response Time (P95)',
                type: 'graph',
                query: `tenant_slo_response_time_p95{tenant_id="${tenantId}"}`,
                position: { x: 6, y: 0, width: 12, height: 4 },
                thresholds: {
                    warning: this.config.sloTargets.responseTimeP95,
                    critical: this.config.sloTargets.responseTimeP95 * 1.5,
                },
            },
            {
                id: 'error_rate',
                title: 'Error Rate',
                type: 'graph',
                query: `tenant_slo_error_rate{tenant_id="${tenantId}"}`,
                position: { x: 18, y: 0, width: 6, height: 4 },
                thresholds: {
                    warning: this.config.sloTargets.errorRate,
                    critical: this.config.sloTargets.errorRate * 2,
                },
            },
            {
                id: 'error_budget',
                title: 'Error Budget Remaining',
                type: 'singlestat',
                query: `tenant_error_budget_remaining{tenant_id="${tenantId}"}`,
                position: { x: 0, y: 4, width: 6, height: 4 },
                thresholds: { warning: 20, critical: 10 },
            },
            {
                id: 'burn_rate',
                title: 'Error Budget Burn Rate',
                type: 'graph',
                query: `tenant_error_budget_burn_rate{tenant_id="${tenantId}"}`,
                position: { x: 6, y: 4, width: 12, height: 4 },
                thresholds: { warning: 2.0, critical: 5.0 },
            },
            {
                id: 'latency_breakdown',
                title: 'Latency Breakdown',
                type: 'graph',
                query: `tenant_latency_breakdown{tenant_id="${tenantId}"}`,
                position: { x: 18, y: 4, width: 6, height: 4 },
            },
            {
                id: 'resource_utilization',
                title: 'Resource Utilization',
                type: 'graph',
                query: `tenant_resource_utilization{tenant_id="${tenantId}"}`,
                position: { x: 0, y: 8, width: 12, height: 4 },
                thresholds: { warning: 70, critical: 85 },
            },
            {
                id: 'throughput',
                title: 'Request Throughput',
                type: 'graph',
                query: `tenant_slo_throughput{tenant_id="${tenantId}"}`,
                position: { x: 12, y: 8, width: 12, height: 4 },
                thresholds: {
                    warning: this.config.sloTargets.throughputRPS * 0.8,
                    critical: this.config.sloTargets.throughputRPS * 0.6,
                },
            },
        ];
    }
    generateGrafanaConfig(tenantId) {
        return {
            dashboard: {
                id: null,
                title: `SLO Dashboard - ${tenantId}`,
                tags: ['slo', 'tenant', tenantId],
                style: 'dark',
                timezone: 'browser',
                panels: this.dashboards.get(tenantId)?.panels.map((panel) => ({
                    id: panel.id,
                    title: panel.title,
                    type: panel.type,
                    targets: [
                        {
                            expr: panel.query,
                            format: 'time_series',
                            legendFormat: '',
                        },
                    ],
                    gridPos: {
                        h: panel.position.height,
                        w: panel.position.width,
                        x: panel.position.x,
                        y: panel.position.y,
                    },
                    thresholds: panel.thresholds
                        ? {
                            mode: 'absolute',
                            steps: [
                                { color: 'green', value: null },
                                { color: 'yellow', value: panel.thresholds.warning },
                                { color: 'red', value: panel.thresholds.critical },
                            ],
                        }
                        : undefined,
                })) || [],
                time: {
                    from: 'now-1h',
                    to: 'now',
                },
                refresh: '30s',
            },
        };
    }
    async storeDashboard(dashboard) {
        try {
            await this.db.query(`
        INSERT INTO tenant_dashboards (dashboard_id, tenant_id, dashboard_config, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (dashboard_id) DO UPDATE SET
        dashboard_config = $3, updated_at = NOW()
      `, [dashboard.dashboardId, dashboard.tenantId, JSON.stringify(dashboard)]);
        }
        catch (error) {
            logger_js_1.default.error('Failed to store tenant dashboard', {
                dashboardId: dashboard.dashboardId,
                tenantId: dashboard.tenantId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Background processing
    async calculateAllTenantSLOs() {
        try {
            // Get all active tenants
            const tenants = await this.getActiveTenants();
            for (const tenantId of tenants) {
                try {
                    await this.calculateTenantSLO(tenantId);
                }
                catch (error) {
                    logger_js_1.default.error('Failed to calculate SLO for tenant', {
                        tenantId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to calculate all tenant SLOs', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async getActiveTenants() {
        const result = await this.db.query(`
      SELECT DISTINCT tenant_id 
      FROM request_logs 
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
    `);
        return result.rows.map((row) => row.tenant_id);
    }
    async generateHourlyReports() {
        for (const tenantId of this.tenantSLOs.keys()) {
            try {
                await this.calculateTenantSLO(tenantId, 'hour');
            }
            catch (error) {
                logger_js_1.default.error('Failed to generate hourly report for tenant', {
                    tenantId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    async updateAllDashboards() {
        for (const tenantId of this.tenantSLOs.keys()) {
            try {
                await this.generateTenantDashboard(tenantId);
            }
            catch (error) {
                logger_js_1.default.error('Failed to update dashboard for tenant', {
                    tenantId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    // Public API methods
    async getTenantSLO(tenantId) {
        // Return cached SLO or calculate fresh
        const cached = this.tenantSLOs.get(tenantId);
        if (cached && Date.now() - cached.timestamp.getTime() < 60000) {
            // 1 minute cache
            return cached;
        }
        try {
            return await this.calculateTenantSLO(tenantId);
        }
        catch (error) {
            return cached || null;
        }
    }
    async getTenantAlerts(tenantId) {
        return this.activeAlerts.get(tenantId) || [];
    }
    async getTenantDashboard(tenantId) {
        const cached = this.dashboards.get(tenantId);
        if (cached)
            return cached;
        try {
            return await this.generateTenantDashboard(tenantId);
        }
        catch (error) {
            return null;
        }
    }
    async resolveAlert(alertId, resolvedBy, resolution) {
        for (const [tenantId, alerts] of this.activeAlerts.entries()) {
            const alertIndex = alerts.findIndex((a) => a.id === alertId);
            if (alertIndex !== -1) {
                const alert = alerts[alertIndex];
                alert.resolution = {
                    resolvedAt: new Date(),
                    resolvedBy,
                    resolution,
                    preventiveMeasures: [],
                };
                // Update in database
                await this.storeAlert(alert);
                // Remove from active alerts
                alerts.splice(alertIndex, 1);
                this.metrics.setGauge('tenant_active_alerts', alerts.length, {
                    tenant_id: tenantId,
                });
                logger_js_1.default.info('SLO alert resolved', {
                    alertId,
                    tenantId,
                    resolvedBy,
                    resolution,
                });
                return true;
            }
        }
        return false;
    }
    // Admin methods
    getServiceStats() {
        const tenants = Array.from(this.tenantSLOs.values());
        const totalAlerts = Array.from(this.activeAlerts.values()).reduce((sum, alerts) => sum + alerts.length, 0);
        return {
            totalTenants: tenants.length,
            totalAlerts,
            totalDashboards: this.dashboards.size,
            avgAvailability: tenants.length > 0
                ? tenants.reduce((sum, slo) => sum + slo.sli.availability, 0) /
                    tenants.length
                : 0,
        };
    }
    async updateSLOTargets(tenantId, targets) {
        // In production, this would be per-tenant configuration
        Object.assign(this.config.sloTargets, targets);
        logger_js_1.default.info('SLO targets updated', { tenantId, targets });
        this.emit('sloTargetsUpdated', { tenantId, targets });
    }
}
exports.TenantSLOService = TenantSLOService;
// Export singleton instance
exports.tenantSLOService = new TenantSLOService({
    enabled: process.env.TENANT_SLO_ENABLED !== 'false',
    dashboardRefreshMinutes: parseInt(process.env.SLO_DASHBOARD_REFRESH_MINUTES || '5'),
    retentionDays: parseInt(process.env.SLO_RETENTION_DAYS || '90'),
    autoScalingEnabled: process.env.SLO_AUTO_SCALING_ENABLED === 'true',
}, new DatabaseService_js_1.DatabaseService());
