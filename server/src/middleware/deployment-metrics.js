"use strict";
/**
 * Deployment Metrics Middleware
 *
 * Tracks deployment-related metrics for monitoring and observability.
 * Integrates with Prometheus, Datadog, or custom metrics backends.
 *
 * @module middleware/deployment-metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentMetrics = void 0;
exports.requestMetricsMiddleware = requestMetricsMiddleware;
exports.createDeploymentMetrics = createDeploymentMetrics;
exports.getMetrics = getMetrics;
exports.resetMetrics = resetMetrics;
const prom_client_1 = require("prom-client");
/**
 * Deployment Metrics class
 *
 * Provides comprehensive metrics for deployments, feature flags, and health monitoring.
 */
class DeploymentMetrics {
    registry;
    enabled;
    prefix;
    // Deployment metrics
    deploymentCounter;
    deploymentDuration;
    deploymentStatus;
    // Feature flag metrics
    featureFlagEvaluations;
    featureFlagCacheHits;
    featureFlagCacheMisses;
    // Health check metrics
    healthCheckDuration;
    healthCheckStatus;
    // Release metrics
    releaseCounter;
    rollbackCounter;
    // API metrics
    requestDuration;
    requestCounter;
    errorCounter;
    constructor(config) {
        this.enabled = config.enabled;
        this.prefix = config.prefix || 'intelgraph_';
        this.registry = new prom_client_1.Registry();
        if (!this.enabled) {
            return;
        }
        this.initializeMetrics(config.labels || {});
    }
    /**
     * Initialize all metrics
     *
     * @private
     */
    initializeMetrics(defaultLabels) {
        // Set default labels (environment, version, etc.)
        this.registry.setDefaultLabels(defaultLabels);
        // Deployment metrics
        this.deploymentCounter = new prom_client_1.Counter({
            name: `${this.prefix}deployments_total`,
            help: 'Total number of deployments',
            labelNames: ['environment', 'status', 'strategy'],
            registers: [this.registry],
        });
        this.deploymentDuration = new prom_client_1.Histogram({
            name: `${this.prefix}deployment_duration_seconds`,
            help: 'Deployment duration in seconds',
            labelNames: ['environment', 'strategy'],
            buckets: [10, 30, 60, 120, 300, 600, 1800],
            registers: [this.registry],
        });
        this.deploymentStatus = new prom_client_1.Gauge({
            name: `${this.prefix}deployment_status`,
            help: 'Current deployment status (1 = success, 0 = failure)',
            labelNames: ['environment'],
            registers: [this.registry],
        });
        // Feature flag metrics
        this.featureFlagEvaluations = new prom_client_1.Counter({
            name: `${this.prefix}feature_flag_evaluations_total`,
            help: 'Total number of feature flag evaluations',
            labelNames: ['flag_key', 'result'],
            registers: [this.registry],
        });
        this.featureFlagCacheHits = new prom_client_1.Counter({
            name: `${this.prefix}feature_flag_cache_hits_total`,
            help: 'Total number of feature flag cache hits',
            registers: [this.registry],
        });
        this.featureFlagCacheMisses = new prom_client_1.Counter({
            name: `${this.prefix}feature_flag_cache_misses_total`,
            help: 'Total number of feature flag cache misses',
            registers: [this.registry],
        });
        // Health check metrics
        this.healthCheckDuration = new prom_client_1.Histogram({
            name: `${this.prefix}health_check_duration_seconds`,
            help: 'Health check duration in seconds',
            labelNames: ['check_name', 'status'],
            buckets: [0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });
        this.healthCheckStatus = new prom_client_1.Gauge({
            name: `${this.prefix}health_check_status`,
            help: 'Health check status (1 = healthy, 0 = unhealthy)',
            labelNames: ['check_name'],
            registers: [this.registry],
        });
        // Release metrics
        this.releaseCounter = new prom_client_1.Counter({
            name: `${this.prefix}releases_total`,
            help: 'Total number of releases',
            labelNames: ['type', 'branch'],
            registers: [this.registry],
        });
        this.rollbackCounter = new prom_client_1.Counter({
            name: `${this.prefix}rollbacks_total`,
            help: 'Total number of rollbacks',
            labelNames: ['environment', 'reason'],
            registers: [this.registry],
        });
        // API metrics
        this.requestDuration = new prom_client_1.Histogram({
            name: `${this.prefix}http_request_duration_seconds`,
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });
        this.requestCounter = new prom_client_1.Counter({
            name: `${this.prefix}http_requests_total`,
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        });
        this.errorCounter = new prom_client_1.Counter({
            name: `${this.prefix}errors_total`,
            help: 'Total number of errors',
            labelNames: ['type', 'code'],
            registers: [this.registry],
        });
    }
    /**
     * Record a deployment
     */
    recordDeployment(environment, status, strategy, durationSeconds) {
        if (!this.enabled)
            return;
        this.deploymentCounter.inc({ environment, status, strategy });
        this.deploymentDuration.observe({ environment, strategy }, durationSeconds);
        this.deploymentStatus.set({ environment }, status === 'success' ? 1 : 0);
    }
    /**
     * Record a feature flag evaluation
     */
    recordFeatureFlagEvaluation(flagKey, result) {
        if (!this.enabled)
            return;
        this.featureFlagEvaluations.inc({
            flag_key: flagKey,
            result: String(result),
        });
    }
    /**
     * Record feature flag cache hit
     */
    recordFeatureFlagCacheHit() {
        if (!this.enabled)
            return;
        this.featureFlagCacheHits.inc();
    }
    /**
     * Record feature flag cache miss
     */
    recordFeatureFlagCacheMiss() {
        if (!this.enabled)
            return;
        this.featureFlagCacheMisses.inc();
    }
    /**
     * Record a health check
     */
    recordHealthCheck(checkName, status, durationSeconds) {
        if (!this.enabled)
            return;
        this.healthCheckDuration.observe({ check_name: checkName, status }, durationSeconds);
        this.healthCheckStatus.set({ check_name: checkName }, status === 'healthy' ? 1 : 0);
    }
    /**
     * Record a release
     */
    recordRelease(type, branch) {
        if (!this.enabled)
            return;
        this.releaseCounter.inc({ type, branch });
    }
    /**
     * Record a rollback
     */
    recordRollback(environment, reason) {
        if (!this.enabled)
            return;
        this.rollbackCounter.inc({ environment, reason });
    }
    /**
     * Record an HTTP request
     */
    recordRequest(method, route, statusCode, durationSeconds) {
        if (!this.enabled)
            return;
        const labels = {
            method,
            route,
            status_code: statusCode.toString(),
        };
        this.requestDuration.observe(labels, durationSeconds);
        this.requestCounter.inc(labels);
    }
    /**
     * Record an error
     */
    recordError(type, code) {
        if (!this.enabled)
            return;
        this.errorCounter.inc({ type, code: code || 'unknown' });
    }
    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        if (!this.enabled)
            return '';
        return this.registry.metrics();
    }
    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        if (!this.enabled)
            return;
        this.registry.resetMetrics();
    }
    /**
     * Get the Prometheus registry
     */
    getRegistry() {
        return this.registry;
    }
}
exports.DeploymentMetrics = DeploymentMetrics;
/**
 * Express middleware for request metrics
 */
