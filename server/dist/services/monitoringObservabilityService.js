import { EventEmitter } from 'events';
import { RedisCache } from '../cache/redis';
export class MonitoringObservabilityService extends EventEmitter {
    alerts = new Map();
    logs = [];
    traces = new Map();
    serviceHealth = new Map();
    dashboards = new Map();
    cache;
    maxLogs = 10000;
    logRetentionDays = 30;
    alertRetentionDays = 90;
    constructor() {
        super();
        this.cache = new RedisCache();
        this.initializeServices();
        this.startHealthChecks();
        this.startLogAggregation();
        this.setupAlertRules();
    }
    initializeServices() {
        const services = [
            {
                service: 'intelgraph-server',
                status: 'healthy',
                lastCheck: new Date(),
                responseTime: 0,
                uptime: process.uptime(),
                dependencies: [
                    { name: 'PostgreSQL', status: 'healthy', responseTime: 25 },
                    { name: 'Neo4j', status: 'healthy', responseTime: 18 },
                    { name: 'Redis', status: 'healthy', responseTime: 5 },
                ],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    disk: 0,
                    network: 0,
                    errorRate: 0,
                    requestsPerSecond: 0,
                },
            },
            {
                service: 'intelgraph-client',
                status: 'healthy',
                lastCheck: new Date(),
                responseTime: 0,
                uptime: 0,
                dependencies: [],
                metrics: {
                    cpu: 0,
                    memory: 0,
                    disk: 0,
                    network: 0,
                    errorRate: 0,
                    requestsPerSecond: 0,
                },
            },
        ];
        services.forEach((service) => {
            this.serviceHealth.set(service.service, service);
        });
        console.log('[MONITORING] Initialized service health monitoring for', services.length, 'services');
    }
    startHealthChecks() {
        setInterval(() => {
            this.performHealthChecks();
        }, 30000); // Every 30 seconds
        // Initial health check
        this.performHealthChecks();
    }
    async performHealthChecks() {
        try {
            for (const [serviceName, health] of this.serviceHealth.entries()) {
                const startTime = Date.now();
                let status = 'healthy';
                // Simulate health checks with some variability
                const responseTime = Math.random() * 100 + 10;
                // Update metrics
                const updatedHealth = {
                    ...health,
                    lastCheck: new Date(),
                    responseTime,
                    uptime: serviceName === 'intelgraph-server'
                        ? process.uptime()
                        : Math.random() * 86400,
                    metrics: {
                        cpu: Math.random() * 80 + 10,
                        memory: Math.random() * 70 + 20,
                        disk: Math.random() * 60 + 15,
                        network: Math.random() * 50 + 5,
                        errorRate: Math.random() * 5,
                        requestsPerSecond: Math.random() * 100 + 20,
                    },
                };
                // Determine status based on metrics
                if (updatedHealth.metrics.errorRate > 10 ||
                    updatedHealth.metrics.cpu > 90 ||
                    updatedHealth.metrics.memory > 85) {
                    status = 'unhealthy';
                }
                else if (updatedHealth.metrics.errorRate > 5 ||
                    updatedHealth.metrics.cpu > 80 ||
                    updatedHealth.metrics.memory > 80) {
                    status = 'degraded';
                }
                updatedHealth.status = status;
                this.serviceHealth.set(serviceName, updatedHealth);
                // Check for alerts
                if (status !== 'healthy' && health.status === 'healthy') {
                    this.createAlert({
                        type: 'system',
                        severity: status === 'unhealthy' ? 'critical' : 'warning',
                        title: `Service Health Degraded: ${serviceName}`,
                        description: `Service ${serviceName} status changed from healthy to ${status}`,
                        source: serviceName,
                        metric: 'service_health',
                        threshold: 0,
                        currentValue: status === 'degraded' ? 1 : 2,
                        tags: ['health', 'service'],
                        metadata: { previousStatus: health.status, newStatus: status },
                    });
                }
                this.emit('health-check-completed', {
                    service: serviceName,
                    health: updatedHealth,
                });
            }
        }
        catch (error) {
            console.error('[MONITORING] Health check error:', error);
        }
    }
    startLogAggregation() {
        // Set up log rotation
        setInterval(() => {
            this.rotateLogs();
        }, 3600000); // Every hour
    }
    setupAlertRules() {
        // Define alert thresholds
        const rules = [
            {
                metric: 'response_time',
                threshold: 1000,
                severity: 'warning',
                title: 'High Response Time',
            },
            {
                metric: 'error_rate',
                threshold: 5,
                severity: 'critical',
                title: 'High Error Rate',
            },
            {
                metric: 'memory_usage',
                threshold: 85,
                severity: 'warning',
                title: 'High Memory Usage',
            },
            {
                metric: 'disk_usage',
                threshold: 90,
                severity: 'critical',
                title: 'High Disk Usage',
            },
        ];
        console.log('[MONITORING] Configured', rules.length, 'alert rules');
    }
    log(entry) {
        const logEntry = {
            ...entry,
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };
        this.logs.push(logEntry);
        // Maintain log size limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Check for error patterns that should trigger alerts
        if (logEntry.level === 'error' || logEntry.level === 'fatal') {
            this.checkForLogPatternAlerts(logEntry);
        }
        this.emit('log-entry', logEntry);
    }
    checkForLogPatternAlerts(logEntry) {
        const recentErrors = this.logs.filter((log) => log.level === 'error' ||
            (log.level === 'fatal' &&
                Date.now() - log.timestamp.getTime() < 300000));
        if (recentErrors.length > 10) {
            this.createAlert({
                type: 'system',
                severity: 'critical',
                title: 'High Error Rate Detected',
                description: `Detected ${recentErrors.length} errors in the last 5 minutes`,
                source: 'log-aggregator',
                metric: 'error_count',
                threshold: 10,
                currentValue: recentErrors.length,
                tags: ['errors', 'pattern'],
                metadata: { recentErrorCount: recentErrors.length },
            });
        }
    }
    startTrace(operationName, service, tags = {}) {
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const span = {
            id: spanId,
            traceId,
            operationName,
            startTime: new Date(),
            tags,
            logs: [],
            status: 'pending',
            service,
        };
        if (!this.traces.has(traceId)) {
            this.traces.set(traceId, []);
        }
        this.traces.get(traceId).push(span);
        this.emit('trace-started', { traceId, spanId, operationName, service });
        return traceId;
    }
    finishTrace(traceId, spanId, error) {
        const spans = this.traces.get(traceId);
        if (!spans)
            return;
        const span = spanId
            ? spans.find((s) => s.id === spanId)
            : spans[spans.length - 1];
        if (!span)
            return;
        span.endTime = new Date();
        span.duration = span.endTime.getTime() - span.startTime.getTime();
        span.status = error ? 'error' : 'completed';
        if (error) {
            span.logs.push({
                timestamp: new Date(),
                fields: {
                    level: 'error',
                    message: error.message,
                    stack: error.stack,
                },
            });
        }
        // Check for slow traces
        if (span.duration && span.duration > 5000) {
            // 5 seconds
            this.createAlert({
                type: 'performance',
                severity: 'warning',
                title: 'Slow Operation Detected',
                description: `Operation "${span.operationName}" took ${span.duration}ms to complete`,
                source: span.service,
                metric: 'operation_duration',
                threshold: 5000,
                currentValue: span.duration,
                tags: ['performance', 'trace'],
                metadata: {
                    traceId,
                    spanId: span.id,
                    operationName: span.operationName,
                },
            });
        }
        this.emit('trace-finished', { traceId, span });
    }
    createAlert(alertData) {
        const alert = {
            ...alertData,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false,
            resolved: false,
        };
        this.alerts.set(alert.id, alert);
        // Auto-acknowledge info alerts
        if (alert.severity === 'info') {
            setTimeout(() => {
                this.acknowledgeAlert(alert.id, 'system');
            }, 60000);
        }
        this.emit('alert-created', alert);
        console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`);
        return alert;
    }
    acknowledgeAlert(alertId, userId) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.acknowledged)
            return false;
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
        this.emit('alert-acknowledged', alert);
        return true;
    }
    resolveAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.resolved)
            return false;
        alert.resolved = true;
        alert.resolvedAt = new Date();
        this.emit('alert-resolved', alert);
        return true;
    }
    getAlerts(filters = {}) {
        let alerts = Array.from(this.alerts.values());
        if (filters.severity) {
            alerts = alerts.filter((alert) => filters.severity.includes(alert.severity));
        }
        if (filters.type) {
            alerts = alerts.filter((alert) => filters.type.includes(alert.type));
        }
        if (filters.acknowledged !== undefined) {
            alerts = alerts.filter((alert) => alert.acknowledged === filters.acknowledged);
        }
        if (filters.resolved !== undefined) {
            alerts = alerts.filter((alert) => alert.resolved === filters.resolved);
        }
        // Sort by timestamp (newest first)
        alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const offset = filters.offset || 0;
        const limit = filters.limit || 100;
        return alerts.slice(offset, offset + limit);
    }
    getLogs(filters = {}) {
        let logs = [...this.logs];
        if (filters.level) {
            logs = logs.filter((log) => filters.level.includes(log.level));
        }
        if (filters.logger) {
            logs = logs.filter((log) => filters.logger.includes(log.logger));
        }
        if (filters.correlationId) {
            logs = logs.filter((log) => log.correlationId === filters.correlationId);
        }
        if (filters.userId) {
            logs = logs.filter((log) => log.userId === filters.userId);
        }
        if (filters.startTime) {
            logs = logs.filter((log) => log.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            logs = logs.filter((log) => log.timestamp <= filters.endTime);
        }
        // Sort by timestamp (newest first)
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const offset = filters.offset || 0;
        const limit = filters.limit || 1000;
        return logs.slice(offset, offset + limit);
    }
    getTraces(traceId) {
        if (traceId) {
            return this.traces.get(traceId) || [];
        }
        return this.traces;
    }
    getServiceHealth() {
        return Array.from(this.serviceHealth.values());
    }
    createDashboard(dashboard) {
        const newDashboard = {
            ...dashboard,
            id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
        };
        this.dashboards.set(newDashboard.id, newDashboard);
        this.emit('dashboard-created', newDashboard);
        return newDashboard;
    }
    getMetrics(metricName, timeRange = '1h') {
        const now = Date.now();
        const rangeMs = this.parseTimeRange(timeRange);
        const interval = rangeMs / 100; // 100 data points
        const data = [];
        for (let i = 0; i < 100; i++) {
            const timestamp = new Date(now - rangeMs + i * interval);
            let value;
            switch (metricName) {
                case 'response_time':
                    value = Math.random() * 500 + 100;
                    break;
                case 'error_rate':
                    value = Math.random() * 10;
                    break;
                case 'throughput':
                    value = Math.random() * 1000 + 500;
                    break;
                case 'memory_usage':
                    value = Math.random() * 40 + 40;
                    break;
                case 'cpu_usage':
                    value = Math.random() * 60 + 20;
                    break;
                default:
                    value = Math.random() * 100;
            }
            data.push({ timestamp, value });
        }
        return data;
    }
    parseTimeRange(timeRange) {
        const unit = timeRange.slice(-1);
        const value = parseInt(timeRange.slice(0, -1));
        switch (unit) {
            case 'h':
                return value * 3600000;
            case 'd':
                return value * 86400000;
            case 'm':
                return value * 60000;
            case 's':
                return value * 1000;
            default:
                return 3600000; // Default to 1 hour
        }
    }
    rotateLogs() {
        const cutoffTime = Date.now() - this.logRetentionDays * 86400000;
        this.logs = this.logs.filter((log) => log.timestamp.getTime() > cutoffTime);
        const cutoffAlertTime = Date.now() - this.alertRetentionDays * 86400000;
        for (const [id, alert] of this.alerts.entries()) {
            if (alert.timestamp.getTime() < cutoffAlertTime && alert.resolved) {
                this.alerts.delete(id);
            }
        }
        this.emit('logs-rotated', {
            remainingLogs: this.logs.length,
            remainingAlerts: this.alerts.size,
        });
    }
    getSystemStatus() {
        const services = Array.from(this.serviceHealth.values());
        const alerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);
        let overall = 'healthy';
        if (services.some((s) => s.status === 'unhealthy')) {
            overall = 'unhealthy';
        }
        else if (services.some((s) => s.status === 'degraded')) {
            overall = 'degraded';
        }
        const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
        const errorRate = services.reduce((sum, s) => sum + s.metrics.errorRate, 0) /
            services.length;
        const uptime = Math.max(...services.map((s) => s.uptime));
        return {
            overall,
            services,
            alerts: {
                critical: alerts.filter((a) => a.severity === 'critical').length,
                warning: alerts.filter((a) => a.severity === 'warning').length,
                total: alerts.length,
            },
            metrics: {
                avgResponseTime,
                errorRate,
                uptime,
            },
        };
    }
    destroy() {
        console.log('[MONITORING] Service shutting down...');
        this.removeAllListeners();
    }
}
//# sourceMappingURL=monitoringObservabilityService.js.map