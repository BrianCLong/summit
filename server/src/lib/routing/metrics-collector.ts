
import { performance } from 'perf_hooks';

// Basic in-memory data store for metrics. In a real-world scenario,
// this would be backed by a time-series database like Prometheus or InfluxDB.
const metricsStore = {
  latencies: new Map<string, number[]>(),
  requestCounts: new Map<string, number>(),
  errorCounts: new Map<string, { count: number, history: number[] }>(),
  resourceUtilization: new Map<string, any>(),
  healthChecks: new Map<string, string>(),
};

/**
 * @class MetricsCollector
 * @description Gathers and stores real-time performance and health metrics for services.
 */
class MetricsCollector {
  private static instance: MetricsCollector;

  private constructor() {}

  /**
   * Singleton instance accessor.
   * @returns {MetricsCollector} The singleton instance.
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Tracks the latency of a request for a given endpoint.
   * @param {string} endpoint - The endpoint identifier.
   * @param {number} duration - The request duration in milliseconds.
   */
  public trackLatency(endpoint: string, duration: number): void {
    if (!metricsStore.latencies.has(endpoint)) {
      metricsStore.latencies.set(endpoint, []);
    }
    const latencies = metricsStore.latencies.get(endpoint)!;
    latencies.push(duration);
    // Keep the last 100 latency measurements for averaging.
    if (latencies.length > 100) {
      latencies.shift();
    }
  }

  /**
   * Increments the request count for a given service.
   * @param {string} service - The service identifier.
   */
  public incrementRequestCount(service: string): void {
    const count = metricsStore.requestCounts.get(service) || 0;
    metricsStore.requestCounts.set(service, count + 1);
  }

  /**
   * Increments the error count for a given service and updates the sliding window.
   * @param {string} service - The service identifier.
   */
  public incrementErrorCount(service: string): void {
    if (!metricsStore.errorCounts.has(service)) {
      metricsStore.errorCounts.set(service, { count: 0, history: [] });
    }
    const errorData = metricsStore.errorCounts.get(service)!;
    errorData.count++;
    errorData.history.push(Date.now());
    // Keep the last 10 minutes of error timestamps.
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    errorData.history = errorData.history.filter(t => t > tenMinutesAgo);
  }

  /**
   * Updates the resource utilization for a service.
   * @param {string} service - The service identifier.
   * @param {any} utilization - The resource utilization data (e.g., CPU, memory).
   */
  public updateResourceUtilization(service: string, utilization: any): void {
    metricsStore.resourceUtilization.set(service, utilization);
  }

  /**
   * Updates the health check status for a service.
   * @param {string} service - The service identifier.
   * @param {string} status - The health status (e.g., 'UP', 'DOWN').
   */
  public updateHealthCheckStatus(service: string, status: string): void {
    metricsStore.healthChecks.set(service, status);
  }

  /**
   * Retrieves all collected metrics.
   * @returns {object} The collected metrics.
   */
  public getMetrics(): object {
    return {
      latencies: Object.fromEntries(metricsStore.latencies),
      requestCounts: Object.fromEntries(metricsStore.requestCounts),
      errorCounts: Object.fromEntries(metricsStore.errorCounts),
      resourceUtilization: Object.fromEntries(metricsStore.resourceUtilization),
      healthChecks: Object.fromEntries(metricsStore.healthChecks),
    };
  }

  /**
   * Resets the internal state of the metrics store. For testing purposes only.
   * @private
   */
  public _resetForTesting(): void {
    metricsStore.latencies.clear();
    metricsStore.requestCounts.clear();
    metricsStore.errorCounts.clear();
    metricsStore.resourceUtilization.clear();
    metricsStore.healthChecks.clear();
  }
}

export default MetricsCollector.getInstance();
