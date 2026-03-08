"use strict";
// Conductor Circuit Breaker & Bulkhead Pattern
// Implements fault tolerance with service isolation and cascading failure prevention
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilienceConfigs = exports.conductorResilienceManager = exports.ServiceResilienceManager = exports.ResourcePool = exports.BulkheadIsolator = exports.CircuitBreaker = void 0;
exports.executeMCPCall = executeMCPCall;
exports.executeLLMCall = executeLLMCall;
exports.executeDatabaseCall = executeDatabaseCall;
const prometheus_js_1 = require("../observability/prometheus.js");
class CircuitBreaker {
    name;
    config;
    failures = 0;
    successes = 0;
    requests = 0;
    lastFailureTime = 0;
    lastSuccessTime = 0;
    nextAttemptTime = 0;
    state = 'CLOSED';
    failureTimes = [];
    constructor(name, config = {}) {
        this.name = name;
        this.config = {
            failureThreshold: 5,
            successThreshold: 3,
            timeout: 30000,
            resetTimeoutMs: 60000,
            monitoringWindowMs: 300000, // 5 minutes
            ...config,
        };
    }
    /**
     * Execute function with circuit breaker protection
     */
    async execute(fn) {
        return new Promise((resolve, reject) => {
            if (this.state === 'OPEN') {
                if (Date.now() < this.nextAttemptTime) {
                    const error = new Error(`Circuit breaker OPEN for ${this.name}`);
                    error.name = 'CircuitBreakerOpen';
                    this.recordMetrics();
                    reject(error);
                    return;
                }
                else {
                    this.state = 'HALF_OPEN';
                    this.successes = 0;
                }
            }
            this.requests++;
            const timeoutId = setTimeout(() => {
                this.onFailure();
                const error = new Error(`Circuit breaker timeout for ${this.name}`);
                error.name = 'CircuitBreakerTimeout';
                reject(error);
            }, this.config.timeout);
            fn()
                .then((result) => {
                clearTimeout(timeoutId);
                this.onSuccess();
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                this.onFailure();
                reject(error);
            });
        });
    }
    /**
     * Get current circuit breaker metrics
     */
    getMetrics() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            requests: this.requests,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            nextAttemptTime: this.nextAttemptTime,
        };
    }
    /**
     * Force circuit state change (for testing/admin)
     */
    forceState(state) {
        this.state = state;
        if (state === 'CLOSED') {
            this.failures = 0;
            this.nextAttemptTime = 0;
        }
        this.recordMetrics();
    }
    onSuccess() {
        this.lastSuccessTime = Date.now();
        this.successes++;
        if (this.state === 'HALF_OPEN') {
            if (this.successes >= this.config.successThreshold) {
                this.state = 'CLOSED';
                this.failures = 0;
                this.failureTimes = [];
            }
        }
        this.recordMetrics();
    }
    onFailure() {
        const now = Date.now();
        this.lastFailureTime = now;
        this.failures++;
        this.failureTimes.push(now);
        // Clean old failures outside monitoring window
        this.failureTimes = this.failureTimes.filter((time) => now - time < this.config.monitoringWindowMs);
        // Check if should open circuit
        if (this.failureTimes.length >= this.config.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = now + this.config.resetTimeoutMs;
        }
        this.recordMetrics();
    }
    recordMetrics() {
        // Record Prometheus metrics
        prometheus_js_1.prometheusConductorMetrics.recordSecurityEvent(`circuit_breaker_${this.state.toLowerCase()}`, true);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Bulkhead Pattern Implementation
 * Isolates resources to prevent cascading failures
 */
class BulkheadIsolator {
    pools = new Map();
    /**
     * Create or get resource pool for service
     */
    getPool(service, maxConcurrency = 10) {
        if (!this.pools.has(service)) {
            this.pools.set(service, new ResourcePool(service, maxConcurrency));
        }
        return this.pools.get(service);
    }
    /**
     * Execute function with bulkhead isolation
     */
    async executeInPool(service, fn, maxConcurrency) {
        const pool = this.getPool(service, maxConcurrency);
        return pool.execute(fn);
    }
    /**
     * Get all pool statistics
     */
    getPoolStats() {
        const stats = {};
        for (const [service, pool] of this.pools.entries()) {
            stats[service] = pool.getStats();
        }
        return stats;
    }
}
exports.BulkheadIsolator = BulkheadIsolator;
/**
 * Resource Pool for Bulkhead Pattern
 */
class ResourcePool {
    service;
    activeRequests = 0;
    queuedRequests = 0;
    maxConcurrency;
    queue = [];
    constructor(service, maxConcurrency) {
        this.service = service;
        this.maxConcurrency = maxConcurrency;
    }
    /**
     * Execute function with resource pool limiting
     */
    async execute(fn) {
        return new Promise((resolve, reject) => {
            if (this.activeRequests < this.maxConcurrency) {
                this.executeImmediate(fn, resolve, reject);
            }
            else {
                // Add to queue
                this.queue.push({ fn, resolve, reject });
                this.queuedRequests++;
                // Record queue metrics
                prometheus_js_1.prometheusConductorMetrics.recordSecurityEvent('bulkhead_queue_add', true);
            }
        });
    }
    /**
     * Get pool statistics
     */
    getStats() {
        return {
            service: this.service,
            activeRequests: this.activeRequests,
            queuedRequests: this.queuedRequests,
            maxConcurrency: this.maxConcurrency,
            utilizationPercent: (this.activeRequests / this.maxConcurrency) * 100,
        };
    }
    async executeImmediate(fn, resolve, reject) {
        this.activeRequests++;
        try {
            const result = await fn();
            resolve(result);
        }
        catch (error) {
            reject(error);
        }
        finally {
            this.activeRequests--;
            this.processQueue();
        }
    }
    processQueue() {
        if (this.queue.length > 0 && this.activeRequests < this.maxConcurrency) {
            const { fn, resolve, reject } = this.queue.shift();
            this.queuedRequests--;
            this.executeImmediate(fn, resolve, reject);
        }
    }
}
exports.ResourcePool = ResourcePool;
/**
 * Service Resilience Manager
 * Combines circuit breakers and bulkheads for comprehensive fault tolerance
 */
class ServiceResilienceManager {
    circuitBreakers = new Map();
    bulkheadIsolator = new BulkheadIsolator();
    /**
     * Execute service call with full resilience protection
     */
    async executeResillient(serviceName, operation, fn, config) {
        const cbKey = `${serviceName}_${operation}`;
        // Get or create circuit breaker
        if (!this.circuitBreakers.has(cbKey)) {
            this.circuitBreakers.set(cbKey, new CircuitBreaker(cbKey, config?.circuitBreakerConfig));
        }
        const circuitBreaker = this.circuitBreakers.get(cbKey);
        // Execute with both circuit breaker and bulkhead protection
        return circuitBreaker.execute(async () => {
            return this.bulkheadIsolator.executeInPool(serviceName, fn, config?.maxConcurrency);
        });
    }
    /**
     * Get comprehensive resilience status
     */
    getResilienceStatus() {
        const circuitBreakers = {};
        let openCircuits = 0;
        let halfOpenCircuits = 0;
        for (const [name, cb] of this.circuitBreakers.entries()) {
            const metrics = cb.getMetrics();
            circuitBreakers[name] = metrics;
            if (metrics.state === 'OPEN')
                openCircuits++;
            if (metrics.state === 'HALF_OPEN')
                halfOpenCircuits++;
        }
        const bulkheads = this.bulkheadIsolator.getPoolStats();
        // Determine overall health
        let overallHealth;
        if (openCircuits > 0) {
            overallHealth = 'critical';
        }
        else if (halfOpenCircuits > 0) {
            overallHealth = 'degraded';
        }
        else {
            overallHealth = 'healthy';
        }
        return {
            circuitBreakers,
            bulkheads,
            overallHealth,
        };
    }
    /**
     * Emergency circuit reset (admin operation)
     */
    resetAllCircuits() {
        for (const cb of this.circuitBreakers.values()) {
            cb.forceState('CLOSED');
        }
    }
}
exports.ServiceResilienceManager = ServiceResilienceManager;
// Singleton instances for conductor services
exports.conductorResilienceManager = new ServiceResilienceManager();
// Service-specific resilience configurations
exports.ResilienceConfigs = {
    MCP_GRAPHOPS: {
        circuitBreakerConfig: {
            failureThreshold: 3,
            resetTimeoutMs: 30000,
            timeout: 10000,
        },
        maxConcurrency: 5,
    },
    MCP_FILES: {
        circuitBreakerConfig: {
            failureThreshold: 5,
            resetTimeoutMs: 15000,
            timeout: 5000,
        },
        maxConcurrency: 10,
    },
    LLM_HEAVY: {
        circuitBreakerConfig: {
            failureThreshold: 3,
            resetTimeoutMs: 60000,
            timeout: 45000,
        },
        maxConcurrency: 2,
    },
    LLM_LIGHT: {
        circuitBreakerConfig: {
            failureThreshold: 10,
            resetTimeoutMs: 30000,
            timeout: 15000,
        },
        maxConcurrency: 8,
    },
    DATABASE: {
        circuitBreakerConfig: {
            failureThreshold: 5,
            resetTimeoutMs: 120000,
            timeout: 30000,
        },
        maxConcurrency: 20,
    },
};
// Utility functions for conductor integration
async function executeMCPCall(server, operation, fn) {
    const config = server === 'graphops'
        ? exports.ResilienceConfigs.MCP_GRAPHOPS
        : exports.ResilienceConfigs.MCP_FILES;
    return exports.conductorResilienceManager.executeResillient(`MCP_${server.toUpperCase()}`, operation, fn, config);
}
async function executeLLMCall(model, fn) {
    const config = model === 'heavy'
        ? exports.ResilienceConfigs.LLM_HEAVY
        : exports.ResilienceConfigs.LLM_LIGHT;
    return exports.conductorResilienceManager.executeResillient(`LLM_${model.toUpperCase()}`, 'generate', fn, config);
}
async function executeDatabaseCall(operation, fn) {
    return exports.conductorResilienceManager.executeResillient('DATABASE', operation, fn, exports.ResilienceConfigs.DATABASE);
}
