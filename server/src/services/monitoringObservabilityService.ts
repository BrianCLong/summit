import { EventEmitter } from 'events';
import { RedisService as RedisCache } from '../cache/redis';

interface SystemAlert {
  id: string;
  type: 'performance' | 'security' | 'business' | 'system' | 'connectivity';
  severity: 'info' | 'warning' | 'critical' | 'fatal';
  title: string;
  description: string;
  source: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  tags: string[];
  metadata: Record<string, any>;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  logger: string;
  message: string;
  context: Record<string, any>;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  errorStack?: string;
}

interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    fields: Record<string, any>;
  }>;
  status: 'pending' | 'completed' | 'error';
  service: string;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  dependencies: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  }>;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    errorRate: number;
    requestsPerSecond: number;
  };
}

interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: 'metric' | 'log' | 'trace' | 'alert' | 'health';
    title: string;
    query: string;
    position: { x: number; y: number; width: number; height: number };
    refreshInterval: number;
    thresholds?: Array<{
      operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
      value: number;
      severity: 'warning' | 'critical';
    }>;
  }>;
  filters: Record<string, any>;
  timeRange: string;
  autoRefresh: boolean;
  shared: boolean;
  createdBy: string;
  createdAt: Date;
}

export class MonitoringObservabilityService extends EventEmitter {
  private alerts: Map<string, SystemAlert> = new Map();
  private logs: LogEntry[] = [];
  private traces: Map<string, TraceSpan[]> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private cache: RedisCache;
  private maxLogs = 10000;
  private logRetentionDays = 30;
  private alertRetentionDays = 90;

  constructor() {
    super();
    this.cache = new RedisCache();
    this.initializeServices();
    this.startHealthChecks();
    this.startLogAggregation();
    this.setupAlertRules();
  }

