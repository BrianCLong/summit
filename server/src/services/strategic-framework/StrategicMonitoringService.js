"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicMonitoringService = exports.StrategicMonitoringService = void 0;
/**
 * Strategic Monitoring Service
 *
 * Provides comprehensive strategic monitoring capabilities including:
 * - Dashboard management
 * - KPI/metric tracking
 * - Progress reporting
 * - Alerting and notifications
 */
const uuid_1 = require("uuid");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const otel_js_1 = require("../../otel.js");
const StrategicPlanningService_js_1 = require("./StrategicPlanningService.js");
const tracer = typeof otel_js_1.getTracer === 'function'
    ? (0, otel_js_1.getTracer)('strategic-monitoring-service')
    : { startSpan: () => ({ end: () => { } }) };
// In-memory storage
const dashboardsStore = new Map();
const metricsStore = new Map();
const reportsStore = new Map();
const alertsStore = new Map();
class StrategicMonitoringService {
    static instance;
    constructor() {
        logger_js_1.default.info('StrategicMonitoringService initialized');
    }
    static getInstance() {
        if (!StrategicMonitoringService.instance) {
            StrategicMonitoringService.instance = new StrategicMonitoringService();
        }
        return StrategicMonitoringService.instance;
    }
    // ============================================================================
    // DASHBOARD MANAGEMENT
    // ============================================================================
    async createDashboard(input, userId) {
        const span = tracer.startSpan('monitoringService.createDashboard');
        try {
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const dashboard = {
                id,
                name: input.name,
                description: input.description,
                owner: input.owner,
                viewers: input.viewers || [],
                sections: [],
                refreshFrequency: input.refreshFrequency || 'DAILY',
                lastRefresh: now,
                alerts: [],
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            dashboardsStore.set(id, dashboard);
            logger_js_1.default.info({ dashboardId: id }, 'Dashboard created');
            return dashboard;
        }
        finally {
            span.end();
        }
    }
    async getDashboard(id) {
        const dashboard = dashboardsStore.get(id);
        if (!dashboard)
            return null;
        // Hydrate alerts
        const alerts = Array.from(alertsStore.values()).filter((a) => dashboard.sections.some((s) => s.metrics.includes(a.metricId)));
        return { ...dashboard, alerts };
    }
    async getAllDashboards(userId) {
        let dashboards = Array.from(dashboardsStore.values());
        if (userId) {
            dashboards = dashboards.filter((d) => d.owner === userId || d.viewers.includes(userId));
        }
        return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    async addDashboardSection(dashboardId, section, userId) {
        const dashboard = dashboardsStore.get(dashboardId);
        if (!dashboard) {
            throw new Error(`Dashboard not found: ${dashboardId}`);
        }
        const newSection = {
            ...section,
            id: (0, uuid_1.v4)(),
        };
        dashboard.sections.push(newSection);
        dashboard.updatedAt = new Date();
        dashboard.updatedBy = userId;
        dashboard.version++;
        dashboardsStore.set(dashboardId, dashboard);
        return dashboard;
    }
    async updateDashboardSection(dashboardId, sectionId, updates, userId) {
        const dashboard = dashboardsStore.get(dashboardId);
        if (!dashboard) {
            throw new Error(`Dashboard not found: ${dashboardId}`);
        }
        const sectionIndex = dashboard.sections.findIndex((s) => s.id === sectionId);
        if (sectionIndex === -1) {
            throw new Error(`Section not found: ${sectionId}`);
        }
        dashboard.sections[sectionIndex] = {
            ...dashboard.sections[sectionIndex],
            ...updates,
            id: sectionId,
        };
        dashboard.updatedAt = new Date();
        dashboard.updatedBy = userId;
        dashboard.version++;
        dashboardsStore.set(dashboardId, dashboard);
        return dashboard;
    }
    async deleteDashboard(id) {
        return dashboardsStore.delete(id);
    }
    // ============================================================================
    // METRIC MANAGEMENT
    // ============================================================================
    async createMetric(input, userId) {
        const span = tracer.startSpan('monitoringService.createMetric');
        try {
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const metric = {
                id,
                name: input.name,
                description: input.description,
                type: input.type,
                category: input.category,
                owner: input.owner,
                formula: input.formula,
                dataSource: input.dataSource,
                unit: input.unit,
                direction: input.direction,
                baseline: input.baseline,
                target: input.target,
                stretch: input.stretch || input.target * 1.2,
                current: input.baseline,
                previousPeriod: input.baseline,
                trend: {
                    direction: 'STABLE',
                    rate: 0,
                    volatility: 0,
                    seasonality: false,
                    projectedValue: input.baseline,
                    confidenceInterval: [input.baseline, input.baseline],
                },
                thresholds: this.generateDefaultThresholds(input.baseline, input.target, input.direction),
                linkedGoals: input.linkedGoals || [],
                linkedObjectives: input.linkedObjectives || [],
                history: [{ timestamp: now, value: input.baseline }],
                forecast: {
                    method: 'linear',
                    periods: [],
                    accuracy: 0,
                    lastUpdated: now,
                },
                annotations: [],
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            metricsStore.set(id, metric);
            logger_js_1.default.info({ metricId: id, name: metric.name }, 'Metric created');
            return metric;
        }
        finally {
            span.end();
        }
    }
    async getMetric(id) {
        return metricsStore.get(id) || null;
    }
    async getAllMetrics(filters) {
        let metrics = Array.from(metricsStore.values());
        if (filters) {
            if (filters.type)
                metrics = metrics.filter((m) => m.type === filters.type);
            if (filters.category)
                metrics = metrics.filter((m) => m.category === filters.category);
            if (filters.owner)
                metrics = metrics.filter((m) => m.owner === filters.owner);
        }
        return metrics.sort((a, b) => a.name.localeCompare(b.name));
    }
    async updateMetricValue(metricId, value, note, userId) {
        const span = tracer.startSpan('monitoringService.updateMetricValue');
        try {
            const metric = metricsStore.get(metricId);
            if (!metric) {
                throw new Error(`Metric not found: ${metricId}`);
            }
            const now = new Date();
            const previousValue = metric.current;
            // Add to history
            const dataPoint = { timestamp: now, value, note };
            metric.history.push(dataPoint);
            // Keep last 365 data points
            if (metric.history.length > 365) {
                metric.history = metric.history.slice(-365);
            }
            metric.previousPeriod = previousValue;
            metric.current = value;
            // Update trend analysis
            metric.trend = this.analyzeTrend(metric.history, metric.direction);
            // Update forecast
            metric.forecast = this.generateForecast(metric.history, metric.direction);
            // Check thresholds and create alerts
            await this.checkThresholds(metric);
            metric.updatedAt = now;
            if (userId)
                metric.updatedBy = userId;
            metric.version++;
            metricsStore.set(metricId, metric);
            logger_js_1.default.info({ metricId, value }, 'Metric value updated');
            return metric;
        }
        finally {
            span.end();
        }
    }
    async addMetricAnnotation(metricId, annotation) {
        const metric = metricsStore.get(metricId);
        if (!metric) {
            throw new Error(`Metric not found: ${metricId}`);
        }
        const newAnnotation = {
            ...annotation,
            id: (0, uuid_1.v4)(),
        };
        metric.annotations.push(newAnnotation);
        metric.updatedAt = new Date();
        metric.version++;
        metricsStore.set(metricId, metric);
        return metric;
    }
    async deleteMetric(id) {
        return metricsStore.delete(id);
    }
    generateDefaultThresholds(baseline, target, direction) {
        const range = Math.abs(target - baseline);
        const isHigherBetter = direction === 'HIGHER_IS_BETTER';
        if (isHigherBetter) {
            return [
                { level: 'CRITICAL', operator: 'LESS_THAN', value: baseline - range * 0.2, color: '#d32f2f', notification: true },
                { level: 'WARNING', operator: 'LESS_THAN', value: baseline, color: '#ff9800', notification: true },
                { level: 'CAUTION', operator: 'LESS_THAN', value: baseline + range * 0.5, color: '#ffeb3b', notification: false },
                { level: 'ON_TRACK', operator: 'GREATER_THAN_OR_EQUAL', value: baseline + range * 0.5, color: '#4caf50', notification: false },
                { level: 'EXCEEDING', operator: 'GREATER_THAN_OR_EQUAL', value: target, color: '#2196f3', notification: true },
            ];
        }
        else {
            return [
                { level: 'CRITICAL', operator: 'GREATER_THAN', value: baseline + range * 0.2, color: '#d32f2f', notification: true },
                { level: 'WARNING', operator: 'GREATER_THAN', value: baseline, color: '#ff9800', notification: true },
                { level: 'CAUTION', operator: 'GREATER_THAN', value: baseline - range * 0.5, color: '#ffeb3b', notification: false },
                { level: 'ON_TRACK', operator: 'LESS_THAN_OR_EQUAL', value: baseline - range * 0.5, color: '#4caf50', notification: false },
                { level: 'EXCEEDING', operator: 'LESS_THAN_OR_EQUAL', value: target, color: '#2196f3', notification: true },
            ];
        }
    }
    analyzeTrend(history, direction) {
        if (history.length < 2) {
            return {
                direction: 'STABLE',
                rate: 0,
                volatility: 0,
                seasonality: false,
                projectedValue: history[0]?.value || 0,
                confidenceInterval: [history[0]?.value || 0, history[0]?.value || 0],
            };
        }
        const values = history.map((h) => h.value);
        const n = values.length;
        // Calculate linear regression
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) * (i - xMean);
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const rate = Math.abs(slope);
        // Determine direction
        const isImproving = direction === 'HIGHER_IS_BETTER' ? slope > 0 : slope < 0;
        const trendDirection = Math.abs(slope) < 0.01 ? 'STABLE' : isImproving ? 'IMPROVING' : 'DECLINING';
        // Calculate volatility (standard deviation)
        const variance = values.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0) / n;
        const volatility = Math.sqrt(variance);
        // Simple projection
        const projectedValue = yMean + slope * n;
        // Confidence interval (simplified 95%)
        const stdError = volatility / Math.sqrt(n);
        const confidenceInterval = [
            projectedValue - 1.96 * stdError,
            projectedValue + 1.96 * stdError,
        ];
        return {
            direction: trendDirection,
            rate,
            volatility,
            seasonality: false, // Would need more sophisticated analysis
            projectedValue,
            confidenceInterval,
        };
    }
    generateForecast(history, direction) {
        const now = new Date();
        if (history.length < 3) {
            return {
                method: 'insufficient_data',
                periods: [],
                accuracy: 0,
                lastUpdated: now,
            };
        }
        const trend = this.analyzeTrend(history, direction);
        const periods = [];
        const lastValue = history[history.length - 1].value;
        // Generate 6 period forecast
        for (let i = 1; i <= 6; i++) {
            const predictedValue = lastValue + trend.rate * i * (trend.direction === 'IMPROVING' ? 1 : -1);
            periods.push({
                period: `Period +${i}`,
                predictedValue,
                confidenceLow: predictedValue - trend.volatility * 1.5,
                confidenceHigh: predictedValue + trend.volatility * 1.5,
            });
        }
        return {
            method: 'linear_regression',
            periods,
            accuracy: Math.max(0, 100 - trend.volatility * 10), // Simplified accuracy
            lastUpdated: now,
        };
    }
    async checkThresholds(metric) {
        for (const threshold of metric.thresholds) {
            let breached = false;
            switch (threshold.operator) {
                case 'LESS_THAN':
                    breached = metric.current < threshold.value;
                    break;
                case 'LESS_THAN_OR_EQUAL':
                    breached = metric.current <= threshold.value;
                    break;
                case 'EQUAL':
                    breached = metric.current === threshold.value;
                    break;
                case 'GREATER_THAN_OR_EQUAL':
                    breached = metric.current >= threshold.value;
                    break;
                case 'GREATER_THAN':
                    breached = metric.current > threshold.value;
                    break;
            }
            if (breached && threshold.notification) {
                const existingAlert = Array.from(alertsStore.values()).find((a) => a.metricId === metric.id &&
                    a.type === 'THRESHOLD_BREACH' &&
                    !a.acknowledged);
                if (!existingAlert) {
                    const alert = {
                        id: (0, uuid_1.v4)(),
                        metricId: metric.id,
                        type: 'THRESHOLD_BREACH',
                        severity: threshold.level === 'CRITICAL' ? 'CRITICAL' : threshold.level === 'WARNING' ? 'WARNING' : 'INFO',
                        message: `${metric.name} is at ${threshold.level} level: ${metric.current} ${metric.unit}`,
                        triggered: new Date(),
                        acknowledged: false,
                    };
                    alertsStore.set(alert.id, alert);
                    logger_js_1.default.warn({ alertId: alert.id, metricId: metric.id, level: threshold.level }, 'Threshold alert triggered');
                }
            }
        }
    }
    // ============================================================================
    // ALERTING
    // ============================================================================
    async getActiveAlerts() {
        return Array.from(alertsStore.values())
            .filter((a) => !a.acknowledged)
            .sort((a, b) => {
            const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }
    async acknowledgeAlert(alertId, userId, resolution) {
        const alert = alertsStore.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
        alert.resolution = resolution;
        alertsStore.set(alertId, alert);
        return alert;
    }
    // ============================================================================
    // PROGRESS REPORTING
    // ============================================================================
    async generateProgressReport(reportType, periodStart, periodEnd, userId) {
        const span = tracer.startSpan('monitoringService.generateProgressReport');
        try {
            const now = new Date();
            const id = (0, uuid_1.v4)();
            // Get strategic overview
            const overview = await StrategicPlanningService_js_1.strategicPlanningService.getStrategicOverview();
            const allGoals = await StrategicPlanningService_js_1.strategicPlanningService.getAllGoals();
            // Generate goal progress
            const goalProgress = allGoals.map((goal) => ({
                goalId: goal.id,
                goalTitle: goal.title,
                previousProgress: Math.max(0, goal.progress - 5), // Simplified - would track actual history
                currentProgress: goal.progress,
                change: 5, // Simplified
                status: goal.status,
                healthScore: goal.healthScore,
                onTrack: goal.healthScore >= 70,
                blockers: goal.risks.slice(0, 3),
                achievements: goal.successCriteria.filter((c) => c.achieved).map((c) => c.criterion),
            }));
            // Generate initiative progress (simplified)
            const initiativeProgress = [];
            // Generate metric summaries
            const metrics = await this.getAllMetrics();
            const metricSummaries = metrics.slice(0, 10).map((m) => ({
                metricId: m.id,
                metricName: m.name,
                previousValue: m.previousPeriod,
                currentValue: m.current,
                change: m.current - m.previousPeriod,
                changePercent: m.previousPeriod !== 0
                    ? ((m.current - m.previousPeriod) / m.previousPeriod) * 100
                    : 0,
                target: m.target,
                attainment: m.target !== 0 ? (m.current / m.target) * 100 : 0,
                trend: m.trend.direction,
            }));
            const report = {
                id,
                reportType,
                periodStart,
                periodEnd,
                goals: goalProgress,
                initiatives: initiativeProgress,
                metrics: metricSummaries,
                highlights: this.generateHighlights(goalProgress, metricSummaries),
                challenges: this.generateChallenges(goalProgress, metricSummaries),
                risks: [],
                decisions: [],
                nextPeriodFocus: this.generateNextPeriodFocus(goalProgress),
                executiveSummary: this.generateExecutiveSummary(overview, goalProgress, metricSummaries),
                detailedNarrative: '',
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            reportsStore.set(id, report);
            logger_js_1.default.info({ reportId: id, reportType }, 'Progress report generated');
            return report;
        }
        finally {
            span.end();
        }
    }
    async getReport(id) {
        return reportsStore.get(id) || null;
    }
    async getAllReports(filters) {
        let reports = Array.from(reportsStore.values());
        if (filters) {
            if (filters.reportType)
                reports = reports.filter((r) => r.reportType === filters.reportType);
            if (filters.startDate)
                reports = reports.filter((r) => r.periodStart >= filters.startDate);
            if (filters.endDate)
                reports = reports.filter((r) => r.periodEnd <= filters.endDate);
        }
        return reports.sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
    }
    generateHighlights(goals, metrics) {
        const highlights = [];
        const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
        if (completedGoals.length > 0) {
            highlights.push(`${completedGoals.length} goal(s) completed`);
        }
        const improvingMetrics = metrics.filter((m) => m.trend === 'IMPROVING');
        if (improvingMetrics.length > 0) {
            highlights.push(`${improvingMetrics.length} metric(s) showing positive trend`);
        }
        const exceedingTargets = metrics.filter((m) => m.attainment >= 100);
        if (exceedingTargets.length > 0) {
            highlights.push(`${exceedingTargets.length} metric(s) exceeding targets`);
        }
        return highlights;
    }
    generateChallenges(goals, metrics) {
        const challenges = [];
        const atRiskGoals = goals.filter((g) => !g.onTrack);
        if (atRiskGoals.length > 0) {
            challenges.push(`${atRiskGoals.length} goal(s) at risk or behind schedule`);
        }
        const decliningMetrics = metrics.filter((m) => m.trend === 'DECLINING');
        if (decliningMetrics.length > 0) {
            challenges.push(`${decliningMetrics.length} metric(s) showing negative trend`);
        }
        const blockedGoals = goals.filter((g) => g.blockers.length > 0);
        if (blockedGoals.length > 0) {
            challenges.push(`${blockedGoals.length} goal(s) have identified blockers`);
        }
        return challenges;
    }
    generateNextPeriodFocus(goals) {
        const focus = [];
        const atRiskGoals = goals.filter((g) => !g.onTrack);
        for (const goal of atRiskGoals.slice(0, 3)) {
            focus.push(`Address blockers for: ${goal.goalTitle}`);
        }
        const highProgress = goals.filter((g) => g.currentProgress >= 80 && g.status === 'ACTIVE');
        for (const goal of highProgress.slice(0, 2)) {
            focus.push(`Complete final milestones for: ${goal.goalTitle}`);
        }
        return focus;
    }
    generateExecutiveSummary(overview, goals, metrics) {
        const onTrackCount = goals.filter((g) => g.onTrack).length;
        const totalGoals = goals.length;
        const avgProgress = goals.length > 0
            ? Math.round(goals.reduce((sum, g) => sum + g.currentProgress, 0) / goals.length)
            : 0;
        const improvingMetrics = metrics.filter((m) => m.trend === 'IMPROVING').length;
        return `Strategic Progress Summary: ${onTrackCount}/${totalGoals} goals on track with average progress of ${avgProgress}%. ` +
            `${improvingMetrics} key metrics showing improvement. ` +
            `Health Score: ${overview.averageHealthScore}%. Active initiatives: ${overview.activeGoals}.`;
    }
    // ============================================================================
    // STRATEGIC HEALTH DASHBOARD
    // ============================================================================
    async getStrategicHealthSummary() {
        const span = tracer.startSpan('monitoringService.getStrategicHealthSummary');
        try {
            const overview = await StrategicPlanningService_js_1.strategicPlanningService.getStrategicOverview();
            const metrics = await this.getAllMetrics();
            const alerts = await this.getActiveAlerts();
            // Goal health categorization
            const goals = await StrategicPlanningService_js_1.strategicPlanningService.getAllGoals();
            const goalHealth = {
                healthy: goals.filter((g) => g.healthScore >= 70).length,
                warning: goals.filter((g) => g.healthScore >= 40 && g.healthScore < 70).length,
                critical: goals.filter((g) => g.healthScore < 40).length,
            };
            // Metric health categorization
            const metricHealth = {
                onTrack: metrics.filter((m) => {
                    const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
                    return attainment >= 80;
                }).length,
                atRisk: metrics.filter((m) => {
                    const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
                    return attainment >= 50 && attainment < 80;
                }).length,
                offTrack: metrics.filter((m) => {
                    const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
                    return attainment < 50;
                }).length,
            };
            // Alert counts
            const alertCount = {
                critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
                warning: alerts.filter((a) => a.severity === 'WARNING').length,
                info: alerts.filter((a) => a.severity === 'INFO').length,
            };
            // Recent changes (simplified - would track actual changes)
            const recentChanges = [];
            return {
                overallHealth: overview.averageHealthScore,
                goalHealth,
                metricHealth,
                alertCount,
                recentChanges,
            };
        }
        finally {
            span.end();
        }
    }
}
exports.StrategicMonitoringService = StrategicMonitoringService;
exports.strategicMonitoringService = StrategicMonitoringService.getInstance();
