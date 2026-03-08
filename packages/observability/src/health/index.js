"use strict";
/**
 * CompanyOS Observability SDK - Health Check Module
 *
 * Provides standardized health check endpoints and dependency monitoring
 * following Kubernetes probe conventions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeHealth = initializeHealth;
exports.registerHealthCheck = registerHealthCheck;
exports.unregisterHealthCheck = unregisterHealthCheck;
exports.runHealthChecks = runHealthChecks;
exports.livenessCheck = livenessCheck;
exports.readinessCheck = readinessCheck;
exports.createPostgresHealthCheck = createPostgresHealthCheck;
exports.createRedisHealthCheck = createRedisHealthCheck;
exports.createNeo4jHealthCheck = createNeo4jHealthCheck;
exports.createHttpHealthCheck = createHttpHealthCheck;
exports.createMemoryHealthCheck = createMemoryHealthCheck;
exports.createDiskHealthCheck = createDiskHealthCheck;
exports.createHealthRoutes = createHealthRoutes;
const healthChecks = new Map();
let serviceConfig = null;
let startTime = Date.now();
/**
 * Initialize health check system
 */
function initializeHealth(config) {
    serviceConfig = config;
    startTime = Date.now();
}
/**
 * Register a health check
 */
function registerHealthCheck(name, check) {
    healthChecks.set(name, check);
}
/**
 * Unregister a health check
 */
function unregisterHealthCheck(name) {
    healthChecks.delete(name);
}
// =============================================================================
// HEALTH CHECK EXECUTION
// =============================================================================
/**
 * Run all health checks and return a report
 */
async function runHealthChecks() {
    const checks = [];
    let overallStatus = 'healthy';
    for (const [name, checkFn] of healthChecks) {
        try {
            const start = Date.now();
            const result = await Promise.race([
                checkFn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000)),
            ]);
            result.latency_ms = Date.now() - start;
            result.lastCheck = new Date().toISOString();
            checks.push(result);
            if (result.status === 'unhealthy') {
                overallStatus = 'unhealthy';
            }
            else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
                overallStatus = 'degraded';
            }
        }
        catch (error) {
            checks.push({
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error',
                lastCheck: new Date().toISOString(),
            });
            overallStatus = 'unhealthy';
        }
    }
    return {
        status: overallStatus,
        service: serviceConfig?.name || 'unknown',
        version: serviceConfig?.version || 'unknown',
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        checks,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Simple liveness check (is the process running?)
 */
function livenessCheck() {
    return { status: 'ok' };
}
/**
 * Readiness check (is the service ready to accept traffic?)
 */
async function readinessCheck() {
    return runHealthChecks();
}
// =============================================================================
// COMMON HEALTH CHECK FACTORIES
// =============================================================================
/**
 * Create a PostgreSQL health check
 */
function createPostgresHealthCheck(pool, name = 'postgres') {
    return async () => {
        try {
            await pool.query('SELECT 1');
            return { name, status: 'healthy' };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    };
}
/**
 * Create a Redis health check
 */
function createRedisHealthCheck(client, name = 'redis') {
    return async () => {
        try {
            const result = await client.ping();
            if (result === 'PONG') {
                return { name, status: 'healthy' };
            }
            return { name, status: 'degraded', message: `Unexpected response: ${result}` };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    };
}
/**
 * Create a Neo4j health check
 */
function createNeo4jHealthCheck(driver, name = 'neo4j') {
    return async () => {
        try {
            await driver.verifyConnectivity();
            return { name, status: 'healthy' };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    };
}
/**
 * Create an HTTP dependency health check
 */
function createHttpHealthCheck(url, name, options = {}) {
    const { timeout = 3000, expectedStatus = 200 } = options;
    return async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.status === expectedStatus) {
                return { name, status: 'healthy' };
            }
            return {
                name,
                status: 'degraded',
                message: `Unexpected status: ${response.status}`,
            };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Request failed',
            };
        }
    };
}
/**
 * Create a memory health check
 */
function createMemoryHealthCheck(thresholdPercent = 90, name = 'memory') {
    return async () => {
        const used = process.memoryUsage();
        const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
        if (heapUsedPercent > thresholdPercent) {
            return {
                name,
                status: 'degraded',
                message: `Heap usage at ${heapUsedPercent.toFixed(1)}% (threshold: ${thresholdPercent}%)`,
            };
        }
        return { name, status: 'healthy' };
    };
}
/**
 * Create a disk space health check
 */
function createDiskHealthCheck(path = '/', thresholdPercent = 90, name = 'disk') {
    return async () => {
        try {
            // This would need a proper disk check implementation
            // For now, return healthy as a placeholder
            return { name, status: 'healthy' };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Disk check failed',
            };
        }
    };
}
/**
 * Create Express route handlers for health endpoints
 */
function createHealthRoutes() {
    return {
        liveness: (_req, res) => {
            res.status(200).json(livenessCheck());
        },
        readiness: async (_req, res) => {
            const report = await readinessCheck();
            const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(report);
        },
        detailed: async (_req, res) => {
            const report = await runHealthChecks();
            const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(report);
        },
    };
}
