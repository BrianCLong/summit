import * as promClient from 'prom-client';

/**
 * Prometheus metrics for plugin monitoring
 */
export class PluginMetrics {
  private registry: promClient.Registry;
  private pluginId: string;

  // Counters
  private requestCounter: promClient.Counter;
  private errorCounter: promClient.Counter;
  private webhookCounter: promClient.Counter;

  // Histograms
  private requestDuration: promClient.Histogram;
  private executionDuration: promClient.Histogram;

  // Gauges
  private activePlugins: promClient.Gauge;
  private memoryUsage: promClient.Gauge;
  private cpuUsage: promClient.Gauge;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.registry = new promClient.Registry();

    // Initialize counters
    this.requestCounter = new promClient.Counter({
      name: 'plugin_requests_total',
      help: 'Total number of plugin requests',
      labelNames: ['plugin_id', 'method', 'status'],
      registers: [this.registry],
    });

    this.errorCounter = new promClient.Counter({
      name: 'plugin_errors_total',
      help: 'Total number of plugin errors',
      labelNames: ['plugin_id', 'error_type'],
      registers: [this.registry],
    });

    this.webhookCounter = new promClient.Counter({
      name: 'plugin_webhooks_total',
      help: 'Total number of webhooks processed',
      labelNames: ['plugin_id', 'event', 'status'],
      registers: [this.registry],
    });

    // Initialize histograms
    this.requestDuration = new promClient.Histogram({
      name: 'plugin_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['plugin_id', 'method'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.executionDuration = new promClient.Histogram({
      name: 'plugin_execution_duration_seconds',
      help: 'Plugin execution duration in seconds',
      labelNames: ['plugin_id', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    // Initialize gauges
    this.activePlugins = new promClient.Gauge({
      name: 'plugin_active_count',
      help: 'Number of active plugins',
      registers: [this.registry],
    });

    this.memoryUsage = new promClient.Gauge({
      name: 'plugin_memory_usage_bytes',
      help: 'Memory usage by plugin',
      labelNames: ['plugin_id'],
      registers: [this.registry],
    });

    this.cpuUsage = new promClient.Gauge({
      name: 'plugin_cpu_usage_percent',
      help: 'CPU usage by plugin',
      labelNames: ['plugin_id'],
      registers: [this.registry],
    });
  }

  /**
   * Record a request
   */
  recordRequest(method: string, status: number): void {
    this.requestCounter.inc({
      plugin_id: this.pluginId,
      method,
      status: status.toString(),
    });
  }

  /**
   * Record an error
   */
  recordError(errorType: string): void {
    this.errorCounter.inc({
      plugin_id: this.pluginId,
      error_type: errorType,
    });
  }

  /**
   * Record webhook processing
   */
  recordWebhook(event: string, status: 'success' | 'failure'): void {
    this.webhookCounter.inc({
      plugin_id: this.pluginId,
      event,
      status,
    });
  }

  /**
   * Record request duration
   */
  recordRequestDuration(method: string, durationSeconds: number): void {
    this.requestDuration.observe(
      { plugin_id: this.pluginId, method },
      durationSeconds
    );
  }

  /**
   * Record execution duration
   */
  recordExecutionDuration(operation: string, durationSeconds: number): void {
    this.executionDuration.observe(
      { plugin_id: this.pluginId, operation },
      durationSeconds
    );
  }

  /**
   * Set active plugin count
   */
  setActivePluginCount(count: number): void {
    this.activePlugins.set(count);
  }

  /**
   * Set memory usage
   */
  setMemoryUsage(bytes: number): void {
    this.memoryUsage.set({ plugin_id: this.pluginId }, bytes);
  }

  /**
   * Set CPU usage
   */
  setCpuUsage(percent: number): void {
    this.cpuUsage.set({ plugin_id: this.pluginId }, percent);
  }

  /**
   * Get metrics output
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }
}
