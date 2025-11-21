/**
 * Biometric System Monitoring
 *
 * Comprehensive monitoring, metrics collection, and alerting
 * for biometric processing systems.
 */

// ============================================================================
// Types
// ============================================================================

export interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labelNames: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  duration: number; // seconds
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertRule['severity'];
  message: string;
  value: number;
  firedAt: string;
  resolvedAt?: string;
  labels: Record<string, string>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, {
    status: 'up' | 'down' | 'degraded';
    latency?: number;
    lastCheck: string;
    details?: Record<string, unknown>;
  }>;
  timestamp: string;
}

// ============================================================================
// Metrics Collector
// ============================================================================

export class MetricsCollector {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, number[]>> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();

  constructor() {
    this.registerDefaultMetrics();
  }

  private registerDefaultMetrics(): void {
    // Biometric processing metrics
    this.register({
      name: 'biometric_enrollments_total',
      type: 'counter',
      help: 'Total biometric enrollments',
      labelNames: ['modality', 'status'],
    });

    this.register({
      name: 'biometric_verifications_total',
      type: 'counter',
      help: 'Total biometric verifications',
      labelNames: ['modality', 'result'],
    });

    this.register({
      name: 'biometric_identifications_total',
      type: 'counter',
      help: 'Total 1:N identifications',
      labelNames: ['modality', 'result'],
    });

    this.register({
      name: 'biometric_match_score',
      type: 'histogram',
      help: 'Match score distribution',
      labelNames: ['modality'],
    });

    this.register({
      name: 'biometric_processing_duration_seconds',
      type: 'histogram',
      help: 'Processing duration in seconds',
      labelNames: ['operation', 'modality'],
    });

    this.register({
      name: 'biometric_quality_score',
      type: 'histogram',
      help: 'Quality score distribution',
      labelNames: ['modality'],
    });

    this.register({
      name: 'biometric_liveness_checks_total',
      type: 'counter',
      help: 'Total liveness checks',
      labelNames: ['method', 'result'],
    });

    this.register({
      name: 'biometric_template_count',
      type: 'gauge',
      help: 'Number of enrolled templates',
      labelNames: ['modality'],
    });

    this.register({
      name: 'screening_requests_total',
      type: 'counter',
      help: 'Total screening requests',
      labelNames: ['result'],
    });

    this.register({
      name: 'screening_matches_total',
      type: 'counter',
      help: 'Total screening matches',
      labelNames: ['list', 'severity'],
    });

    this.register({
      name: 'screening_latency_seconds',
      type: 'histogram',
      help: 'Screening latency',
      labelNames: [],
    });
  }

  /**
   * Register a metric definition
   */
  register(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);

