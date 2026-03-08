"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const adaptive_router_js_1 = __importDefault(require("./adaptive-router.js"));
const metrics_collector_js_1 = __importDefault(require("./metrics-collector.js"));
/**
 * @class LoadBalancer
 * @description A comprehensive load balancer that integrates metrics collection, predictive analysis, and adaptive routing.
 */
class LoadBalancer {
    static instance;
    backends = [];
    router = adaptive_router_js_1.default.getInstance();
    metrics = metrics_collector_js_1.default.getInstance();
    healthCheckInterval = null;
    metricsUpdateInterval = null;
    stickySessions = new Map();
    constructor() { }
    /**
     * Singleton instance accessor.
     * @returns {LoadBalancer} The singleton instance.
     */
    static getInstance() {
        if (!LoadBalancer.instance) {
            LoadBalancer.instance = new LoadBalancer();
        }
        return LoadBalancer.instance;
    }
    /**
     * Initializes the load balancer with a set of backends and starts health checks.
     * @param {Backend[]} initialBackends - The initial list of backends.
     */
    initialize(initialBackends) {
        this.backends = initialBackends;
        this.router.updateBackends(this.backends);
        this.startHealthChecks();
        this.startMetricsUpdates();
    }
    /**
     * Selects the next backend to handle a request, based on the chosen routing strategy.
     * @param {string} strategy - The routing strategy to use.
     * @param {string} [sessionId] - An optional session ID for sticky sessions.
     * @returns {Backend | null} The selected backend.
     */
    getNextBackend(strategy, sessionId) {
        if (sessionId && this.stickySessions.has(sessionId)) {
            const backendId = this.stickySessions.get(sessionId);
            const backend = this.backends.find((b) => b.id === backendId && b.status === 'UP');
            if (backend) {
                return backend;
            }
        }
        const backend = this.router[strategy]();
        if (backend && sessionId) {
            this.stickySessions.set(sessionId, backend.id);
        }
        return backend;
    }
    /**
     * Starts periodic health checks for all backends.
     */
    startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(() => {
            this.backends.forEach((backend) => {
                // In a real implementation, this would be an actual health check (e.g., a TCP ping or an HTTP request).
                const isHealthy = Math.random() > 0.1; // 90% chance of being healthy.
                backend.status = isHealthy ? 'UP' : 'DOWN';
                this.metrics.updateHealthCheckStatus(backend.id, backend.status);
            });
            this.router.updateBackends(this.backends);
        }, 10000); // Check every 10 seconds.
    }
    /**
     * Stops all periodic tasks.
     */
    shutdown() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
        }
    }
    /**
     * Starts periodic updates of backend metrics.
     */
    startMetricsUpdates() {
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
        }
        this.metricsUpdateInterval = setInterval(() => {
            this.updateBackendMetrics();
        }, 5000); // Update every 5 seconds.
    }
    /**
     * Updates backend properties with the latest metrics.
     */
    updateBackendMetrics() {
        const metrics = this.metrics.getMetrics();
        this.backends.forEach((backend) => {
            const backendLatencies = metrics.latencies[backend.id];
            if (backendLatencies && backendLatencies.length > 0) {
                const avgLatency = backendLatencies.reduce((a, b) => a + b, 0) /
                    backendLatencies.length;
                backend.latency = avgLatency;
            }
            // In a real implementation, we would also update connections from a reliable source.
        });
        this.router.updateBackends(this.backends);
    }
    /**
     * Adds a new backend to the pool.
     * @param {Backend} backend - The backend to add.
     */
    addBackend(backend) {
        this.backends.push(backend);
        this.router.updateBackends(this.backends);
    }
    /**
     * Gracefully removes a backend from the pool.
     * @param {string} backendId - The ID of the backend to remove.
     */
    removeBackend(backendId) {
        this.backends = this.backends.filter((b) => b.id !== backendId);
        this.router.updateBackends(this.backends);
    }
    /**
     * Placeholder for connection pooling.
     * @param {string} backendId - The ID of the backend.
     * @returns {any} A connection from the pool.
     */
    getConnection(_backendId) {
        // In a real implementation, this would manage a pool of connections.
        return { status: 'connected' };
    }
    /**
     * Placeholder for request queuing during overload.
     * @param {any} request - The request to queue.
     */
    queueRequest(_request) {
        // In a real implementation, this would add the request to a queue.
    }
}
exports.default = LoadBalancer.getInstance();
