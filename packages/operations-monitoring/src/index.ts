/**
 * Operations Monitoring
 *
 * Comprehensive monitoring, observability, and health checking for
 * intelligence operations platform with logging, tracing, and alerting.
 */

import { z } from 'zod';

// ============================================================================
// Monitoring Types
// ============================================================================

export const HealthStatusSchema = z.enum([
  'HEALTHY',
  'DEGRADED',
  'UNHEALTHY',
  'UNKNOWN'
]);

export const ComponentTypeSchema = z.enum([
  'SERVICE',
  'DATABASE',
  'CACHE',
  'QUEUE',
  'EXTERNAL_API',
  'STORAGE'
]);

// ============================================================================
// Health Checks
// ============================================================================

export const HealthCheckSchema = z.object({
  component: z.string(),
  type: ComponentTypeSchema,
  status: HealthStatusSchema,
  message: z.string(),
  timestamp: z.string(),
  responseTime: z.number(), // ms
  details: z.record(z.unknown()).optional()
});

export const SystemHealthSchema = z.object({
  overall: HealthStatusSchema,
  components: z.array(HealthCheckSchema),
  timestamp: z.string(),
  uptime: z.number(), // seconds
  version: z.string()
});

// ============================================================================
// Metrics
// ============================================================================

export const MetricSchema = z.object({
  name: z.string(),
  type: z.enum(['COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY']),
  value: z.number(),
  labels: z.record(z.string()),
  timestamp: z.string(),
  unit: z.string().optional()
});

// ============================================================================
// Logging
// ============================================================================

export const LogLevelSchema = z.enum([
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'FATAL'
]);

export const LogEntrySchema = z.object({
  level: LogLevelSchema,
  timestamp: z.string(),
  message: z.string(),
  component: z.string(),
  operationId: z.string().optional(),
  userId: z.string().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional()
  }).optional()
});

// ============================================================================
// Tracing
// ============================================================================

export const SpanSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  kind: z.enum(['SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER', 'INTERNAL']),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional(), // microseconds
  status: z.enum(['OK', 'ERROR', 'UNSET']),
  attributes: z.record(z.unknown()),
  events: z.array(z.object({
    timestamp: z.string(),
    name: z.string(),
    attributes: z.record(z.unknown())
  }))
});

export const TraceSchema = z.object({
  traceId: z.string(),
  rootSpan: SpanSchema,
  spans: z.array(SpanSchema),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number(), // microseconds
  serviceName: z.string()
});

// ============================================================================
// Alerts
// ============================================================================

export const AlertSeveritySchema = z.enum([
  'INFO',
  'WARNING',
  'CRITICAL'
]);

export const AlertSchema = z.object({
  id: z.string(),
  severity: AlertSeveritySchema,
  title: z.string(),
  description: z.string(),
  component: z.string(),
  metric: z.string().optional(),
  threshold: z.number().optional(),
  currentValue: z.number().optional(),
  timestamp: z.string(),
  acknowledged: z.boolean(),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.string().optional(),
  resolved: z.boolean(),
  resolvedAt: z.string().optional()
});

// ============================================================================
// Performance Monitoring
// ============================================================================

export const PerformanceDataSchema = z.object({
  component: z.string(),
  operation: z.string(),
  timestamp: z.string(),

  // Latency metrics
  latency: z.object({
    min: z.number(),
    max: z.number(),
    avg: z.number(),
    p50: z.number(),
    p95: z.number(),
    p99: z.number()
  }),

  // Throughput
  throughput: z.object({
    requestsPerSecond: z.number(),
    successRate: z.number(), // percentage
    errorRate: z.number() // percentage
  }),

  // Resource usage
  resources: z.object({
    cpu: z.number(), // percentage
    memory: z.number(), // MB
    diskIO: z.number(), // MB/s
    networkIO: z.number() // MB/s
  }).optional()
});

// ============================================================================
// Type Exports
// ============================================================================

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type Span = z.infer<typeof SpanSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type PerformanceData = z.infer<typeof PerformanceDataSchema>;

// ============================================================================
// Operations Monitor
// ============================================================================