    switch (definition.type) {
      case 'counter':
        this.counters.set(definition.name, new Map());
        break;
      case 'gauge':
        this.gauges.set(definition.name, new Map());
        break;
      case 'histogram':
      case 'summary':
        this.histograms.set(definition.name, new Map());
        break;
    }
  }

  /**
   * Increment a counter
   */
  inc(name: string, labels: Record<string, string> = {}, value = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;

    const key = this.labelKey(labels);
    counter.set(key, (counter.get(key) ?? 0) + value);
  }

  /**
   * Set a gauge value
   */
  set(name: string, value: number, labels: Record<string, string> = {}): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;

    gauge.set(this.labelKey(labels), value);
  }

  /**
   * Observe a histogram value
   */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;

    const key = this.labelKey(labels);
    const values = histogram.get(key) ?? [];
    values.push(value);
    histogram.set(key, values);
  }

  /**
   * Time an async operation
   */
  async time<T>(
    name: string,
    labels: Record<string, string>,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.observe(name, (performance.now() - start) / 1000, labels);
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [name, definition] of this.definitions) {
      lines.push(`# HELP ${name} ${definition.help}`);
      lines.push(`# TYPE ${name} ${definition.type}`);

      if (definition.type === 'counter') {
        const counter = this.counters.get(name);
        if (counter) {
          for (const [labels, value] of counter) {
            lines.push(`${name}${labels} ${value}`);
          }
        }
      } else if (definition.type === 'gauge') {
        const gauge = this.gauges.get(name);
        if (gauge) {
          for (const [labels, value] of gauge) {
            lines.push(`${name}${labels} ${value}`);
          }
        }
      } else if (definition.type === 'histogram') {
        const histogram = this.histograms.get(name);
        if (histogram) {
          for (const [labels, values] of histogram) {
            const buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10];
            for (const bucket of buckets) {
              const count = values.filter(v => v <= bucket).length;
              lines.push(`${name}_bucket${this.addLabel(labels, 'le', bucket.toString())} ${count}`);
            }
            lines.push(`${name}_bucket${this.addLabel(labels, 'le', '+Inf')} ${values.length}`);
            lines.push(`${name}_sum${labels} ${values.reduce((a, b) => a + b, 0)}`);
            lines.push(`${name}_count${labels} ${values.length}`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  getJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [name, definition] of this.definitions) {
      if (definition.type === 'counter') {
        result[name] = Object.fromEntries(this.counters.get(name) ?? []);
      } else if (definition.type === 'gauge') {
        result[name] = Object.fromEntries(this.gauges.get(name) ?? []);
      } else if (definition.type === 'histogram') {
        const histogram = this.histograms.get(name);
        if (histogram) {
          const stats: Record<string, unknown> = {};
          for (const [labels, values] of histogram) {
            if (values.length > 0) {
              stats[labels || '{}'] = {
                count: values.length,
                sum: values.reduce((a, b) => a + b, 0),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                p50: this.percentile(values, 50),
                p95: this.percentile(values, 95),
                p99: this.percentile(values, 99),
              };
            }
          }
          result[name] = stats;
        }
      }
    }

    return result;
  }

  private labelKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return `{${pairs.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  private addLabel(existing: string, key: string, value: string): string {
    if (!existing || existing === '{}') return `{${key}="${value}"}`;
    return existing.slice(0, -1) + `,${key}="${value}"}`;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private handlers: Array<(alert: Alert) => void> = [];

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.handlers.push(handler);
  }

  /**
   * Evaluate metrics against rules
   */
  evaluate(metrics: MetricsCollector): Alert[] {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const value = this.getMetricValue(metrics, rule.condition);
      const triggered = this.checkCondition(value, rule.threshold, rule.operator);

      const alertKey = `${rule.id}`;

      if (triggered) {
        if (!this.activeAlerts.has(alertKey)) {
          const alert: Alert = {
            id: crypto.randomUUID(),
            ruleId: rule.id,
            severity: rule.severity,
            message: `${rule.name}: ${value} ${rule.operator} ${rule.threshold}`,
            value,
            firedAt: new Date().toISOString(),
            labels: {},
          };
          this.activeAlerts.set(alertKey, alert);
          newAlerts.push(alert);
          this.handlers.forEach(h => h(alert));
        }
      } else {
        const existing = this.activeAlerts.get(alertKey);
        if (existing) {
          existing.resolvedAt = new Date().toISOString();
          this.activeAlerts.delete(alertKey);
        }
      }
    }

    return newAlerts;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  private getMetricValue(metrics: MetricsCollector, condition: string): number {
    const json = metrics.getJSON();
    const value = json[condition];
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      const entries = Object.values(value as Record<string, number>);
      return entries.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    }
    return 0;
  }

  private checkCondition(value: number, threshold: number, operator: AlertRule['operator']): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
    }
  }
}

// ============================================================================
// Health Checker
// ============================================================================

export class HealthChecker {
  private checks: Map<string, () => Promise<{ healthy: boolean; latency: number; details?: Record<string, unknown> }>> = new Map();

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<{ healthy: boolean; latency: number; details?: Record<string, unknown> }>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async check(): Promise<HealthStatus> {
    const components: HealthStatus['components'] = {};
    let overallHealthy = true;
    let hasDegraded = false;

    for (const [name, checkFn] of this.checks) {
      try {
        const start = performance.now();
        const result = await checkFn();
        const latency = performance.now() - start;

        components[name] = {
          status: result.healthy ? 'up' : 'down',
          latency: result.latency ?? latency,
          lastCheck: new Date().toISOString(),
          details: result.details,
        };

        if (!result.healthy) overallHealthy = false;
        if (result.latency > 1000) hasDegraded = true;
      } catch (error) {
        components[name] = {
          status: 'down',
          lastCheck: new Date().toISOString(),
          details: { error: (error as Error).message },
        };
        overallHealthy = false;
      }
    }

    return {
      status: overallHealthy ? (hasDegraded ? 'degraded' : 'healthy') : 'unhealthy',
      components,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Audit Logger
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    id: string;
    type: 'user' | 'system' | 'service';
    name?: string;
  };
  resource: {
    type: string;
    id: string;
  };
  outcome: 'success' | 'failure';
  details?: Record<string, unknown>;
  clientInfo?: {
    ip?: string;
    userAgent?: string;
  };
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.push(fullEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return fullEvent;
  }

  /**
   * Query audit events
   */
  query(filter: {
    startTime?: string;
    endTime?: string;
    action?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    outcome?: 'success' | 'failure';
    limit?: number;
  }): AuditEvent[] {
    let results = this.events;

    if (filter.startTime) {
      results = results.filter(e => e.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      results = results.filter(e => e.timestamp <= filter.endTime!);
    }
    if (filter.action) {
      results = results.filter(e => e.action === filter.action);
    }
    if (filter.actorId) {
      results = results.filter(e => e.actor.id === filter.actorId);
    }
    if (filter.resourceType) {
      results = results.filter(e => e.resource.type === filter.resourceType);
    }
    if (filter.resourceId) {
      results = results.filter(e => e.resource.id === filter.resourceId);
    }
    if (filter.outcome) {
      results = results.filter(e => e.outcome === filter.outcome);
    }

    return results.slice(-(filter.limit ?? 100)).reverse();
  }
}

// ============================================================================
// Exports
// ============================================================================

export const createMetricsCollector = () => new MetricsCollector();
export const createAlertManager = () => new AlertManager();
export const createHealthChecker = () => new HealthChecker();
export const createAuditLogger = () => new AuditLogger();
