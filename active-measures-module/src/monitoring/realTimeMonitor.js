"use strict";
/**
 * Real-Time Monitoring and Feedback System
 *
 * Implements comprehensive monitoring of active measures operations
 * with real-time feedback loops, anomaly detection, and adaptive
 * response mechanisms.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeMonitor = exports.HealthStatus = exports.RiskLevel = exports.KPIStatus = exports.TrendDirection = exports.OperationStatus = exports.FeedbackType = exports.AnomalyType = exports.Priority = exports.RecommendedAction = exports.AlertStatus = exports.AlertType = exports.AlertSeverity = exports.MetricSource = exports.MetricType = void 0;
const events_1 = require("events");
const ws_1 = require("ws");
// Enums
var MetricType;
(function (MetricType) {
    MetricType["ENGAGEMENT"] = "engagement";
    MetricType["REACH"] = "reach";
    MetricType["SENTIMENT"] = "sentiment";
    MetricType["VIRALITY"] = "virality";
    MetricType["ATTRIBUTION"] = "attribution";
    MetricType["EFFECTIVENESS"] = "effectiveness";
    MetricType["RISK_EXPOSURE"] = "risk_exposure";
    MetricType["COMPLIANCE"] = "compliance";
    MetricType["PERFORMANCE"] = "performance";
    MetricType["COST"] = "cost";
    MetricType["TIMELINE"] = "timeline";
    MetricType["QUALITY"] = "quality";
})(MetricType || (exports.MetricType = MetricType = {}));
var MetricSource;
(function (MetricSource) {
    MetricSource["SOCIAL_MEDIA_API"] = "social_media_api";
    MetricSource["NEWS_MONITORING"] = "news_monitoring";
    MetricSource["SURVEY_DATA"] = "survey_data";
    MetricSource["WEB_ANALYTICS"] = "web_analytics";
    MetricSource["SENTIMENT_ANALYSIS"] = "sentiment_analysis";
    MetricSource["BEHAVIORAL_TRACKING"] = "behavioral_tracking";
    MetricSource["INTERNAL_SYSTEMS"] = "internal_systems";
    MetricSource["EXTERNAL_FEEDS"] = "external_feeds";
    MetricSource["AI_ANALYSIS"] = "ai_analysis";
    MetricSource["HUMAN_ASSESSMENT"] = "human_assessment";
})(MetricSource || (exports.MetricSource = MetricSource = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["EMERGENCY"] = "emergency";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertType;
(function (AlertType) {
    AlertType["PERFORMANCE_DEGRADATION"] = "performance_degradation";
    AlertType["ANOMALY_DETECTED"] = "anomaly_detected";
    AlertType["THRESHOLD_EXCEEDED"] = "threshold_exceeded";
    AlertType["COMPLIANCE_VIOLATION"] = "compliance_violation";
    AlertType["SECURITY_INCIDENT"] = "security_incident";
    AlertType["SYSTEM_ERROR"] = "system_error";
    AlertType["EFFECTIVENESS_DECLINE"] = "effectiveness_decline";
    AlertType["RISK_ESCALATION"] = "risk_escalation";
    AlertType["ATTRIBUTION_WARNING"] = "attribution_warning";
    AlertType["RESOURCE_EXHAUSTION"] = "resource_exhaustion";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["INVESTIGATING"] = "investigating";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var RecommendedAction;
(function (RecommendedAction) {
    RecommendedAction["ADJUST_PARAMETERS"] = "adjust_parameters";
    RecommendedAction["SCALE_UP"] = "scale_up";
    RecommendedAction["SCALE_DOWN"] = "scale_down";
    RecommendedAction["PAUSE_OPERATION"] = "pause_operation";
    RecommendedAction["ABORT_OPERATION"] = "abort_operation";
    RecommendedAction["INVESTIGATE_FURTHER"] = "investigate_further";
    RecommendedAction["NOTIFY_OPERATOR"] = "notify_operator";
    RecommendedAction["AUTOMATIC_REMEDIATION"] = "automatic_remediation";
    RecommendedAction["MANUAL_REVIEW"] = "manual_review";
    RecommendedAction["ESCALATE_TO_SUPERVISOR"] = "escalate_to_supervisor";
})(RecommendedAction || (exports.RecommendedAction = RecommendedAction = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
var AnomalyType;
(function (AnomalyType) {
    AnomalyType["STATISTICAL_OUTLIER"] = "statistical_outlier";
    AnomalyType["TREND_DEVIATION"] = "trend_deviation";
    AnomalyType["PATTERN_ANOMALY"] = "pattern_anomaly";
    AnomalyType["CORRELATION_BREAK"] = "correlation_break";
    AnomalyType["SEASONAL_ANOMALY"] = "seasonal_anomaly";
    AnomalyType["POINT_ANOMALY"] = "point_anomaly";
    AnomalyType["CONTEXTUAL_ANOMALY"] = "contextual_anomaly";
})(AnomalyType || (exports.AnomalyType = AnomalyType = {}));
var FeedbackType;
(function (FeedbackType) {
    FeedbackType["PARAMETER_ADJUSTMENT"] = "parameter_adjustment";
    FeedbackType["RESOURCE_REALLOCATION"] = "resource_reallocation";
    FeedbackType["STRATEGY_MODIFICATION"] = "strategy_modification";
    FeedbackType["TIMING_ADJUSTMENT"] = "timing_adjustment";
    FeedbackType["TARGET_REFINEMENT"] = "target_refinement";
    FeedbackType["CONTENT_OPTIMIZATION"] = "content_optimization";
})(FeedbackType || (exports.FeedbackType = FeedbackType = {}));
var OperationStatus;
(function (OperationStatus) {
    OperationStatus["PLANNING"] = "planning";
    OperationStatus["ACTIVE"] = "active";
    OperationStatus["PAUSED"] = "paused";
    OperationStatus["COMPLETED"] = "completed";
    OperationStatus["ABORTED"] = "aborted";
    OperationStatus["ERROR"] = "error";
})(OperationStatus || (exports.OperationStatus = OperationStatus = {}));
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["INCREASING"] = "increasing";
    TrendDirection["DECREASING"] = "decreasing";
    TrendDirection["STABLE"] = "stable";
    TrendDirection["VOLATILE"] = "volatile";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
var KPIStatus;
(function (KPIStatus) {
    KPIStatus["ON_TARGET"] = "on_target";
    KPIStatus["ABOVE_TARGET"] = "above_target";
    KPIStatus["BELOW_TARGET"] = "below_target";
    KPIStatus["CRITICAL"] = "critical";
})(KPIStatus || (exports.KPIStatus = KPIStatus = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["WARNING"] = "warning";
    HealthStatus["CRITICAL"] = "critical";
    HealthStatus["DOWN"] = "down";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
/**
 * Real-Time Monitoring Engine
 */
