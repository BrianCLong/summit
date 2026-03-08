"use strict";
/**
 * Health Check System
 *
 * Comprehensive health checks for the Audit Black Box Service.
 * Implements Kubernetes liveness, readiness, and startup probes.
 *
 * Features:
 * - Component-level health status
 * - Dependency health (PostgreSQL, Redis, HSM)
 * - Degraded state detection
 * - Detailed diagnostics endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthChecker = void 0;
exports.createStandardHealthChecks = createStandardHealthChecks;
exports.createHealthHandlers = createHealthHandlers;
const events_1 = require("events");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    version: process.env.SERVICE_VERSION || '1.0.0',
    checkIntervalMs: 30000, // 30 seconds
    unhealthyThreshold: 3,
    degradedThreshold: 1,
    startupGracePeriodMs: 60000, // 1 minute
};
/**
 * Health Checker
 */
class HealthChecker extends events_1.EventEmitter {
    config;
    startTime;
    healthChecks = new Map();
    lastResults = new Map();
    failureCounts = new Map();
    checkTimer;
    startupComplete = false;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startTime = new Date();
    }
    /**
     * Register a health check
     */
    registerCheck(name, check) {
        this.healthChecks.set(name, check);
        this.failureCounts.set(name, 0);
    }
    /**
     * Unregister a health check
     */
    unregisterCheck(name) {
        this.healthChecks.delete(name);
        this.lastResults.delete(name);
        this.failureCounts.delete(name);
    }
    /**
     * Start periodic health checks
     */
    start() {
        this.checkTimer = setInterval(async () => {
            await this.runAllChecks();
        }, this.config.checkIntervalMs);
        // Run initial check
        this.runAllChecks().catch(console.error);
        // Set startup complete after grace period
        setTimeout(() => {
            this.startupComplete = true;
            this.emit('startupComplete');
        }, this.config.startupGracePeriodMs);
    }
    /**
     * Stop health checks
     */
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
    }
    /**
     * Run all registered health checks
     */
    async runAllChecks() {
        const results = [];
        for (const [name, check] of this.healthChecks) {
            try {
                const start = Date.now();
                const result = await check();
                result.latencyMs = Date.now() - start;
                result.lastChecked = new Date();
                // Update failure count
                if (result.status === 'unhealthy') {
                    const count = (this.failureCounts.get(name) || 0) + 1;
                    this.failureCounts.set(name, count);
                }
                else {
                    this.failureCounts.set(name, 0);
                }
                this.lastResults.set(name, result);
                results.push(result);
            }
            catch (error) {
                const failureResult = {
                    name,
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Check failed',
                    lastChecked: new Date(),
                };
                this.lastResults.set(name, failureResult);
                results.push(failureResult);
                const count = (this.failureCounts.get(name) || 0) + 1;
                this.failureCounts.set(name, count);
            }
        }
        const health = this.calculateOverallHealth(results);
        this.emit('healthChecked', health);
        return health;
    }
    /**
     * Get current health status
     */
    async getHealth() {
        // Use cached results if recent
        const results = Array.from(this.lastResults.values());
        if (results.length === 0 || this.isStale(results)) {
            return this.runAllChecks();
        }
        return this.calculateOverallHealth(results);
    }
    /**
     * Kubernetes liveness probe
     * Returns true if the service is running and not deadlocked
     */
    async isLive() {
        // Basic liveness - service is running
        return true;
    }
    /**
     * Kubernetes readiness probe
     * Returns true if the service can accept traffic
     */
    async isReady() {
        const health = await this.getHealth();
        return health.status !== 'unhealthy';
    }
    /**
     * Kubernetes startup probe
     * Returns true once initial startup is complete
     */
    async isStartupComplete() {
        if (!this.startupComplete) {
            return false;
        }
        // Check that at least one health check has passed
        const results = Array.from(this.lastResults.values());
        return results.some((r) => r.status !== 'unhealthy');
    }
    /**
     * Get detailed diagnostics
     */
    async getDiagnostics() {
        const health = await this.getHealth();
        const failureRates = {};
        const averageLatencies = {};
        for (const [name, count] of this.failureCounts) {
            failureRates[name] = count;
        }
        for (const [name, result] of this.lastResults) {
            if (result.latencyMs) {
                averageLatencies[name] = result.latencyMs;
            }
        }
        return {
            health,
            metrics: {
                checkCount: this.healthChecks.size,
                failureRates,
                averageLatencies,
            },
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
            },
        };
    }
    /**
     * Calculate overall health status
     */
    calculateOverallHealth(components) {
        const unhealthyCount = components.filter((c) => c.status === 'unhealthy').length;
        const degradedCount = components.filter((c) => c.status === 'degraded').length;
        let status = 'healthy';
        if (unhealthyCount > 0) {
            // Check if any critical components are unhealthy
            const criticalUnhealthy = components.some((c) => c.status === 'unhealthy' &&
                ['database', 'redis', 'hashchain'].includes(c.name));
            status = criticalUnhealthy ? 'unhealthy' : 'degraded';
        }
        else if (degradedCount > 0) {
            status = 'degraded';
        }
        return {
            status,
            timestamp: new Date(),
            uptime: Date.now() - this.startTime.getTime(),
            version: this.config.version,
            components,
            checks: {
                live: true,
                ready: status !== 'unhealthy',
                startup: this.startupComplete,
            },
        };
    }
    /**
     * Check if results are stale
     */
    isStale(results) {
        const now = Date.now();
        const threshold = this.config.checkIntervalMs * 2;
        return results.some((r) => now - r.lastChecked.getTime() > threshold);
    }
}
exports.HealthChecker = HealthChecker;
/**
 * Create standard health checks for the audit service
 */
