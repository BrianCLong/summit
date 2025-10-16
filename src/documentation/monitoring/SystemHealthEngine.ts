/**
 * Advanced Monitoring, Alerting & System Health Management Engine
 * Enterprise-Grade Observability and Health Management
 * Phase 49: Advanced System Health & Monitoring
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface MonitoringConfig {
  metrics: MetricsConfig;
  alerting: AlertingConfig;
  health: HealthConfig;
  observability: ObservabilityConfig;
  dashboards: DashboardConfig;
  automation: AutomationConfig;
  integration: IntegrationConfig;
  retention: RetentionConfig;
}

export interface MetricsConfig {
  collection: CollectionConfig;
  processing: ProcessingConfig;
  storage: StorageConfig;
  aggregation: AggregationConfig;
  exporters: ExporterConfig[];
}

export interface AlertingConfig {
  rules: AlertRule[];
  channels: AlertChannel[];
  suppression: SuppressionConfig;
  escalation: EscalationConfig;
  recovery: RecoveryConfig;
}

export interface HealthConfig {
  checks: HealthCheck[];
  probes: ProbeConfig[];
  dependencies: DependencyCheck[];
  sla: SLAConfig;
  degradation: DegradationConfig;
}

export interface ObservabilityConfig {
  tracing: TracingConfig;
  logging: LoggingConfig;
  profiling: ProfilingConfig;
  debugging: DebuggingConfig;
  correlation: CorrelationConfig;
}

export class SystemHealthEngine extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private healthStatus: Map<string, ComponentHealth> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private collectors: Map<string, MetricCollector> = new Map();

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.initializeMonitoring();
  }

  /**
   * Initialize comprehensive monitoring system
   */
  private async initializeMonitoring(): Promise<void> {
    await this.setupMetricCollection();
    await this.configureAlerting();
    await this.initializeHealthChecks();
    await this.setupObservability();
    await this.createDashboards();
    await this.startAutomation();
    await this.enableIntegrations();
    this.emit('monitoring:initialized');
  }

  /**
   * Setup metric collection
   */
  private async setupMetricCollection(): Promise<void> {
    // Initialize system metrics collector
    const systemCollector = new SystemMetricsCollector({
      interval: this.config.metrics.collection.interval,
      metrics: ['cpu', 'memory', 'disk', 'network'],
    });

    // Initialize application metrics collector
    const appCollector = new ApplicationMetricsCollector({
      interval: this.config.metrics.collection.interval,
      metrics: ['requests', 'responses', 'errors', 'latency'],
    });

    // Initialize documentation metrics collector
    const docCollector = new DocumentationMetricsCollector({
      interval: this.config.metrics.collection.interval,
      metrics: ['pageviews', 'searches', 'downloads', 'feedback'],
    });

    // Initialize database metrics collector
    const dbCollector = new DatabaseMetricsCollector({
      interval: this.config.metrics.collection.interval,
      metrics: ['connections', 'queries', 'performance'],
    });

    this.collectors.set('system', systemCollector);
    this.collectors.set('application', appCollector);
    this.collectors.set('documentation', docCollector);
    this.collectors.set('database', dbCollector);

    // Start all collectors
    for (const [name, collector] of this.collectors) {
      await collector.start();
      collector.on('metrics', (metrics) => {
        this.processMetrics(name, metrics);
      });
    }

    this.emit('collectors:started', { count: this.collectors.size });
  }

  /**
   * Process incoming metrics
   */
  private async processMetrics(
    source: string,
    metrics: RawMetric[],
  ): Promise<void> {
    for (const metric of metrics) {
      const processedMetric = await this.processMetric(source, metric);

      // Store metric
      const metricKey = `${source}.${metric.name}`;
      const metricData = this.metrics.get(metricKey) || [];
      metricData.push(processedMetric);

      // Apply retention policy
      const retentionLimit = this.config.retention.metrics;
      const cutoffTime = Date.now() - retentionLimit;
      const filteredData = metricData.filter((m) => m.timestamp >= cutoffTime);

      this.metrics.set(metricKey, filteredData);

      // Check alert rules
      await this.checkAlertRules(metricKey, processedMetric);

      // Update health status
      await this.updateComponentHealth(source, metric);
    }

    this.emit('metrics:processed', { source, count: metrics.length });
  }

  /**
   * Process individual metric
   */
  private async processMetric(
    source: string,
    rawMetric: RawMetric,
  ): Promise<MetricData> {
    const processed: MetricData = {
      name: rawMetric.name,
      value: rawMetric.value,
      timestamp: rawMetric.timestamp || Date.now(),
      source,
      labels: rawMetric.labels || {},
      type: rawMetric.type || 'gauge',
      unit: rawMetric.unit,
      metadata: rawMetric.metadata || {},
    };

    // Apply processing transformations
    for (const processor of this.config.metrics.processing.transformations) {
      processed.value = this.applyTransformation(processed.value, processor);
    }

    // Calculate aggregations if needed
    if (this.config.metrics.aggregation.enabled) {
      await this.updateAggregations(processed);
    }

    return processed;
  }

  /**
   * Configure alerting system
   */
  private async configureAlerting(): Promise<void> {
    // Process alert rules
    for (const rule of this.config.alerting.rules) {
      await this.processAlertRule(rule);
    }

    // Setup alert channels
    for (const channel of this.config.alerting.channels) {
      await this.setupAlertChannel(channel);
    }

    this.emit('alerting:configured');
  }

  /**
   * Check alert rules against metric
   */
  private async checkAlertRules(
    metricKey: string,
    metric: MetricData,
  ): Promise<void> {
    for (const rule of this.config.alerting.rules) {
      if (this.matchesRuleConditions(rule, metricKey, metric)) {
        await this.evaluateAlertRule(rule, metric);
      }
    }
  }

  /**
   * Evaluate alert rule
   */
  private async evaluateAlertRule(
    rule: AlertRule,
    metric: MetricData,
  ): Promise<void> {
    const alertKey = `${rule.id}-${metric.source}`;
    const existingAlert = this.alerts.get(alertKey);

    // Check if condition is met
    const conditionMet = this.evaluateCondition(rule.condition, metric);

    if (conditionMet && !existingAlert) {
      // Create new alert
      const alert = await this.createAlert(rule, metric);
      this.alerts.set(alertKey, alert);
      await this.triggerAlert(alert);
      this.emit('alert:triggered', alert);
    } else if (
      !conditionMet &&
      existingAlert &&
      existingAlert.status === 'firing'
    ) {
      // Resolve alert
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = new Date();
      await this.resolveAlert(existingAlert);
      this.emit('alert:resolved', existingAlert);
    }
  }

  /**
   * Initialize health checks
   */
  private async initializeHealthChecks(): Promise<void> {
    for (const check of this.config.health.checks) {
      await this.setupHealthCheck(check);
    }

    // Start health check scheduler
    setInterval(() => {
      this.runHealthChecks();
    }, this.config.health.checks[0]?.interval || 30000);

    this.emit('health:initialized');
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks(): Promise<void> {
    const healthPromises = this.config.health.checks.map((check) =>
      this.runHealthCheck(check),
    );

    const results = await Promise.allSettled(healthPromises);

    results.forEach((result, index) => {
      const check = this.config.health.checks[index];
      if (result.status === 'fulfilled') {
        this.updateHealthStatus(check.component, result.value);
      } else {
        this.updateHealthStatus(check.component, {
          status: 'unhealthy',
          lastCheck: new Date(),
          error: result.reason.message,
        });
      }
    });
  }

  /**
   * Run individual health check
   */
  private async runHealthCheck(check: HealthCheck): Promise<HealthResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeHealthCheck(check);
      const duration = Date.now() - startTime;

      return {
        component: check.component,
        status: result.healthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        duration,
        details: result.details,
        metrics: result.metrics,
      };
    } catch (error) {
      return {
        component: check.component,
        status: 'unhealthy',
        lastCheck: new Date(),
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Update component health status
   */
  private updateHealthStatus(component: string, health: HealthResult): void {
    const componentHealth: ComponentHealth = {
      component,
      status: health.status,
      lastCheck: health.lastCheck,
      duration: health.duration,
      details: health.details,
      metrics: health.metrics,
      error: health.error,
      history: [],
    };

    // Add to history
    const existingHealth = this.healthStatus.get(component);
    if (existingHealth) {
      componentHealth.history = [
        ...existingHealth.history,
        {
          status: existingHealth.status,
          timestamp: existingHealth.lastCheck,
          duration: existingHealth.duration,
        },
      ].slice(-100); // Keep last 100 entries
    }

    this.healthStatus.set(component, componentHealth);
    this.emit('health:updated', { component, status: health.status });
  }

  /**
   * Get system health overview
   */
  async getSystemHealthOverview(): Promise<SystemHealthOverview> {
    const overview: SystemHealthOverview = {
      timestamp: new Date(),
      overallStatus: 'healthy',
      components: [],
      metrics: {
        totalComponents: this.healthStatus.size,
        healthyComponents: 0,
        unhealthyComponents: 0,
        degradedComponents: 0,
      },
      alerts: {
        total: this.alerts.size,
        critical: 0,
        warning: 0,
        info: 0,
      },
      sla: await this.calculateSLAMetrics(),
    };

    // Process component health
    for (const [component, health] of this.healthStatus) {
      overview.components.push({
        name: component,
        status: health.status,
        lastCheck: health.lastCheck,
        uptime: await this.calculateUptime(component),
        responseTime: health.duration,
      });

      switch (health.status) {
        case 'healthy':
          overview.metrics.healthyComponents++;
          break;
        case 'unhealthy':
          overview.metrics.unhealthyComponents++;
          break;
        case 'degraded':
          overview.metrics.degradedComponents++;
          break;
      }
    }

    // Determine overall status
    if (overview.metrics.unhealthyComponents > 0) {
      overview.overallStatus = 'unhealthy';
    } else if (overview.metrics.degradedComponents > 0) {
      overview.overallStatus = 'degraded';
    }

    // Process alerts
    for (const alert of this.alerts.values()) {
      switch (alert.severity) {
        case 'critical':
          overview.alerts.critical++;
          break;
        case 'warning':
          overview.alerts.warning++;
          break;
        case 'info':
          overview.alerts.info++;
          break;
      }
    }

    return overview;
  }

  /**
   * Generate comprehensive system report
   */
  async generateSystemReport(period: ReportPeriod): Promise<SystemReport> {
    const endTime = Date.now();
    const startTime = endTime - this.getPeriodDuration(period);

    const report: SystemReport = {
      period,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      executive: await this.generateExecutiveSummary(startTime, endTime),
      performance: await this.generatePerformanceReport(startTime, endTime),
      reliability: await this.generateReliabilityReport(startTime, endTime),
      security: await this.generateSecurityReport(startTime, endTime),
      capacity: await this.generateCapacityReport(startTime, endTime),
      recommendations: await this.generateRecommendations(startTime, endTime),
    };

    this.emit('report:generated', {
      period,
      componentsCount: report.performance.components.length,
    });
    return report;
  }

  /**
   * Create custom monitoring dashboard
   */
  async createDashboard(config: DashboardConfig): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: config.id,
      name: config.name,
      description: config.description,
      layout: config.layout,
      widgets: [],
      filters: config.filters || [],
      autoRefresh: config.autoRefresh || false,
      refreshInterval: config.refreshInterval || 60000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create widgets
    for (const widgetConfig of config.widgets) {
      const widget = await this.createDashboardWidget(widgetConfig);
      dashboard.widgets.push(widget);
    }

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboard:created', { dashboardId: dashboard.id });

    return dashboard;
  }

  /**
   * Setup automated remediation
   */
  async setupAutomatedRemediation(): Promise<void> {
    if (!this.config.automation.enabled) return;

    for (const automation of this.config.automation.rules) {
      await this.setupAutomationRule(automation);
    }

    this.emit('automation:enabled');
  }

  /**
   * Execute automated remediation
   */
  async executeRemediation(
    alert: Alert,
    automation: AutomationRule,
  ): Promise<RemediationResult> {
    const remediationId = this.generateRemediationId();
    const startTime = Date.now();

    this.emit('remediation:started', { remediationId, alertId: alert.id });

    try {
      const result = await this.runRemediationActions(
        automation.actions,
        alert,
      );

      const remediation: RemediationResult = {
        id: remediationId,
        alertId: alert.id,
        automation: automation.id,
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        actions: result.actions,
        outcome: result.outcome,
      };

      this.emit('remediation:completed', remediation);
      return remediation;
    } catch (error) {
      const remediation: RemediationResult = {
        id: remediationId,
        alertId: alert.id,
        automation: automation.id,
        status: 'failed',
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        actions: [],
        error: error.message,
      };

      this.emit('remediation:failed', remediation);
      return remediation;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics(components: string[]): Promise<RealtimeMetrics> {
    const metrics: RealtimeMetrics = {
      timestamp: new Date(),
      components: {},
    };

    for (const component of components) {
      const componentMetrics = await this.getComponentMetrics(component);
      metrics.components[component] = componentMetrics;
    }

    return metrics;
  }

  /**
   * Setup alerting integrations
   */
  private async enableIntegrations(): Promise<void> {
    for (const integration of this.config.integration.enabled) {
      await this.setupIntegration(integration);
    }
    this.emit('integrations:enabled');
  }

  // Private utility methods
  private applyTransformation(
    value: number,
    processor: ProcessingTransformation,
  ): number {
    switch (processor.type) {
      case 'multiply':
        return value * processor.factor;
      case 'divide':
        return value / processor.factor;
      case 'add':
        return value + processor.factor;
      case 'subtract':
        return value - processor.factor;
      default:
        return value;
    }
  }

  private matchesRuleConditions(
    rule: AlertRule,
    metricKey: string,
    metric: MetricData,
  ): boolean {
    return rule.metric === metricKey || rule.metric === `${metric.source}.*`;
  }

  private evaluateCondition(
    condition: AlertCondition,
    metric: MetricData,
  ): boolean {
    const { operator, threshold } = condition;

    switch (operator) {
      case 'gt':
        return metric.value > threshold;
      case 'gte':
        return metric.value >= threshold;
      case 'lt':
        return metric.value < threshold;
      case 'lte':
        return metric.value <= threshold;
      case 'eq':
        return metric.value === threshold;
      case 'neq':
        return metric.value !== threshold;
      default:
        return false;
    }
  }

  private async createAlert(
    rule: AlertRule,
    metric: MetricData,
  ): Promise<Alert> {
    return {
      id: this.generateAlertId(),
      rule: rule.id,
      metric: metric.name,
      component: metric.source,
      severity: rule.severity,
      status: 'firing',
      message: this.buildAlertMessage(rule, metric),
      value: metric.value,
      threshold: rule.condition.threshold,
      firedAt: new Date(),
      labels: { ...rule.labels, ...metric.labels },
      annotations: rule.annotations || {},
    };
  }

  private buildAlertMessage(rule: AlertRule, metric: MetricData): string {
    return rule.message
      .replace('{{metric}}', metric.name)
      .replace('{{value}}', metric.value.toString())
      .replace('{{threshold}}', rule.condition.threshold.toString());
  }

  private async triggerAlert(alert: Alert): Promise<void> {
    // Send alert to configured channels
    for (const channel of this.config.alerting.channels) {
      await this.sendAlertToChannel(alert, channel);
    }
  }

  private async resolveAlert(alert: Alert): Promise<void> {
    // Send resolution notification
    for (const channel of this.config.alerting.channels) {
      await this.sendResolutionToChannel(alert, channel);
    }
  }

  private async executeHealthCheck(
    check: HealthCheck,
  ): Promise<{ healthy: boolean; details?: any; metrics?: any }> {
    switch (check.type) {
      case 'http':
        return this.httpHealthCheck(check.config);
      case 'tcp':
        return this.tcpHealthCheck(check.config);
      case 'database':
        return this.databaseHealthCheck(check.config);
      case 'custom':
        return this.customHealthCheck(check.config);
      default:
        return { healthy: true };
    }
  }

  private async httpHealthCheck(
    config: any,
  ): Promise<{ healthy: boolean; details?: any }> {
    // Implement HTTP health check
    return { healthy: true };
  }

  private async tcpHealthCheck(
    config: any,
  ): Promise<{ healthy: boolean; details?: any }> {
    // Implement TCP health check
    return { healthy: true };
  }

  private async databaseHealthCheck(
    config: any,
  ): Promise<{ healthy: boolean; details?: any }> {
    // Implement database health check
    return { healthy: true };
  }

  private async customHealthCheck(
    config: any,
  ): Promise<{ healthy: boolean; details?: any }> {
    // Implement custom health check
    return { healthy: true };
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRemediationId(): string {
    return `remediation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodDuration(period: ReportPeriod): number {
    const durations = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };
    return durations[period] || durations['24h'];
  }

  // Additional placeholder methods
  private async updateAggregations(metric: MetricData): Promise<void> {}
  private async processAlertRule(rule: AlertRule): Promise<void> {}
  private async setupAlertChannel(channel: AlertChannel): Promise<void> {}
  private async setupHealthCheck(check: HealthCheck): Promise<void> {}
  private async calculateUptime(component: string): Promise<number> {
    return 99.9;
  }
  private async calculateSLAMetrics(): Promise<SLAMetrics> {
    return { availability: 99.9, performance: 95.0, quality: 98.5 };
  }
  private async generateExecutiveSummary(
    start: number,
    end: number,
  ): Promise<ExecutiveSummary> {
    return { availability: 99.9, incidents: 2, mttr: 300, recommendations: [] };
  }
  private async generatePerformanceReport(
    start: number,
    end: number,
  ): Promise<PerformanceReport> {
    return { components: [], trends: [], bottlenecks: [] };
  }
  private async generateReliabilityReport(
    start: number,
    end: number,
  ): Promise<ReliabilityReport> {
    return { uptime: 99.9, incidents: [], mtbf: 720, mttr: 300 };
  }
  private async generateSecurityReport(
    start: number,
    end: number,
  ): Promise<SecurityReport> {
    return { events: [], vulnerabilities: [], compliance: 95.0 };
  }
  private async generateCapacityReport(
    start: number,
    end: number,
  ): Promise<CapacityReport> {
    return { utilization: {}, forecast: [], recommendations: [] };
  }
  private async generateRecommendations(
    start: number,
    end: number,
  ): Promise<string[]> {
    return ['Increase monitoring frequency', 'Add more health checks'];
  }
  private async createDashboardWidget(config: any): Promise<DashboardWidget> {
    return {
      id: 'widget-1',
      type: 'chart',
      title: 'Sample Widget',
      configuration: {},
    };
  }
  private async setupAutomationRule(
    automation: AutomationRule,
  ): Promise<void> {}
  private async runRemediationActions(
    actions: RemediationAction[],
    alert: Alert,
  ): Promise<{ actions: any[]; outcome: string }> {
    return { actions: [], outcome: 'success' };
  }
  private async getComponentMetrics(component: string): Promise<any> {
    return {};
  }
  private async setupIntegration(integration: string): Promise<void> {}
  private async sendAlertToChannel(
    alert: Alert,
    channel: AlertChannel,
  ): Promise<void> {}
  private async sendResolutionToChannel(
    alert: Alert,
    channel: AlertChannel,
  ): Promise<void> {}
}

// Metric Collectors
class SystemMetricsCollector extends EventEmitter {
  constructor(private config: any) {
    super();
  }
  async start(): Promise<void> {
    setInterval(() => {
      const metrics = this.collectSystemMetrics();
      this.emit('metrics', metrics);
    }, this.config.interval);
  }
  private collectSystemMetrics(): RawMetric[] {
    return [];
  }
}

class ApplicationMetricsCollector extends EventEmitter {
  constructor(private config: any) {
    super();
  }
  async start(): Promise<void> {
    setInterval(() => {
      const metrics = this.collectAppMetrics();
      this.emit('metrics', metrics);
    }, this.config.interval);
  }
  private collectAppMetrics(): RawMetric[] {
    return [];
  }
}

class DocumentationMetricsCollector extends EventEmitter {
  constructor(private config: any) {
    super();
  }
  async start(): Promise<void> {
    setInterval(() => {
      const metrics = this.collectDocMetrics();
      this.emit('metrics', metrics);
    }, this.config.interval);
  }
  private collectDocMetrics(): RawMetric[] {
    return [];
  }
}

class DatabaseMetricsCollector extends EventEmitter {
  constructor(private config: any) {
    super();
  }
  async start(): Promise<void> {
    setInterval(() => {
      const metrics = this.collectDbMetrics();
      this.emit('metrics', metrics);
    }, this.config.interval);
  }
  private collectDbMetrics(): RawMetric[] {
    return [];
  }
}

abstract class MetricCollector extends EventEmitter {
  abstract start(): Promise<void>;
}

// Type definitions
export interface RawMetric {
  name: string;
  value: number;
  timestamp?: number;
  type?: string;
  unit?: string;
  labels?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  source: string;
  labels: Record<string, string>;
  type: string;
  unit?: string;
  metadata: Record<string, any>;
}

export interface Alert {
  id: string;
  rule: string;
  metric: string;
  component: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'resolved';
  message: string;
  value: number;
  threshold: number;
  firedAt: Date;
  resolvedAt?: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface HealthResult {
  component: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  duration?: number;
  details?: any;
  metrics?: any;
  error?: string;
}

export interface ComponentHealth {
  component: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  duration?: number;
  details?: any;
  metrics?: any;
  error?: string;
  history: HealthHistoryEntry[];
}

export interface HealthHistoryEntry {
  status: string;
  timestamp: Date;
  duration?: number;
}

export interface SystemHealthOverview {
  timestamp: Date;
  overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  components: ComponentOverview[];
  metrics: {
    totalComponents: number;
    healthyComponents: number;
    unhealthyComponents: number;
    degradedComponents: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  sla: SLAMetrics;
}

export interface ComponentOverview {
  name: string;
  status: string;
  lastCheck: Date;
  uptime: number;
  responseTime?: number;
}

export interface SLAMetrics {
  availability: number;
  performance: number;
  quality: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  autoRefresh: boolean;
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  configuration: any;
}

export interface SystemReport {
  period: ReportPeriod;
  startTime: Date;
  endTime: Date;
  executive: ExecutiveSummary;
  performance: PerformanceReport;
  reliability: ReliabilityReport;
  security: SecurityReport;
  capacity: CapacityReport;
  recommendations: string[];
}

export interface RemediationResult {
  id: string;
  alertId: string;
  automation: string;
  status: 'success' | 'failed';
  startTime: Date;
  endTime: Date;
  duration: number;
  actions: any[];
  outcome?: string;
  error?: string;
}

export interface RealtimeMetrics {
  timestamp: Date;
  components: Record<string, any>;
}

export type ReportPeriod = '1h' | '24h' | '7d' | '30d';

// Configuration interfaces
export interface CollectionConfig {
  interval: number;
  buffer: number;
  compression: boolean;
}

export interface ProcessingConfig {
  transformations: ProcessingTransformation[];
  validation: boolean;
  enrichment: boolean;
}

export interface ProcessingTransformation {
  type: 'multiply' | 'divide' | 'add' | 'subtract';
  factor: number;
}

export interface StorageConfig {
  backend: string;
  retention: number;
  compression: boolean;
}

export interface AggregationConfig {
  enabled: boolean;
  windows: string[];
  functions: string[];
}

export interface ExporterConfig {
  name: string;
  type: string;
  configuration: any;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  duration?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  configuration: any;
  enabled: boolean;
}

export interface SuppressionConfig {
  rules: SuppressionRule[];
  maintenance: MaintenanceWindow[];
}

export interface SuppressionRule {
  pattern: string;
  duration: number;
  reason: string;
}

export interface MaintenanceWindow {
  start: Date;
  end: Date;
  components: string[];
  reason: string;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  duration: number;
  channels: string[];
}

export interface RecoveryConfig {
  notifications: boolean;
  channels: string[];
}

export interface HealthCheck {
  id: string;
  name: string;
  component: string;
  type: 'http' | 'tcp' | 'database' | 'custom';
  config: any;
  interval: number;
  timeout: number;
  retries: number;
  enabled: boolean;
}

export interface ProbeConfig {
  readiness: HealthCheck[];
  liveness: HealthCheck[];
  startup: HealthCheck[];
}

export interface DependencyCheck {
  name: string;
  type: string;
  configuration: any;
  criticality: 'high' | 'medium' | 'low';
}

export interface SLAConfig {
  targets: SLATarget[];
  reporting: boolean;
  alerting: boolean;
}

export interface SLATarget {
  metric: string;
  target: number;
  window: string;
}

export interface DegradationConfig {
  thresholds: DegradationThreshold[];
  actions: DegradationAction[];
}

export interface DegradationThreshold {
  metric: string;
  warning: number;
  critical: number;
}

export interface DegradationAction {
  trigger: string;
  action: string;
  configuration: any;
}

export interface TracingConfig {
  enabled: boolean;
  sampling: number;
  exporters: string[];
}

export interface LoggingConfig {
  level: string;
  structured: boolean;
  correlation: boolean;
  exporters: string[];
}

export interface ProfilingConfig {
  enabled: boolean;
  continuous: boolean;
  types: string[];
}

export interface DebuggingConfig {
  enabled: boolean;
  tools: string[];
  access: string[];
}

export interface CorrelationConfig {
  enabled: boolean;
  traceId: string;
  spanId: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: any[];
  filters?: DashboardFilter[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
}

export interface DashboardFilter {
  name: string;
  type: string;
  options: string[];
}

export interface AutomationConfig {
  enabled: boolean;
  rules: AutomationRule[];
  safety: SafetyConfig;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: RemediationAction[];
  conditions: AutomationCondition[];
}

export interface AutomationTrigger {
  type: 'alert' | 'health' | 'metric';
  configuration: any;
}

export interface RemediationAction {
  type: string;
  configuration: any;
  timeout?: number;
}

export interface AutomationCondition {
  type: string;
  configuration: any;
}

export interface SafetyConfig {
  requireApproval: boolean;
  maxActions: number;
  cooldown: number;
}

export interface IntegrationConfig {
  enabled: string[];
  configurations: Record<string, any>;
}

export interface RetentionConfig {
  metrics: number;
  alerts: number;
  health: number;
  reports: number;
}

// Report interfaces
export interface ExecutiveSummary {
  availability: number;
  incidents: number;
  mttr: number;
  recommendations: string[];
}

export interface PerformanceReport {
  components: any[];
  trends: any[];
  bottlenecks: any[];
}

export interface ReliabilityReport {
  uptime: number;
  incidents: any[];
  mtbf: number;
  mttr: number;
}

export interface SecurityReport {
  events: any[];
  vulnerabilities: any[];
  compliance: number;
}

export interface CapacityReport {
  utilization: Record<string, number>;
  forecast: any[];
  recommendations: string[];
}
