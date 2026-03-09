/**
 * Advanced Metrics Aggregation Engine for IntelGraph Analytics
 * Real-time metrics collection, aggregation, and dashboard generation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface Metric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'timer';
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  unit?: string;
  description?: string;
}

export interface MetricAggregation {
  metric: string;
  timeWindow: number; // milliseconds
  aggregationType:
    | 'sum'
    | 'avg'
    | 'count'
    | 'min'
    | 'max'
    | 'percentile'
    | 'rate';
  percentile?: number; // for percentile aggregations
  groupBy?: string[]; // label keys to group by
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  refresh: number; // seconds
  timeRange: {
    from: string | Date;
    to: string | Date;
  };
  variables: DashboardVariable[];
  tags: string[];
}

export interface DashboardPanel {
  id: string;
  title: string;
  type:
    | 'graph'
    | 'stat'
    | 'table'
    | 'heatmap'
    | 'gauge'
    | 'bargraph'
    | 'piechart';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  queries: MetricQuery[];
  visualization: VisualizationConfig;
  alerts?: AlertRule[];
}

export interface MetricQuery {
  id: string;
  expression: string; // PromQL-like query language
  legend: string;
  refId: string;
  intervalMs?: number;
  hide?: boolean;
}

export interface VisualizationConfig {
  displayMode?: 'basic' | 'gradient' | 'lcd';
  orientation?: 'horizontal' | 'vertical';
  colorScheme?: string;
  thresholds?: Threshold[];
  unit?: string;
  decimals?: number;
  legend?: {
    show: boolean;
    position: 'bottom' | 'right' | 'top';
  };
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
  };
}

export interface Threshold {
  value: number;
  color: string;
  condition: 'gt' | 'lt' | 'eq';
}

export interface AxisConfig {
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  scale?: 'linear' | 'log';
}

export interface DashboardVariable {
  name: string;
  type: 'query' | 'custom' | 'constant' | 'interval';
  label: string;
  query?: string;
  options?: string[];
  current?: string;
  multi?: boolean;
  includeAll?: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  frequency: number; // seconds
  for: number; // seconds - how long condition must be true
  severity: 'info' | 'warning' | 'critical';
  channels: string[]; // notification channels
  message?: string;
  enabled: boolean;
}

export interface MetricsStorage {
  retention: {
    raw: number; // days
    hourly: number; // days
    daily: number; // days
    monthly: number; // months
  };
  downsampling: {
    enabled: boolean;
    rules: DownsamplingRule[];
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'snappy' | 'lz4';
  };
}

export interface DownsamplingRule {
  resolution: string; // e.g., '5m', '1h', '1d'
  retention: string; // e.g., '30d', '1y'
  aggregations: string[]; // 'avg', 'sum', 'min', 'max'
}

export class MetricsAggregator extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private aggregations: Map<string, MetricAggregation> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private storage: MetricsStorage;
  private alertManager: AlertManager;
  private queryEngine: MetricsQueryEngine;

  constructor(storage: MetricsStorage) {
    super();
    this.storage = storage;
    this.alertManager = new AlertManager();
    this.queryEngine = new MetricsQueryEngine();
    this.setupAggregationTasks();
    this.setupRetentionTasks();
  }

  /**
   * Record a metric value
   */
  record(metric: Omit<Metric, 'id' | 'timestamp'>): void {
    const fullMetric: Metric = {
      id: uuidv4(),
      timestamp: new Date(),
      ...metric,
    };

    // Store metric
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    this.metrics.get(metric.name)!.push(fullMetric);

    // Trigger real-time aggregations
    this.processRealTimeAggregations(fullMetric);

    // Check alerts
    this.alertManager.checkAlerts(fullMetric);

    this.emit('metric_recorded', fullMetric);
  }

  /**
   * Record multiple metrics in batch
   */
  recordBatch(metrics: Array<Omit<Metric, 'id' | 'timestamp'>>): void {
    const timestamp = new Date();

    for (const metric of metrics) {
      this.record({ ...metric });
    }

    this.emit('batch_recorded', { count: metrics.length, timestamp });
  }

  /**
   * Increment a counter metric
   */
  increment(
    name: string,
    value: number = 1,
    labels: Record<string, string> = {},
  ): void {
    this.record({
      name,
      type: 'counter',
      value,
      labels,
    });
  }

  /**
   * Set a gauge metric
   */
  gauge(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    this.record({
      name,
      type: 'gauge',
      value,
      labels,
    });
  }

  /**
   * Record a histogram metric
   */
  histogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    this.record({
      name,
      type: 'histogram',
      value,
      labels,
    });
  }

  /**
   * Time an operation and record the duration
   */
  time<T>(
    name: string,
    operation: () => Promise<T>,
    labels: Record<string, string> = {},
  ): Promise<T> {
    const start = Date.now();

    return operation().then(
      (result) => {
        this.record({
          name,
          type: 'timer',
          value: Date.now() - start,
          labels,
          unit: 'ms',
        });
        return result;
      },
      (error) => {
        this.record({
          name: `${name}_error`,
          type: 'counter',
          value: 1,
          labels: { ...labels, error: error.message },
        });
        throw error;
      },
    );
  }

  /**
   * Create a metric aggregation rule
   */
  createAggregation(name: string, aggregation: MetricAggregation): void {
    this.aggregations.set(name, aggregation);
    this.emit('aggregation_created', { name, aggregation });
  }

  /**
   * Query metrics
   */
  async query(
    expression: string,
    startTime: Date,
    endTime: Date,
    step?: number,
  ): Promise<any> {
    return this.queryEngine.execute(expression, startTime, endTime, step);
  }

  /**
   * Create a dashboard
   */
  createDashboard(dashboard: Omit<Dashboard, 'id'>): string {
    const dashboardId = uuidv4();
    const fullDashboard: Dashboard = {
      id: dashboardId,
      ...dashboard,
    };

    this.dashboards.set(dashboardId, fullDashboard);
    this.emit('dashboard_created', fullDashboard);

    return dashboardId;
  }

  /**
   * Update a dashboard
   */
  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const updatedDashboard = { ...dashboard, ...updates };
    this.dashboards.set(dashboardId, updatedDashboard);

    this.emit('dashboard_updated', updatedDashboard);
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const panelData = await Promise.all(
      dashboard.panels.map(async (panel) => {
        const queries = await Promise.all(
          panel.queries.map(async (query) => {
            const results = await this.query(
              query.expression,
              new Date(dashboard.timeRange.from),
              new Date(dashboard.timeRange.to),
            );
            return {
              refId: query.refId,
              results,
            };
          }),
        );

        return {
          id: panel.id,
          title: panel.title,
          type: panel.type,
          data: queries,
        };
      }),
    );

    return {
      dashboard: dashboard,
      data: panelData,
      generatedAt: new Date(),
    };
  }

  /**
   * Get all dashboards
   */
  getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(dashboardId: string): Dashboard | null {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(dashboard: Dashboard): string {
    const dashboardId = dashboard.id || uuidv4();
    const importedDashboard = { ...dashboard, id: dashboardId };

    this.dashboards.set(dashboardId, importedDashboard);
    this.emit('dashboard_imported', importedDashboard);

    return dashboardId;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(
    metricName: string,
    timeRange: { start: Date; end: Date },
  ): any {
    const metricData = this.metrics.get(metricName) || [];
    const filteredData = metricData.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
    );

    if (filteredData.length === 0) {
      return null;
    }

    const values = filteredData.map((m) => m.value);
    const sortedValues = values.sort((a, b) => a - b);

    return {
      count: filteredData.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sortedValues[Math.floor(sortedValues.length / 2)],
      p95: sortedValues[Math.floor(sortedValues.length * 0.95)],
      p99: sortedValues[Math.floor(sortedValues.length * 0.99)],
      stddev: this.calculateStandardDeviation(values),
    };
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): any {
    const totalMetrics = Array.from(this.metrics.values()).reduce(
      (sum, metrics) => sum + metrics.length,
      0,
    );

    const memoryUsage = process.memoryUsage();

    return {
      totalMetrics,
      uniqueMetricNames: this.metrics.size,
      activeDashboards: this.dashboards.size,
      activeAggregations: this.aggregations.size,
      memoryUsage: {
        rss: memoryUsage.rss / 1024 / 1024, // MB
        heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
      },
      uptime: process.uptime(),
    };
  }

  /**
   * Process real-time aggregations
   */
  private processRealTimeAggregations(metric: Metric): void {
    for (const [name, aggregation] of this.aggregations.entries()) {
      if (aggregation.metric === metric.name) {
        // Process aggregation
        this.processAggregation(name, aggregation, metric);
      }
    }
  }

  /**
   * Process a specific aggregation
   */
  private processAggregation(
    name: string,
    aggregation: MetricAggregation,
    metric: Metric,
  ): void {
    // Get metrics within the time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - aggregation.timeWindow);

    const metricData = this.metrics.get(aggregation.metric) || [];
    const windowData = metricData.filter(
      (m) => m.timestamp >= windowStart && m.timestamp <= now,
    );

    if (windowData.length === 0) return;

    // Group by labels if specified
    const groupedData = aggregation.groupBy
      ? this.groupByLabels(windowData, aggregation.groupBy)
      : { default: windowData };

    // Calculate aggregation for each group
    for (const [groupKey, groupData] of Object.entries(groupedData)) {
      const aggregatedValue = this.calculateAggregatedValue(
        groupData as Metric[],
        aggregation.aggregationType,
        aggregation.percentile,
      );

      // Create aggregated metric
      const aggregatedMetric: Metric = {
        id: uuidv4(),
        name: `${name}_${aggregation.aggregationType}`,
        type: 'gauge',
        value: aggregatedValue,
        timestamp: now,
        labels: {
          aggregation: name,
          group: groupKey,
          window: `${aggregation.timeWindow}ms`,
        },
      };

      // Store aggregated metric
      this.record(aggregatedMetric);
    }
  }

  /**
   * Group metrics by specified labels
   */
  private groupByLabels(
    metrics: Metric[],
    labelKeys: string[],
  ): Record<string, Metric[]> {
    const groups: Record<string, Metric[]> = {};

    for (const metric of metrics) {
      const groupKey = labelKeys
        .map((key) => `${key}=${metric.labels[key] || 'unknown'}`)
        .join(',');

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(metric);
    }

    return groups;
  }

  /**
   * Calculate aggregated value
   */
  private calculateAggregatedValue(
    metrics: Metric[],
    aggregationType: string,
    percentile?: number,
  ): number {
    const values = metrics.map((m) => m.value);

    switch (aggregationType) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'percentile':
        if (percentile === undefined)
          throw new Error('Percentile value required');
        const sorted = values.sort((a, b) => a - b);
        const index = Math.floor((percentile / 100) * sorted.length);
        return sorted[index] || 0;
      case 'rate':
        // Calculate rate per second
        const timeSpan =
          (metrics[metrics.length - 1].timestamp.getTime() -
            metrics[0].timestamp.getTime()) /
          1000;
        return timeSpan > 0 ? values.length / timeSpan : 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Set up aggregation processing tasks
   */
  private setupAggregationTasks(): void {
    // Process aggregations every 10 seconds
    setInterval(() => {
      for (const [name, aggregation] of this.aggregations.entries()) {
        // Trigger aggregation processing
        this.emit('aggregation_processed', { name, timestamp: new Date() });
      }
    }, 10000);
  }

  /**
   * Set up data retention tasks
   */
  private setupRetentionTasks(): void {
    // Run retention cleanup daily
    setInterval(
      () => {
        this.performRetentionCleanup();
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours
  }

  /**
   * Perform data retention cleanup
   */
  private performRetentionCleanup(): void {
    const now = new Date();
    const retentionCutoff = new Date(
      now.getTime() - this.storage.retention.raw * 24 * 60 * 60 * 1000,
    );

    for (const [metricName, metrics] of this.metrics.entries()) {
      const retained = metrics.filter((m) => m.timestamp >= retentionCutoff);
      this.metrics.set(metricName, retained);
    }

    this.emit('retention_cleanup_completed', {
      timestamp: now,
      cutoff: retentionCutoff,
    });
  }
}

/**
 * Alert Manager for metrics
 */
class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private alertStates: Map<string, any> = new Map();

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.alertStates.delete(ruleId);
  }

  checkAlerts(metric: Metric): void {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      // Simple alert condition checking
      // In a real implementation, this would parse the condition expression
      const isTriggered = this.evaluateCondition(rule.condition, metric);

      if (isTriggered) {
        this.triggerAlert(rule, metric);
      }
    }
  }

  private evaluateCondition(condition: string, metric: Metric): boolean {
    // Simplified condition evaluation
    return Math.random() > 0.99; // 1% chance of alert
  }

  private triggerAlert(rule: AlertRule, metric: Metric): void {
    this.emit('alert_triggered', {
      rule,
      metric,
      timestamp: new Date(),
    });
  }
}

/**
 * Metrics Query Engine
 */
class MetricsQueryEngine {
  async execute(
    expression: string,
    startTime: Date,
    endTime: Date,
    step?: number,
  ): Promise<any> {
    // Mock query execution
    // In a real implementation, this would parse and execute the query expression
    console.log(
      `Executing query: ${expression} from ${startTime} to ${endTime}`,
    );

    return {
      metric: expression,
      values: this.generateMockData(startTime, endTime, step || 60000),
      timestamps: this.generateTimestamps(startTime, endTime, step || 60000),
    };
  }

  private generateMockData(start: Date, end: Date, step: number): number[] {
    const points = Math.floor((end.getTime() - start.getTime()) / step);
    return Array.from({ length: points }, () => Math.random() * 100);
  }

  private generateTimestamps(start: Date, end: Date, step: number): Date[] {
    const timestamps = [];
    let current = new Date(start);

    while (current <= end) {
      timestamps.push(new Date(current));
      current = new Date(current.getTime() + step);
    }

    return timestamps;
  }
}

export default MetricsAggregator;