export class OperationsMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private metrics: Map<string, Metric[]> = new Map();
  private logs: LogEntry[] = [];
  private traces: Map<string, Trace> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private startTime: number = Date.now();

  /**
   * Check system health
   */
  async checkHealth(): Promise<SystemHealth> {
    const components: HealthCheck[] = [];

    // Check operations service
    components.push(await this.checkComponent('operations-service', 'SERVICE'));

    // Check collection service
    components.push(await this.checkComponent('collection-service', 'SERVICE'));

    // Check ops center
    components.push(await this.checkComponent('ops-center', 'SERVICE'));

    // Check fusion service
    components.push(await this.checkComponent('fusion-service', 'SERVICE'));

    // Check targeting service
    components.push(await this.checkComponent('targeting-service', 'SERVICE'));

    // Check decision support
    components.push(await this.checkComponent('decision-support', 'SERVICE'));

    // Determine overall health
    const overall = this.determineOverallHealth(components);

    const health: SystemHealth = {
      overall,
      components,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: '1.0.0'
    };

    return SystemHealthSchema.parse(health);
  }

  /**
   * Check individual component
   */
  private async checkComponent(
    component: string,
    type: ComponentType
  ): Promise<HealthCheck> {
    const startTime = Date.now();

    // Simulate health check
    const status: HealthStatus = 'HEALTHY';
    const responseTime = Date.now() - startTime;

    const check: HealthCheck = {
      component,
      type,
      status,
      message: `${component} is ${status.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        version: '1.0.0',
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      }
    };

    this.healthChecks.set(component, check);
    return HealthCheckSchema.parse(check);
  }

  /**
   * Determine overall health from components
   */
  private determineOverallHealth(components: HealthCheck[]): HealthStatus {
    const unhealthy = components.filter(c => c.status === 'UNHEALTHY');
    const degraded = components.filter(c => c.status === 'DEGRADED');

    if (unhealthy.length > 0) return 'UNHEALTHY';
    if (degraded.length > 0) return 'DEGRADED';
    return 'HEALTHY';
  }

  /**
   * Record metric
   */
  recordMetric(metric: Metric): void {
    const validated = MetricSchema.parse(metric);

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    this.metrics.get(metric.name)!.push(validated);

    // Keep only last 1000 metrics per name
    const metrics = this.metrics.get(metric.name)!;
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Log entry
   */
  log(entry: LogEntry): void {
    const validated = LogEntrySchema.parse(entry);
    this.logs.push(validated);

    // Keep only last 10000 logs
    if (this.logs.length > 10000) {
      this.logs.shift();
    }

    // Check for errors and create alerts
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.createAlert({
        severity: entry.level === 'FATAL' ? 'CRITICAL' : 'WARNING',
        title: `${entry.level}: ${entry.component}`,
        description: entry.message,
        component: entry.component,
        timestamp: entry.timestamp
      });
    }
  }

  /**
   * Start trace span
   */
  startSpan(
    name: string,
    traceId: string,
    parentSpanId?: string
  ): string {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind: 'INTERNAL',
      startTime: new Date().toISOString(),
      status: 'UNSET',
      attributes: {},
      events: []
    };

    // Store span (simplified - would normally use trace context)
    return spanId;
  }

  /**
   * End trace span
   */
  endSpan(spanId: string, status: 'OK' | 'ERROR' = 'OK'): void {
    // Update span end time and status (simplified)
  }

  /**
   * Create alert
   */
  createAlert(
    input: Omit<Alert, 'id' | 'acknowledged' | 'resolved'>
  ): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}`,
      ...input,
      acknowledged: false,
      resolved: false
    };

    const validated = AlertSchema.parse(alert);
    this.alerts.set(validated.id, validated);

    return validated;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolved)
      .sort((a, b) => {
        // Sort by severity
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Get metrics
   */
  getMetrics(name: string, limit: number = 100): Metric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.slice(-limit);
  }

  /**
   * Get logs
   */
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logs];

    if (filter?.level) {
      logs = logs.filter(l => l.level === filter.level);
    }

    if (filter?.component) {
      logs = logs.filter(l => l.component === filter.component);
    }

    const limit = filter?.limit || 100;
    return logs.slice(-limit);
  }

  /**
   * Get performance data
   */
  getPerformanceData(component: string, operation: string): PerformanceData | null {
    // Simplified - would aggregate from actual metrics
    return {
      component,
      operation,
      timestamp: new Date().toISOString(),
      latency: {
        min: 10,
        max: 500,
        avg: 150,
        p50: 120,
        p95: 350,
        p99: 480
      },
      throughput: {
        requestsPerSecond: 100,
        successRate: 99.5,
        errorRate: 0.5
      },
      resources: {
        cpu: 45,
        memory: 512,
        diskIO: 10,
        networkIO: 25
      }
    };
  }
}

/**
 * Global monitor instance
 */
export const monitor = new OperationsMonitor();

/**
 * Convenience logging functions
 */
export const logger = {
  debug: (component: string, message: string, metadata?: any) => {
    monitor.log({
      level: 'DEBUG',
      timestamp: new Date().toISOString(),
      message,
      component,
      metadata
    });
  },

  info: (component: string, message: string, metadata?: any) => {
    monitor.log({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      component,
      metadata
    });
  },

  warn: (component: string, message: string, metadata?: any) => {
    monitor.log({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      component,
      metadata
    });
  },

  error: (component: string, message: string, error?: Error, metadata?: any) => {
    monitor.log({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      component,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      metadata
    });
  },

  fatal: (component: string, message: string, error?: Error, metadata?: any) => {
    monitor.log({
      level: 'FATAL',
      timestamp: new Date().toISOString(),
      message,
      component,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      metadata
    });
  }
};
