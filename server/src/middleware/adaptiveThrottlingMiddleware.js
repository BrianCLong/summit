"use strict";
/**
 * Adaptive Throttling Middleware
 *
 * Dynamically adjusts rate limits based on system load and response times.
 * Implements token bucket with adaptive refill rate.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module middleware/adaptiveThrottlingMiddleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveThrottlingMiddleware = exports.AdaptiveThrottler = void 0;
exports.createAdaptiveThrottlingMiddleware = createAdaptiveThrottlingMiddleware;
exports.createTenantThrottlingMiddleware = createTenantThrottlingMiddleware;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'adaptive-throttle-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'AdaptiveThrottlingMiddleware',
    };
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    baseRps: 100,
    minRps: 10,
    maxRps: 500,
    bucketSize: 200,
    latencyThresholdMs: 500,
    errorRateThreshold: 0.05, // 5%
    adaptationIntervalMs: 5000,
    recoveryRate: 10,
    degradationRate: 20,
    windowSizeMs: 60000,
};
// ============================================================================
// Adaptive Throttler Implementation
// ============================================================================
class AdaptiveThrottler {
    config;
    tokens;
    lastRefill;
    currentRps;
    metrics = [];
    stats;
    adaptationTimer = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.currentRps = this.config.baseRps;
        this.tokens = this.config.bucketSize;
        this.lastRefill = Date.now();
        this.stats = {
            currentRps: this.currentRps,
            baseRps: this.config.baseRps,
            tokensAvailable: this.tokens,
            bucketSize: this.config.bucketSize,
            requestsInWindow: 0,
            errorsInWindow: 0,
            avgLatencyMs: 0,
            throttledRequests: 0,
            adaptations: 0,
            lastAdaptation: null,
            state: 'healthy',
        };
        // Start adaptation loop
        this.startAdaptationLoop();
        logger_js_1.default.info({ config: this.config }, 'AdaptiveThrottler initialized');
    }
    /**
     * Try to acquire a token for a request
     */
    tryAcquire() {
        this.refillTokens();
        if (this.tokens >= 1) {
            this.tokens--;
            this.stats.tokensAvailable = this.tokens;
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'AdaptiveThrottler',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Token acquired'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        this.stats.throttledRequests++;
        return (0, data_envelope_js_1.createDataEnvelope)(false, {
            source: 'AdaptiveThrottler',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Rate limit exceeded (${this.currentRps} rps)`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Record a completed request for adaptation metrics
     */
    recordRequest(latencyMs, error) {
        const metric = {
            timestamp: Date.now(),
            latencyMs,
            error,
        };
        this.metrics.push(metric);
        this.cleanOldMetrics();
        this.updateStats();
    }
    /**
     * Get current statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'AdaptiveThrottler',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Manually set rate (for testing or emergency override)
     */
    setRate(rps) {
        this.currentRps = Math.max(this.config.minRps, Math.min(this.config.maxRps, rps));
        this.stats.currentRps = this.currentRps;
        logger_js_1.default.info({ newRps: this.currentRps }, 'Rate manually adjusted');
    }
    /**
     * Reset to base configuration
     */
    reset() {
        this.currentRps = this.config.baseRps;
        this.tokens = this.config.bucketSize;
        this.metrics = [];
        this.stats.state = 'healthy';
        this.stats.throttledRequests = 0;
        this.stats.adaptations = 0;
        logger_js_1.default.info('AdaptiveThrottler reset to base configuration');
    }
    /**
     * Shutdown the throttler
     */
    shutdown() {
        if (this.adaptationTimer) {
            clearInterval(this.adaptationTimer);
            this.adaptationTimer = null;
        }
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const refillAmount = (elapsed / 1000) * this.currentRps;
        this.tokens = Math.min(this.config.bucketSize, this.tokens + refillAmount);
        this.lastRefill = now;
        this.stats.tokensAvailable = this.tokens;
    }
    cleanOldMetrics() {
        const cutoff = Date.now() - this.config.windowSizeMs;
        this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }
    updateStats() {
        this.stats.requestsInWindow = this.metrics.length;
        this.stats.errorsInWindow = this.metrics.filter(m => m.error).length;
        if (this.metrics.length > 0) {
            const totalLatency = this.metrics.reduce((sum, m) => sum + m.latencyMs, 0);
            this.stats.avgLatencyMs = totalLatency / this.metrics.length;
        }
        else {
            this.stats.avgLatencyMs = 0;
        }
    }
    startAdaptationLoop() {
        this.adaptationTimer = setInterval(() => {
            this.adapt();
        }, this.config.adaptationIntervalMs);
    }
    adapt() {
        this.cleanOldMetrics();
        this.updateStats();
        const errorRate = this.stats.requestsInWindow > 0
            ? this.stats.errorsInWindow / this.stats.requestsInWindow
            : 0;
        const isLatencyHigh = this.stats.avgLatencyMs > this.config.latencyThresholdMs;
        const isErrorRateHigh = errorRate > this.config.errorRateThreshold;
        let newState = 'healthy';
        let rateChange = 0;
        if (isLatencyHigh && isErrorRateHigh) {
            // Critical: Both latency and errors high
            newState = 'critical';
            rateChange = -this.config.degradationRate * 2;
        }
        else if (isLatencyHigh || isErrorRateHigh) {
            // Degraded: Either latency or errors high
            newState = 'degraded';
            rateChange = -this.config.degradationRate;
        }
        else {
            // Healthy: Slowly recover
            newState = 'healthy';
            rateChange = this.config.recoveryRate;
        }
        // Apply rate change
        const previousRps = this.currentRps;
        this.currentRps = Math.max(this.config.minRps, Math.min(this.config.maxRps, this.currentRps + rateChange));
        // Update stats
        this.stats.currentRps = this.currentRps;
        this.stats.state = newState;
        if (previousRps !== this.currentRps) {
            this.stats.adaptations++;
            this.stats.lastAdaptation = Date.now();
            logger_js_1.default.info({
                previousRps,
                newRps: this.currentRps,
                state: newState,
                errorRate,
                avgLatencyMs: this.stats.avgLatencyMs,
            }, 'Rate limit adapted');
        }
    }
}
exports.AdaptiveThrottler = AdaptiveThrottler;
// ============================================================================
// Middleware Factory
// ============================================================================
/**
 * Creates adaptive throttling middleware
 */
function createAdaptiveThrottlingMiddleware(config = {}) {
    const throttler = new AdaptiveThrottler(config);
    return function adaptiveThrottlingMiddleware(req, res, next) {
        const startTime = Date.now();
        const result = throttler.tryAcquire();
        if (!result.data) {
            const verdict = result.governanceVerdict || createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Rate limit exceeded');
            const stats = throttler.getStats().data;
            logger_js_1.default.warn({
                path: req.path,
                method: req.method,
                tenantId: req.tenantId,
                currentRps: stats.currentRps,
                state: stats.state,
                verdict: verdict.verdictId,
            }, 'Request throttled');
            // Add retry-after header
            const retryAfterSeconds = Math.ceil(1 / stats.currentRps);
            res.setHeader('Retry-After', retryAfterSeconds.toString());
            res.setHeader('X-RateLimit-Limit', stats.currentRps.toString());
            res.setHeader('X-RateLimit-Remaining', Math.floor(stats.tokensAvailable).toString());
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded, please retry later',
                retryAfterSeconds,
                currentState: stats.state,
                governanceVerdict: verdict,
            });
            return;
        }
        // Track response for adaptation
        res.on('finish', () => {
            const latencyMs = Date.now() - startTime;
            const isError = res.statusCode >= 500;
            throttler.recordRequest(latencyMs, isError);
        });
        // Add rate limit headers
        const stats = throttler.getStats().data;
        res.setHeader('X-RateLimit-Limit', stats.currentRps.toString());
        res.setHeader('X-RateLimit-Remaining', Math.floor(stats.tokensAvailable).toString());
        next();
    };
}
// ============================================================================
// Per-Tenant Throttling
// ============================================================================
class TenantThrottlerRegistry {
    throttlers = new Map();
    config;
    constructor(config = {}) {
        this.config = config;
    }
    get(tenantId) {
        let throttler = this.throttlers.get(tenantId);
        if (!throttler) {
            throttler = new AdaptiveThrottler(this.config);
            this.throttlers.set(tenantId, throttler);
        }
        return throttler;
    }
    getAllStats() {
        const allStats = new Map();
        for (const [tenantId, throttler] of this.throttlers) {
            allStats.set(tenantId, throttler.getStats().data);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(allStats, {
            source: 'TenantThrottlerRegistry',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'All tenant stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    shutdown() {
        for (const throttler of this.throttlers.values()) {
            throttler.shutdown();
        }
        this.throttlers.clear();
    }
}
/**
 * Creates per-tenant adaptive throttling middleware
 */
function createTenantThrottlingMiddleware(config = {}) {
    const registry = new TenantThrottlerRegistry(config);
    return function tenantThrottlingMiddleware(req, res, next) {
        const tenantId = req.tenantId;
        if (!tenantId) {
            // No tenant, use global throttling
            return next();
        }
        const throttler = registry.get(tenantId);
        const startTime = Date.now();
        const result = throttler.tryAcquire();
        if (!result.data) {
            const stats = throttler.getStats().data;
            res.setHeader('Retry-After', Math.ceil(1 / stats.currentRps).toString());
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Tenant rate limit exceeded',
                tenantId,
                retryAfterSeconds: Math.ceil(1 / stats.currentRps),
            });
            return;
        }
        res.on('finish', () => {
            const latencyMs = Date.now() - startTime;
            const isError = res.statusCode >= 500;
            throttler.recordRequest(latencyMs, isError);
        });
        next();
    };
}
// ============================================================================
// Exports
// ============================================================================
exports.adaptiveThrottlingMiddleware = createAdaptiveThrottlingMiddleware();
exports.default = exports.adaptiveThrottlingMiddleware;