class RealTimeMonitor extends events_1.EventEmitter {
    config;
    metrics = new Map();
    alerts = new Map();
    feedbackLoops = new Map();
    wsServer;
    activeOperations = new Set();
    monitoringIntervals = new Map();
    constructor(config) {
        super();
        this.config = config;
        if (config.enableRealTimeTracking) {
            this.initializeWebSocketServer();
        }
    }
    /**
     * Start monitoring an operation
     */
    async startMonitoring(operationId) {
        this.activeOperations.add(operationId);
        // Initialize metric storage
        if (!this.metrics.has(operationId)) {
            this.metrics.set(operationId, []);
        }
        // Set up monitoring interval
        const interval = setInterval(async () => {
            await this.collectMetrics(operationId);
            await this.analyzeMetrics(operationId);
            await this.checkAlertConditions(operationId);
            await this.processFeedbackLoops(operationId);
        }, this.config.samplingInterval);
        this.monitoringIntervals.set(operationId, interval);
        this.emit('monitoring_started', { operationId });
    }
    /**
     * Stop monitoring an operation
     */
    async stopMonitoring(operationId) {
        this.activeOperations.delete(operationId);
        // Clear monitoring interval
        const interval = this.monitoringIntervals.get(operationId);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(operationId);
        }
        this.emit('monitoring_stopped', { operationId });
    }
    /**
     * Record a metric manually
     */
    async recordMetric(operationId, metricType, value, unit, source, context) {
        const metric = {
            id: this.generateMetricId(),
            operationId,
            timestamp: new Date(),
            metricType,
            value,
            unit,
            source,
            confidence: 1.0,
            context: context || {},
            tags: [],
        };
        // Store metric
        if (!this.metrics.has(operationId)) {
            this.metrics.set(operationId, []);
        }
        this.metrics.get(operationId).push(metric);
        // Emit real-time update
        this.emit('metric_recorded', metric);
        // Check for immediate alerts
        await this.checkMetricThresholds(metric);
        // Broadcast to WebSocket clients
        this.broadcastMetric(metric);
        return metric.id;
    }
    /**
     * Create a feedback loop
     */
    createFeedbackLoop(operationId, sourceMetrics, targetParameters, feedbackType, sensitivity = 0.5) {
        const feedbackLoop = {
            id: this.generateFeedbackLoopId(),
            operationId,
            sourceMetrics: sourceMetrics.map((m) => m.toString()),
            targetParameters,
            feedbackType,
            sensitivity,
            responsiveness: 0.7,
            enabled: true,
            adjustmentHistory: [],
        };
        this.feedbackLoops.set(feedbackLoop.id, feedbackLoop);
        this.emit('feedback_loop_created', feedbackLoop);
        return feedbackLoop.id;
    }
    /**
     * Get real-time dashboard for an operation
     */
    getDashboard(operationId) {
        const operationMetrics = this.metrics.get(operationId) || [];
        const operationAlerts = Array.from(this.alerts.values()).filter((alert) => alert.operationId === operationId);
        const dashboard = {
            operationId,
            lastUpdated: new Date(),
            status: this.getOperationStatus(operationId),
            overallHealth: this.calculateHealthScore(operationId),
            kpis: this.calculateKPIs(operationMetrics),
            realtimeMetrics: this.generateRealtimeMetricSummaries(operationMetrics),
            trends: this.analyzeTrends(operationMetrics),
            forecasts: this.generateForecasts(operationMetrics),
            activeAlerts: operationAlerts.filter((a) => a.status === AlertStatus.ACTIVE),
            riskIndicators: this.calculateRiskIndicators(operationId),
            activeFeedbackLoops: this.getFeedbackLoopStatuses(operationId),
            performance: this.calculatePerformanceSummary(operationMetrics),
        };
        return dashboard;
    }
    /**
     * Get anomaly detection results
     */
    async detectAnomalies(operationId) {
        const operationMetrics = this.metrics.get(operationId) || [];
        if (operationMetrics.length < 10) {
            return []; // Need minimum data points for anomaly detection
        }
        const anomalies = [];
        // Statistical outlier detection
        const statisticalAnomalies = this.detectStatisticalOutliers(operationMetrics);
        anomalies.push(...statisticalAnomalies);
        // Trend deviation detection
        const trendAnomalies = this.detectTrendDeviations(operationMetrics);
        anomalies.push(...trendAnomalies);
        // Pattern anomalies
        const patternAnomalies = this.detectPatternAnomalies(operationMetrics);
        anomalies.push(...patternAnomalies);
        return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        this.emit('alert_acknowledged', alert);
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId, resolution) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = new Date();
        alert.resolution = resolution;
        this.emit('alert_resolved', alert);
    }
    /**
     * Get monitoring statistics
     */
    getMonitoringStatistics() {
        const totalMetrics = Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0);
        const activeAlerts = Array.from(this.alerts.values()).filter((alert) => alert.status === AlertStatus.ACTIVE).length;
        const activeFeedbackLoops = Array.from(this.feedbackLoops.values()).filter((loop) => loop.enabled).length;
        return {
            activeOperations: this.activeOperations.size,
            totalMetrics,
            activeAlerts,
            activeFeedbackLoops,
            avgMetricsPerOperation: this.activeOperations.size > 0
                ? totalMetrics / this.activeOperations.size
                : 0,
        };
    }
    // Private helper methods
    initializeWebSocketServer() {
        this.wsServer = new ws_1.WebSocketServer({ port: 8080 });
        this.wsServer.on('connection', (ws) => {
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                }
                catch (error) {
                    ws.send(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        });
    }
    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe_operation':
                // Add client to operation subscription
                ws.send(JSON.stringify({
                    type: 'subscription_confirmed',
                    operationId: data.operationId,
                }));
                break;
            case 'get_dashboard':
                const dashboard = this.getDashboard(data.operationId);
                ws.send(JSON.stringify({
                    type: 'dashboard_data',
                    data: dashboard,
                }));
                break;
        }
    }
    broadcastMetric(metric) {
        if (!this.wsServer)
            return;
        const message = JSON.stringify({
            type: 'metric_update',
            data: metric,
        });
        this.wsServer.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    async collectMetrics(operationId) {
        // Simulate metric collection from various sources
        const metricTypes = [
            MetricType.ENGAGEMENT,
            MetricType.REACH,
            MetricType.SENTIMENT,
            MetricType.EFFECTIVENESS,
        ];
        for (const metricType of metricTypes) {
            const value = this.generateSimulatedMetricValue(metricType);
            await this.recordMetric(operationId, metricType, value, this.getMetricUnit(metricType), MetricSource.AI_ANALYSIS);
        }
    }
    generateSimulatedMetricValue(metricType) {
        // Generate realistic simulated values
        switch (metricType) {
            case MetricType.ENGAGEMENT:
                return Math.random() * 100; // percentage
            case MetricType.REACH:
                return Math.floor(Math.random() * 10000); // number of people
            case MetricType.SENTIMENT:
                return (Math.random() - 0.5) * 2; // -1 to 1
            case MetricType.EFFECTIVENESS:
                return Math.random() * 100; // percentage
            default:
                return Math.random();
        }
    }
    getMetricUnit(metricType) {
        const units = {
            [MetricType.ENGAGEMENT]: 'percentage',
            [MetricType.REACH]: 'count',
            [MetricType.SENTIMENT]: 'score',
            [MetricType.EFFECTIVENESS]: 'percentage',
            [MetricType.ATTRIBUTION]: 'score',
            [MetricType.RISK_EXPOSURE]: 'score',
            [MetricType.COMPLIANCE]: 'percentage',
            [MetricType.PERFORMANCE]: 'score',
            [MetricType.COST]: 'currency',
            [MetricType.TIMELINE]: 'days',
            [MetricType.QUALITY]: 'score',
            [MetricType.VIRALITY]: 'coefficient',
        };
        return units[metricType] || 'units';
    }
    async analyzeMetrics(operationId) {
        if (this.config.enableAnomalyDetection) {
            const anomalies = await this.detectAnomalies(operationId);
            for (const anomaly of anomalies) {
                if (anomaly.anomalyScore > this.config.alertThresholds.anomalyScore) {
                    await this.createAlert(operationId, AlertType.ANOMALY_DETECTED, anomaly.severity, 'Anomaly Detected', anomaly.description, anomaly.affectedMetrics, anomaly.suggestedActions.map((action) => ({
                        id: this.generateAlertRecommendationId(),
                        action: RecommendedAction.INVESTIGATE_FURTHER,
                        priority: Priority.HIGH,
                        description: action,
                        expectedImpact: 'Reduce anomaly impact',
                        confidence: anomaly.confidence,
                        automatable: false,
                    })));
                }
            }
        }
    }
    async checkAlertConditions(operationId) {
        const operationMetrics = this.metrics.get(operationId) || [];
        const recentMetrics = operationMetrics.slice(-10); // Last 10 metrics
        // Check effectiveness decline
        const effectivenessMetrics = recentMetrics.filter((m) => m.metricType === MetricType.EFFECTIVENESS);
        if (effectivenessMetrics.length >= 3) {
            const trend = this.calculateTrend(effectivenessMetrics.map((m) => m.value));
            if (trend < -this.config.alertThresholds.effectivenessDecline) {
                await this.createAlert(operationId, AlertType.EFFECTIVENESS_DECLINE, AlertSeverity.HIGH, 'Effectiveness Decline Detected', `Effectiveness has declined by ${Math.abs(trend * 100).toFixed(1)}%`, effectivenessMetrics.map((m) => m.id), [
                    {
                        id: this.generateAlertRecommendationId(),
                        action: RecommendedAction.ADJUST_PARAMETERS,
                        priority: Priority.HIGH,
                        description: 'Consider adjusting operation parameters',
                        expectedImpact: 'Improve effectiveness',
                        confidence: 0.8,
                        automatable: true,
                    },
                ]);
            }
        }
    }
    async checkMetricThresholds(metric) {
        // Define thresholds for different metric types
        const thresholds = {
            [MetricType.RISK_EXPOSURE]: 0.8,
            [MetricType.ATTRIBUTION]: 0.7,
            [MetricType.COMPLIANCE]: 0.9,
        };
        const threshold = thresholds[metric.metricType];
        if (threshold && metric.value > threshold) {
            await this.createAlert(metric.operationId, AlertType.THRESHOLD_EXCEEDED, AlertSeverity.HIGH, 'Metric Threshold Exceeded', `${metric.metricType} value ${metric.value} exceeded threshold ${threshold}`, [metric.id], [
                {
                    id: this.generateAlertRecommendationId(),
                    action: RecommendedAction.INVESTIGATE_FURTHER,
                    priority: Priority.HIGH,
                    description: 'Investigate cause of threshold breach',
                    expectedImpact: 'Prevent escalation',
                    confidence: 0.9,
                    automatable: false,
                },
            ]);
        }
    }
    async processFeedbackLoops(operationId) {
        const operationFeedbackLoops = Array.from(this.feedbackLoops.values()).filter((loop) => loop.operationId === operationId && loop.enabled);
        for (const loop of operationFeedbackLoops) {
            await this.processFeedbackLoop(loop);
        }
    }
    async processFeedbackLoop(loop) {
        const operationMetrics = this.metrics.get(loop.operationId) || [];
        // Get relevant source metrics
        const sourceMetrics = operationMetrics.filter((m) => loop.sourceMetrics.includes(m.metricType.toString()));
        if (sourceMetrics.length === 0)
            return;
        // Calculate adjustment needed
        const recentMetrics = sourceMetrics.slice(-5); // Last 5 metrics
        const average = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
        // Determine if adjustment is needed
        const targetValue = this.getTargetValue(loop.feedbackType);
        const deviation = Math.abs(average - targetValue);
        if (deviation > loop.sensitivity) {
            // Calculate adjustment
            const adjustment = (targetValue - average) * loop.responsiveness;
            // Apply adjustment to target parameters
            for (const parameter of loop.targetParameters) {
                const feedbackAdjustment = {
                    timestamp: new Date(),
                    parameter,
                    oldValue: average,
                    newValue: average + adjustment,
                    reason: `Feedback loop triggered by ${loop.feedbackType}`,
                    confidence: 0.8,
                    impact: Math.abs(adjustment),
                };
                loop.adjustmentHistory.push(feedbackAdjustment);
                loop.lastTriggered = new Date();
                // Emit adjustment event
                this.emit('feedback_adjustment', {
                    feedbackLoopId: loop.id,
                    adjustment: feedbackAdjustment,
                });
            }
        }
    }
    async createAlert(operationId, type, severity, title, description, metricIds, recommendations) {
        const alert = {
            id: this.generateAlertId(),
            operationId,
            timestamp: new Date(),
            severity,
            type,
            title,
            description,
            metrics: metricIds,
            recommendations,
            status: AlertStatus.ACTIVE,
        };
        this.alerts.set(alert.id, alert);
        this.emit('alert_created', alert);
        // Broadcast alert to WebSocket clients
        this.broadcastAlert(alert);
        // Auto-remediation if configured and safe
        if (this.config.enableAutomaticResponse &&
            this.isAutoRemediationSafe(alert)) {
            await this.executeAutoRemediation(alert);
        }
    }
    broadcastAlert(alert) {
        if (!this.wsServer)
            return;
        const message = JSON.stringify({
            type: 'alert',
            data: alert,
        });
        this.wsServer.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    isAutoRemediationSafe(alert) {
        // Only allow auto-remediation for low-risk alerts
        return (alert.severity === AlertSeverity.LOW ||
            alert.severity === AlertSeverity.MEDIUM);
    }
    async executeAutoRemediation(alert) {
        const automatableRecommendations = alert.recommendations.filter((r) => r.automatable);
        for (const recommendation of automatableRecommendations) {
            try {
                await this.executeRecommendation(alert.operationId, recommendation);
                this.emit('auto_remediation_executed', {
                    alertId: alert.id,
                    recommendationId: recommendation.id,
                });
            }
            catch (error) {
                this.emit('auto_remediation_failed', {
                    alertId: alert.id,
                    recommendationId: recommendation.id,
                    error: error.message,
                });
            }
        }
    }
    async executeRecommendation(operationId, recommendation) {
        switch (recommendation.action) {
            case RecommendedAction.ADJUST_PARAMETERS:
                // Simulate parameter adjustment
                break;
            case RecommendedAction.SCALE_UP:
                // Simulate scaling up resources
                break;
            case RecommendedAction.SCALE_DOWN:
                // Simulate scaling down resources
                break;
            default:
                // Log unhandled recommendation
                break;
        }
    }
    // Analysis and calculation methods
    getOperationStatus(operationId) {
        if (this.activeOperations.has(operationId)) {
            return OperationStatus.ACTIVE;
        }
        return OperationStatus.COMPLETED;
    }
    calculateHealthScore(operationId) {
        const operationMetrics = this.metrics.get(operationId) || [];
        const operationAlerts = Array.from(this.alerts.values()).filter((alert) => alert.operationId === operationId &&
            alert.status === AlertStatus.ACTIVE);
        // Base health on metrics and alerts
        let operational = 90;
        let technical = 95;
        const strategic = 85;
        let compliance = 92;
        // Reduce scores based on alerts
        operationAlerts.forEach((alert) => {
            const impact = this.getAlertHealthImpact(alert.severity);
            operational -= impact;
            technical -= impact * 0.5;
            compliance -= impact * 0.8;
        });
        const overall = (operational + technical + strategic + compliance) / 4;
        return {
            overall: Math.max(0, overall),
            operational: Math.max(0, operational),
            technical: Math.max(0, technical),
            strategic: Math.max(0, strategic),
            compliance: Math.max(0, compliance),
            status: this.getHealthStatus(overall),
        };
    }
    getAlertHealthImpact(severity) {
        const impacts = {
            [AlertSeverity.LOW]: 2,
            [AlertSeverity.MEDIUM]: 5,
            [AlertSeverity.HIGH]: 10,
            [AlertSeverity.CRITICAL]: 20,
            [AlertSeverity.EMERGENCY]: 30,
        };
        return impacts[severity] || 0;
    }
    getHealthStatus(score) {
        if (score >= 80)
            return HealthStatus.HEALTHY;
        if (score >= 60)
            return HealthStatus.WARNING;
        if (score >= 30)
            return HealthStatus.CRITICAL;
        return HealthStatus.DOWN;
    }
    calculateKPIs(metrics) {
        const kpis = [];
        // Calculate KPIs for each metric type
        const metricTypes = [
            MetricType.ENGAGEMENT,
            MetricType.EFFECTIVENESS,
            MetricType.SENTIMENT,
        ];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            if (typeMetrics.length > 0) {
                const recent = typeMetrics.slice(-1)[0];
                const average = typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
                const trend = this.calculateTrend(typeMetrics.slice(-5).map((m) => m.value));
                kpis.push({
                    name: metricType,
                    value: recent.value,
                    target: this.getKPITarget(metricType),
                    unit: recent.unit,
                    trend: trend > 0.1
                        ? TrendDirection.INCREASING
                        : trend < -0.1
                            ? TrendDirection.DECREASING
                            : TrendDirection.STABLE,
                    status: this.getKPIStatus(recent.value, this.getKPITarget(metricType)),
                    lastMeasured: recent.timestamp,
                });
            }
        });
        return kpis;
    }
    getKPITarget(metricType) {
        const targets = {
            [MetricType.ENGAGEMENT]: 70,
            [MetricType.EFFECTIVENESS]: 80,
            [MetricType.SENTIMENT]: 0.5,
            [MetricType.REACH]: 5000,
            [MetricType.ATTRIBUTION]: 0.3, // Lower is better
            [MetricType.COMPLIANCE]: 95,
            [MetricType.RISK_EXPOSURE]: 0.4, // Lower is better
            [MetricType.PERFORMANCE]: 85,
            [MetricType.QUALITY]: 90,
            [MetricType.VIRALITY]: 1.2,
            [MetricType.COST]: 1000,
            [MetricType.TIMELINE]: 30,
        };
        return targets[metricType] || 50;
    }
    getKPIStatus(value, target) {
        const ratio = value / target;
        if (ratio >= 1.1)
            return KPIStatus.ABOVE_TARGET;
        if (ratio >= 0.9)
            return KPIStatus.ON_TARGET;
        if (ratio >= 0.7)
            return KPIStatus.BELOW_TARGET;
        return KPIStatus.CRITICAL;
    }
    generateRealtimeMetricSummaries(metrics) {
        const summaries = [];
        const metricTypes = [...new Set(metrics.map((m) => m.metricType))];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            const values = typeMetrics.map((m) => m.value);
            const recent = typeMetrics.slice(-10); // Last 10 values
            const sparklineData = recent.map((m) => m.value);
            if (values.length > 0) {
                const current = values[values.length - 1];
                const previous = values.length > 1 ? values[values.length - 2] : current;
                summaries.push({
                    metricType,
                    current,
                    average: values.reduce((sum, v) => sum + v, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    change: current - previous,
                    changePercent: previous !== 0 ? ((current - previous) / previous) * 100 : 0,
                    sparklineData,
                });
            }
        });
        return summaries;
    }
    analyzeTrends(metrics) {
        const trends = [];
        const metricTypes = [...new Set(metrics.map((m) => m.metricType))];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            if (typeMetrics.length >= 5) {
                const values = typeMetrics.slice(-10).map((m) => m.value);
                const trendValue = this.calculateTrend(values);
                const strength = Math.abs(trendValue);
                trends.push({
                    metricType,
                    direction: trendValue > 0.1
                        ? TrendDirection.INCREASING
                        : trendValue < -0.1
                            ? TrendDirection.DECREASING
                            : strength > 0.3
                                ? TrendDirection.VOLATILE
                                : TrendDirection.STABLE,
                    strength: Math.min(1, strength),
                    confidence: Math.min(1, typeMetrics.length / 20), // More data = higher confidence
                    timeframe: '10 samples',
                    description: this.generateTrendDescription(metricType, trendValue),
                });
            }
        });
        return trends;
    }
    calculateTrend(values) {
        if (values.length < 2)
            return 0;
        // Simple linear regression slope
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
        const sumXX = values.reduce((sum, val, i) => sum + i * i, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }
    generateTrendDescription(metricType, trend) {
        const direction = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
        const magnitude = Math.abs(trend) > 0.5
            ? 'strongly'
            : Math.abs(trend) > 0.2
                ? 'moderately'
                : 'slightly';
        return `${metricType} is ${magnitude} ${direction}`;
    }
    generateForecasts(metrics) {
        const forecasts = [];
        if (!this.config.enablePredictiveAnalytics) {
            return forecasts;
        }
        const metricTypes = [...new Set(metrics.map((m) => m.metricType))];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            if (typeMetrics.length >= 10) {
                const values = typeMetrics.slice(-20).map((m) => m.value);
                const trend = this.calculateTrend(values);
                const current = values[values.length - 1];
                const volatility = this.calculateVolatility(values);
                // Simple linear extrapolation
                const predictedValue = current + trend * 5; // 5 periods ahead
                const confidence = Math.max(0.3, 1 - volatility);
                const margin = volatility * predictedValue;
                forecasts.push({
                    metricType,
                    timeframe: '5 periods ahead',
                    predictedValue,
                    confidence,
                    upperBound: predictedValue + margin,
                    lowerBound: predictedValue - margin,
                    methodology: 'Linear extrapolation with volatility adjustment',
                });
            }
        });
        return forecasts;
    }
    calculateVolatility(values) {
        if (values.length < 2)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            values.length;
        const stdDev = Math.sqrt(variance);
        return mean !== 0 ? stdDev / Math.abs(mean) : stdDev;
    }
    calculateRiskIndicators(operationId) {
        const operationMetrics = this.metrics.get(operationId) || [];
        const indicators = [];
        // Attribution risk
        const attributionMetrics = operationMetrics.filter((m) => m.metricType === MetricType.ATTRIBUTION);
        if (attributionMetrics.length > 0) {
            const recent = attributionMetrics.slice(-1)[0];
            const trend = this.calculateTrend(attributionMetrics.slice(-5).map((m) => m.value));
            indicators.push({
                id: 'attribution_risk',
                name: 'Attribution Risk',
                currentLevel: recent.value > 0.7
                    ? RiskLevel.HIGH
                    : recent.value > 0.4
                        ? RiskLevel.MEDIUM
                        : RiskLevel.LOW,
                trend: trend > 0.1
                    ? TrendDirection.INCREASING
                    : trend < -0.1
                        ? TrendDirection.DECREASING
                        : TrendDirection.STABLE,
                description: 'Risk of operation being attributed to source',
                mitigation: 'Implement additional obfuscation measures',
                lastAssessed: recent.timestamp,
            });
        }
        return indicators;
    }
    getFeedbackLoopStatuses(operationId) {
        return Array.from(this.feedbackLoops.values())
            .filter((loop) => loop.operationId === operationId)
            .map((loop) => ({
            feedbackLoopId: loop.id,
            name: `${loop.feedbackType} Loop`,
            active: loop.enabled,
            lastTriggered: loop.lastTriggered,
            adjustmentsMade: loop.adjustmentHistory.length,
            effectiveness: this.calculateFeedbackLoopEffectiveness(loop),
        }));
    }
    calculateFeedbackLoopEffectiveness(loop) {
        if (loop.adjustmentHistory.length === 0)
            return 0;
        // Calculate effectiveness based on adjustment history
        const recentAdjustments = loop.adjustmentHistory.slice(-10);
        const avgImpact = recentAdjustments.reduce((sum, adj) => sum + adj.impact, 0) /
            recentAdjustments.length;
        const avgConfidence = recentAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) /
            recentAdjustments.length;
        return avgImpact * avgConfidence * 100; // 0-100 scale
    }
    calculatePerformanceSummary(metrics) {
        const effectiveness = this.getMetricScore(metrics, MetricType.EFFECTIVENESS);
        const attribution = this.getMetricScore(metrics, MetricType.ATTRIBUTION);
        const compliance = this.getMetricScore(metrics, MetricType.COMPLIANCE);
        const riskExposure = this.getMetricScore(metrics, MetricType.RISK_EXPOSURE);
        const efficiency = (effectiveness + compliance) / 2;
        const overallScore = (effectiveness + efficiency + compliance + (100 - attribution)) / 4;
        return {
            overallScore,
            efficiency,
            effectiveness,
            attribution,
            compliance,
            riskLevel: riskExposure > 70
                ? RiskLevel.HIGH
                : riskExposure > 40
                    ? RiskLevel.MEDIUM
                    : RiskLevel.LOW,
        };
    }
    getMetricScore(metrics, metricType) {
        const typeMetrics = metrics.filter((m) => m.metricType === metricType);
        if (typeMetrics.length === 0)
            return 50; // Default neutral score
        const recent = typeMetrics.slice(-5);
        const average = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
        // Normalize to 0-100 scale based on metric type
        switch (metricType) {
            case MetricType.EFFECTIVENESS:
            case MetricType.COMPLIANCE:
                return Math.min(100, Math.max(0, average));
            case MetricType.ATTRIBUTION:
            case MetricType.RISK_EXPOSURE:
                return Math.min(100, Math.max(0, average * 100));
            default:
                return Math.min(100, Math.max(0, average));
        }
    }
    // Anomaly detection methods
    detectStatisticalOutliers(metrics) {
        const anomalies = [];
        const metricTypes = [...new Set(metrics.map((m) => m.metricType))];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            if (typeMetrics.length >= 20) {
                const values = typeMetrics.map((m) => m.value);
                const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
                    values.length);
                // Check recent values for outliers (> 2 standard deviations)
                const recentMetrics = typeMetrics.slice(-5);
                recentMetrics.forEach((metric) => {
                    const zScore = Math.abs((metric.value - mean) / stdDev);
                    if (zScore > 2) {
                        anomalies.push({
                            timestamp: metric.timestamp,
                            operationId: metric.operationId,
                            anomalyScore: Math.min(1, zScore / 3), // Normalize to 0-1
                            anomalyType: AnomalyType.STATISTICAL_OUTLIER,
                            description: `${metricType} value ${metric.value} is ${zScore.toFixed(1)} standard deviations from mean`,
                            affectedMetrics: [metric.id],
                            confidence: Math.min(1, zScore / 2),
                            severity: zScore > 3 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
                            suggestedActions: [
                                'Investigate data source for errors',
                                'Check for external factors affecting metric',
                                'Consider adjusting monitoring thresholds',
                            ],
                        });
                    }
                });
            }
        });
        return anomalies;
    }
    detectTrendDeviations(metrics) {
        const anomalies = [];
        const metricTypes = [...new Set(metrics.map((m) => m.metricType))];
        metricTypes.forEach((metricType) => {
            const typeMetrics = metrics.filter((m) => m.metricType === metricType);
            if (typeMetrics.length >= 15) {
                const allValues = typeMetrics.map((m) => m.value);
                const historicalTrend = this.calculateTrend(allValues.slice(0, -5)); // Historical trend
                const recentTrend = this.calculateTrend(allValues.slice(-5)); // Recent trend
                const trendDeviation = Math.abs(recentTrend - historicalTrend);
                if (trendDeviation > 0.5) {
                    anomalies.push({
                        timestamp: typeMetrics[typeMetrics.length - 1].timestamp,
                        operationId: typeMetrics[0].operationId,
                        anomalyScore: Math.min(1, trendDeviation),
                        anomalyType: AnomalyType.TREND_DEVIATION,
                        description: `${metricType} recent trend deviates significantly from historical pattern`,
                        affectedMetrics: typeMetrics.slice(-5).map((m) => m.id),
                        confidence: 0.8,
                        severity: trendDeviation > 1 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
                        suggestedActions: [
                            'Analyze recent operational changes',
                            'Review external environmental factors',
                            'Consider trend reversal strategies',
                        ],
                    });
                }
            }
        });
        return anomalies;
    }
    detectPatternAnomalies(metrics) {
        const anomalies = [];
        // Pattern anomaly detection would require more sophisticated algorithms
        // This is a simplified placeholder implementation
        return anomalies;
    }
    getTargetValue(feedbackType) {
        const targets = {
            [FeedbackType.PARAMETER_ADJUSTMENT]: 50,
            [FeedbackType.RESOURCE_REALLOCATION]: 75,
            [FeedbackType.STRATEGY_MODIFICATION]: 60,
            [FeedbackType.TIMING_ADJUSTMENT]: 80,
            [FeedbackType.TARGET_REFINEMENT]: 70,
            [FeedbackType.CONTENT_OPTIMIZATION]: 85,
        };
        return targets[feedbackType] || 60;
    }
    // ID generation methods
    generateMetricId() {
        return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFeedbackLoopId() {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateAlertRecommendationId() {
        return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.RealTimeMonitor = RealTimeMonitor;
