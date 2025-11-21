import { PluginTelemetry } from './PluginTelemetry.js';
import { PluginMetrics } from './PluginMetrics.js';
import {
  PluginEvent,
  UsageStats,
  PerformanceReport,
  ErrorReport,
} from './types.js';

/**
 * Unified analytics interface for plugins
 */
export class PluginAnalytics {
  private pluginId: string;
  private telemetry: PluginTelemetry;
  private metrics: PluginMetrics;
  private events: PluginEvent[] = [];
  private usageStats: Map<string, number> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.telemetry = new PluginTelemetry(pluginId);
    this.metrics = new PluginMetrics(pluginId);
  }

  /**
   * Track a user action
   */
  trackAction(action: string, properties?: Record<string, any>): void {
    this.events.push({
      type: 'action',
      name: action,
      pluginId: this.pluginId,
      timestamp: new Date(),
      properties,
    });

    // Increment usage counter
    const count = this.usageStats.get(action) || 0;
    this.usageStats.set(action, count + 1);

    // Record in telemetry
    this.telemetry.recordEvent(`action.${action}`, properties);
  }

  /**
   * Track a feature usage
   */
  trackFeature(feature: string, properties?: Record<string, any>): void {
    this.events.push({
      type: 'feature',
      name: feature,
      pluginId: this.pluginId,
      timestamp: new Date(),
      properties,
    });

    this.telemetry.recordEvent(`feature.${feature}`, properties);
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.events.push({
      type: 'error',
      name: error.name,
      pluginId: this.pluginId,
      timestamp: new Date(),
      properties: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    });

    this.metrics.recordError(error.name);
    this.telemetry.recordEvent('error', {
      error_name: error.name,
      error_message: error.message,
      ...context,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(operation: string, durationMs: number): void {
    this.metrics.recordExecutionDuration(operation, durationMs / 1000);
    this.telemetry.recordEvent(`performance.${operation}`, {
      duration_ms: durationMs,
    });
  }

  /**
   * Track API request
   */
  trackRequest(method: string, path: string, status: number, durationMs: number): void {
    this.metrics.recordRequest(method, status);
    this.metrics.recordRequestDuration(method, durationMs / 1000);
    this.telemetry.recordEvent('api_request', {
      method,
      path,
      status,
      duration_ms: durationMs,
    });
  }

  /**
   * Track resource usage
   */
  trackResourceUsage(memoryMB: number, cpuPercent: number): void {
    this.metrics.setMemoryUsage(memoryMB * 1024 * 1024);
    this.metrics.setCpuUsage(cpuPercent);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    const actionCounts: Record<string, number> = {};
    for (const [action, count] of this.usageStats.entries()) {
      actionCounts[action] = count;
    }

    return {
      pluginId: this.pluginId,
      totalEvents: this.events.length,
      actionCounts,
      errorCount: this.events.filter(e => e.type === 'error').length,
      period: {
        start: this.events[0]?.timestamp || new Date(),
        end: new Date(),
      },
    };
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(): Promise<PerformanceReport> {
    const metricsJSON = await this.metrics.getMetricsJSON();

    return {
      pluginId: this.pluginId,
      metrics: metricsJSON,
      summary: {
        totalRequests: this.events.filter(e => e.type === 'action').length,
        errorRate: this.calculateErrorRate(),
        avgResponseTime: this.calculateAvgResponseTime(),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get error report
   */
  getErrorReport(): ErrorReport {
    const errors = this.events.filter(e => e.type === 'error');
    const errorsByType: Record<string, number> = {};

    for (const error of errors) {
      const type = error.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    }

    return {
      pluginId: this.pluginId,
      totalErrors: errors.length,
      errorsByType,
      recentErrors: errors.slice(-10).map(e => ({
        name: e.name,
        message: e.properties?.message,
        timestamp: e.timestamp,
      })),
    };
  }

  /**
   * Clear collected data
   */
  clear(): void {
    this.events = [];
    this.usageStats.clear();
  }

  /**
   * Export analytics data
   */
  export(): {
    events: PluginEvent[];
    usageStats: Record<string, number>;
  } {
    return {
      events: [...this.events],
      usageStats: Object.fromEntries(this.usageStats),
    };
  }

  private calculateErrorRate(): number {
    const total = this.events.length;
    if (total === 0) return 0;
    const errors = this.events.filter(e => e.type === 'error').length;
    return (errors / total) * 100;
  }

  private calculateAvgResponseTime(): number {
    const performanceEvents = this.events.filter(
      e => e.properties?.duration_ms
    );
    if (performanceEvents.length === 0) return 0;
    const total = performanceEvents.reduce(
      (sum, e) => sum + (e.properties?.duration_ms || 0),
      0
    );
    return total / performanceEvents.length;
  }
}