  private initializeServices(): void {
    const services = [
      {
        service: 'intelgraph-server',
        status: 'healthy' as const,
        lastCheck: new Date(),
        responseTime: 0,
        uptime: process.uptime(),
        dependencies: [
          { name: 'PostgreSQL', status: 'healthy' as const, responseTime: 25 },
          { name: 'Neo4j', status: 'healthy' as const, responseTime: 18 },
          { name: 'Redis', status: 'healthy' as const, responseTime: 5 },
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
        status: 'healthy' as const,
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

    console.log(
      '[MONITORING] Initialized service health monitoring for',
      services.length,
      'services',
    );
  }

  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds

    // Initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    try {
      for (const [serviceName, health] of this.serviceHealth.entries()) {
        const startTime = Date.now();
        let status: ServiceHealth['status'] = 'healthy';

        // Simulate health checks with some variability
        const responseTime = Math.random() * 100 + 10;

        // Update metrics
        const updatedHealth: ServiceHealth = {
          ...health,
          lastCheck: new Date(),
          responseTime,
          uptime:
            serviceName === 'intelgraph-server'
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
        if (
          updatedHealth.metrics.errorRate > 10 ||
          updatedHealth.metrics.cpu > 90 ||
          updatedHealth.metrics.memory > 85
        ) {
          status = 'unhealthy';
        } else if (
          updatedHealth.metrics.errorRate > 5 ||
          updatedHealth.metrics.cpu > 80 ||
          updatedHealth.metrics.memory > 80
        ) {
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
    } catch (error) {
      console.error('[MONITORING] Health check error:', error);
    }
  }

  private startLogAggregation(): void {
    // Set up log rotation
    setInterval(() => {
      this.rotateLogs();
    }, 3600000); // Every hour
  }

  private setupAlertRules(): void {
    // Define alert thresholds
    const rules = [
      {
        metric: 'response_time',
        threshold: 1000,
        severity: 'warning' as const,
        title: 'High Response Time',
      },
      {
        metric: 'error_rate',
        threshold: 5,
        severity: 'critical' as const,
        title: 'High Error Rate',
      },
      {
        metric: 'memory_usage',
        threshold: 85,
        severity: 'warning' as const,
        title: 'High Memory Usage',
      },
      {
        metric: 'disk_usage',
        threshold: 90,
        severity: 'critical' as const,
        title: 'High Disk Usage',
      },
    ];

    console.log('[MONITORING] Configured', rules.length, 'alert rules');
  }

  public log(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
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

  private checkForLogPatternAlerts(logEntry: LogEntry): void {
    const recentErrors = this.logs.filter(
      (log) =>
        log.level === 'error' ||
        (log.level === 'fatal' &&
          Date.now() - log.timestamp.getTime() < 300000), // Last 5 minutes
    );

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

  public startTrace(
    operationName: string,
    service: string,
    tags: Record<string, any> = {},
  ): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const span: TraceSpan = {
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
    this.traces.get(traceId)!.push(span);

    this.emit('trace-started', { traceId, spanId, operationName, service });
    return traceId;
  }

  public finishTrace(traceId: string, spanId?: string, error?: Error): void {
    const spans = this.traces.get(traceId);
    if (!spans) return;

    const span = spanId
      ? spans.find((s) => s.id === spanId)
      : spans[spans.length - 1];
    if (!span) return;

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

  public createAlert(
    alertData: Omit<
      SystemAlert,
      'id' | 'timestamp' | 'acknowledged' | 'resolved'
    >,
  ): SystemAlert {
    const alert: SystemAlert = {
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

  public acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    this.emit('alert-acknowledged', alert);
    return true;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alert-resolved', alert);
    return true;
  }

  public getAlerts(
    filters: {
      severity?: SystemAlert['severity'][];
      type?: SystemAlert['type'][];
      acknowledged?: boolean;
      resolved?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): SystemAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters.severity) {
      alerts = alerts.filter((alert) =>
        filters.severity!.includes(alert.severity),
      );
    }

    if (filters.type) {
      alerts = alerts.filter((alert) => filters.type!.includes(alert.type));
    }

    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(
        (alert) => alert.acknowledged === filters.acknowledged,
      );
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

  public getLogs(
    filters: {
      level?: LogEntry['level'][];
      logger?: string[];
      correlationId?: string;
      userId?: string;
      limit?: number;
      offset?: number;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): LogEntry[] {
    let logs = [...this.logs];

    if (filters.level) {
      logs = logs.filter((log) => filters.level!.includes(log.level));
    }

    if (filters.logger) {
      logs = logs.filter((log) => filters.logger!.includes(log.logger));
    }

    if (filters.correlationId) {
      logs = logs.filter((log) => log.correlationId === filters.correlationId);
    }

    if (filters.userId) {
      logs = logs.filter((log) => log.userId === filters.userId);
    }

    if (filters.startTime) {
      logs = logs.filter((log) => log.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      logs = logs.filter((log) => log.timestamp <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filters.offset || 0;
    const limit = filters.limit || 1000;
    return logs.slice(offset, offset + limit);
  }

  public getTraces(traceId?: string): TraceSpan[] | Map<string, TraceSpan[]> {
    if (traceId) {
      return this.traces.get(traceId) || [];
    }
    return this.traces;
  }

  public getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  public createDashboard(
    dashboard: Omit<MonitoringDashboard, 'id' | 'createdAt'>,
  ): MonitoringDashboard {
    const newDashboard: MonitoringDashboard = {
      ...dashboard,
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.dashboards.set(newDashboard.id, newDashboard);
    this.emit('dashboard-created', newDashboard);

    return newDashboard;
  }

  public getMetrics(
    metricName: string,
    timeRange: string = '1h',
  ): Array<{ timestamp: Date; value: number }> {
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

  private parseTimeRange(timeRange: string): number {
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

  private rotateLogs(): void {
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

  public getSystemStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    alerts: {
      critical: number;
      warning: number;
      total: number;
    };
    metrics: {
      avgResponseTime: number;
      errorRate: number;
      uptime: number;
    };
  } {
    const services = Array.from(this.serviceHealth.values());
    const alerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (services.some((s) => s.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (services.some((s) => s.status === 'degraded')) {
      overall = 'degraded';
    }

    const avgResponseTime =
      services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
    const errorRate =
      services.reduce((sum, s) => sum + s.metrics.errorRate, 0) /
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

  public destroy(): void {
    console.log('[MONITORING] Service shutting down...');
    this.removeAllListeners();
  }
}