function requestMetricsMiddleware(metrics) {
    return (req, res, next) => {
        if (!metrics) {
            return next();
        }
        const start = Date.now();
        // Capture response
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route?.path || req.path;
            metrics.recordRequest(req.method, route, res.statusCode, duration);
            // Record errors for 5xx status codes
            if (res.statusCode >= 500) {
                metrics.recordError('http_error', res.statusCode.toString());
            }
        });
        next();
    };
}
/**
 * Create and configure deployment metrics
 */
function createDeploymentMetrics(config = {}) {
    const defaultConfig = {
        enabled: process.env.METRICS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
        prefix: 'intelgraph_',
        labels: {
            environment: process.env.NODE_ENV || 'development',
            version: process.env.APP_VERSION || 'unknown',
            service: 'intelgraph-api',
        },
    };
    return new DeploymentMetrics({ ...defaultConfig, ...config });
}
// Singleton instance
let metricsInstance = null;
/**
 * Get or create metrics instance
 */
function getMetrics() {
    if (!metricsInstance) {
        metricsInstance = createDeploymentMetrics();
    }
    return metricsInstance;
}
/**
 * Reset metrics instance (for testing)
 */
function resetMetrics() {
    if (metricsInstance) {
        metricsInstance.reset();
    }
    metricsInstance = null;
}