function createStandardHealthChecks(dependencies) {
    const checks = new Map();
    // Database health check
    if (dependencies.db) {
        checks.set('database', async () => {
            try {
                const start = Date.now();
                await dependencies.db.query('SELECT 1');
                return {
                    name: 'database',
                    status: 'healthy',
                    latencyMs: Date.now() - start,
                    lastChecked: new Date(),
                };
            }
            catch (error) {
                return {
                    name: 'database',
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Database check failed',
                    lastChecked: new Date(),
                };
            }
        });
    }
    // Redis health check
    if (dependencies.redis) {
        checks.set('redis', async () => {
            try {
                const start = Date.now();
                const result = await dependencies.redis.ping();
                return {
                    name: 'redis',
                    status: result === 'PONG' ? 'healthy' : 'degraded',
                    latencyMs: Date.now() - start,
                    lastChecked: new Date(),
                };
            }
            catch (error) {
                return {
                    name: 'redis',
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Redis check failed',
                    lastChecked: new Date(),
                };
            }
        });
    }
    // Hash chain integrity check
    if (dependencies.hashChain) {
        checks.set('hashchain', async () => {
            try {
                const start = Date.now();
                const valid = await dependencies.hashChain.verifyLatest();
                return {
                    name: 'hashchain',
                    status: valid ? 'healthy' : 'unhealthy',
                    latencyMs: Date.now() - start,
                    message: valid ? undefined : 'Hash chain integrity check failed',
                    lastChecked: new Date(),
                };
            }
            catch (error) {
                return {
                    name: 'hashchain',
                    status: 'unhealthy',
                    message: error instanceof Error ? error.message : 'Hash chain check failed',
                    lastChecked: new Date(),
                };
            }
        });
    }
    // Memory usage check
    checks.set('memory', async () => {
        const usage = process.memoryUsage();
        const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
        let status = 'healthy';
        if (heapUsedPercent > 90) {
            status = 'unhealthy';
        }
        else if (heapUsedPercent > 75) {
            status = 'degraded';
        }
        return {
            name: 'memory',
            status,
            lastChecked: new Date(),
            details: {
                heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
                heapUsedPercent: Math.round(heapUsedPercent),
                externalMB: Math.round(usage.external / 1024 / 1024),
                rssMB: Math.round(usage.rss / 1024 / 1024),
            },
        };
    });
    // Event loop health check
    checks.set('eventloop', async () => {
        return new Promise((resolve) => {
            const start = Date.now();
            setImmediate(() => {
                const latency = Date.now() - start;
                let status = 'healthy';
                if (latency > 100) {
                    status = 'unhealthy';
                }
                else if (latency > 50) {
                    status = 'degraded';
                }
                resolve({
                    name: 'eventloop',
                    status,
                    latencyMs: latency,
                    lastChecked: new Date(),
                });
            });
        });
    });
    return checks;
}
/**
 * Create HTTP health check handlers for Express
 */
function createHealthHandlers(checker) {
    return {
        live: async (_req, res) => {
            const isLive = await checker.isLive();
            res.status(isLive ? 200 : 503).json({ live: isLive });
        },
        ready: async (_req, res) => {
            const isReady = await checker.isReady();
            res.status(isReady ? 200 : 503).json({ ready: isReady });
        },
        startup: async (_req, res) => {
            const isStarted = await checker.isStartupComplete();
            res.status(isStarted ? 200 : 503).json({ startup: isStarted });
        },
        health: async (_req, res) => {
            const health = await checker.getHealth();
            const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(health);
        },
        diagnostics: async (_req, res) => {
            const diagnostics = await checker.getDiagnostics();
            res.status(200).json(diagnostics);
        },
    };
}
