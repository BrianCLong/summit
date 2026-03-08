"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Basic in-memory data store for metrics. In a real-world scenario,
// this would be backed by a time-series database like Prometheus or InfluxDB.
const metricsStore = {
    latencies: new Map(),
    requestCounts: new Map(),
    errorCounts: new Map(),
    resourceUtilization: new Map(),
    healthChecks: new Map(),
};
/**
 * @class MetricsCollector
 * @description Gathers and stores real-time performance and health metrics for services.
 */
class MetricsCollector {
    static instance;
    constructor() { }
    /**
     * Singleton instance accessor.
     * @returns {MetricsCollector} The singleton instance.
     */
    static getInstance() {
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
    trackLatency(endpoint, duration) {
        if (!metricsStore.latencies.has(endpoint)) {
            metricsStore.latencies.set(endpoint, []);
        }
        const latencies = metricsStore.latencies.get(endpoint);
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
    incrementRequestCount(service) {
        const count = metricsStore.requestCounts.get(service) || 0;
        metricsStore.requestCounts.set(service, count + 1);
    }
    /**
     * Increments the error count for a given service and updates the sliding window.
     * @param {string} service - The service identifier.
     */
    incrementErrorCount(service) {
        if (!metricsStore.errorCounts.has(service)) {
            metricsStore.errorCounts.set(service, { count: 0, history: [] });
        }
        const errorData = metricsStore.errorCounts.get(service);
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
    updateResourceUtilization(service, utilization) {
        metricsStore.resourceUtilization.set(service, utilization);
    }
    /**
     * Updates the health check status for a service.
     * @param {string} service - The service identifier.
     * @param {string} status - The health status (e.g., 'UP', 'DOWN').
     */
    updateHealthCheckStatus(service, status) {
        metricsStore.healthChecks.set(service, status);
    }
    /**
     * Retrieves all collected metrics.
     * @returns {object} The collected metrics.
     */
    getMetrics() {
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
    _resetForTesting() {
        metricsStore.latencies.clear();
        metricsStore.requestCounts.clear();
        metricsStore.errorCounts.clear();
        metricsStore.resourceUtilization.clear();
        metricsStore.healthChecks.clear();
    }
}
exports.default = MetricsCollector.getInstance();
