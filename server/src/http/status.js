"use strict";
// Operational Status Matrix Endpoint
// Provides comprehensive system health and status information
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRouter = void 0;
const express_1 = __importDefault(require("express"));
const os_1 = __importDefault(require("os"));
const budget_control_js_1 = require("../conductor/admission/budget-control.js");
const index_js_1 = require("../conductor/metrics/index.js");
const ioredis_1 = __importDefault(require("ioredis"));
exports.statusRouter = express_1.default.Router();
// Ping helper function
async function ping(target) {
    const startTime = Date.now();
    try {
        if (target.startsWith('http')) {
            // HTTP health check
            const response = await fetch(target, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            const responseTime = Date.now() - startTime;
            if (response.ok) {
                let details = {};
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        details = await response.json();
                    }
                }
                catch {
                    // Ignore JSON parsing errors
                }
                return {
                    status: 'healthy',
                    response_time_ms: responseTime,
                    details,
                };
            }
            else {
                return {
                    status: 'unhealthy',
                    response_time_ms: responseTime,
                    details: {
                        status_code: response.status,
                        status_text: response.statusText,
                    },
                };
            }
        }
        else {
            // Database connection check
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                response_time_ms: responseTime,
                details: { type: 'database_connection' },
            };
        }
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            status: 'unhealthy',
            response_time_ms: responseTime,
            details: { error: error.message },
        };
    }
}
// Get system resource usage
function getSystemUsage() {
    const totalMemory = os_1.default.totalmem();
    const freeMemory = os_1.default.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    // Get CPU usage (simplified)
    const cpus = os_1.default.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    }
    const cpuUsage = 100 - (100 * totalIdle) / totalTick;
    return {
        cpu_usage: Math.round(cpuUsage * 100) / 100,
        memory_usage: Math.round(memoryUsage * 100) / 100,
    };
}
// Get budget status
async function getBudgetStatus() {
    try {
        const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        const budgetController = (0, budget_control_js_1.createBudgetController)(redis);
        const status = await budgetController.getBudgetStatus();
        redis.disconnect();
        return status;
    }
    catch (error) {
        return {
            error: error.message,
            status: 'unknown',
        };
    }
}
// Main status endpoint
exports.statusRouter.get('/status', async (_req, res) => {
    const startTime = Date.now();
    try {
        // Get system information
        const uptime = process.uptime();
        const systemUsage = getSystemUsage();
        // Check all services concurrently
        const serviceChecks = await Promise.allSettled([
            ping('http://neo4j:7474').then((result) => ({
                name: 'neo4j',
                ...result,
            })),
            ping('http://postgres:5432').then((result) => ({
                name: 'postgres',
                ...result,
            })),
            ping('http://redis:6379').then((result) => ({
                name: 'redis',
                ...result,
            })),
            ping('http://mcp-graphops:8081/health').then((result) => ({
                name: 'mcp_graphops',
                ...result,
            })),
            ping('http://mcp-files:8082/health').then((result) => ({
                name: 'mcp_files',
                ...result,
            })),
            ping('http://opa:8181/health').then((result) => ({
                name: 'opa',
                ...result,
            })),
        ]);
        // Process service results
        const services = serviceChecks.map((result, index) => {
            const serviceNames = [
                'neo4j',
                'postgres',
                'redis',
                'mcp_graphops',
                'mcp_files',
                'opa',
            ];
            const serviceName = serviceNames[index];
            if (result.status === 'fulfilled') {
                return {
                    name: serviceName,
                    status: result.value.status,
                    response_time_ms: result.value.response_time_ms,
                    details: result.value.details,
                    last_check: new Date().toISOString(),
                };
            }
            else {
                return {
                    name: serviceName,
                    status: 'unhealthy',
                    details: { error: result.reason?.message || 'Unknown error' },
                    last_check: new Date().toISOString(),
                };
            }
        });
        // Get conductor-specific status
        const conductorEnabled = process.env.CONDUCTOR_ENABLED === 'true';
        let conductorHealth = { status: 'disabled' };
        let budgetStatus = { status: 'disabled' };
        if (conductorEnabled) {
            try {
                conductorHealth = await (0, index_js_1.getConductorHealth)();
                budgetStatus = await getBudgetStatus();
            }
            catch (error) {
                conductorHealth = { status: 'error', error: error.message };
                budgetStatus = { status: 'error', error: error.message };
            }
        }
        // Determine overall status
        const unhealthyServices = services.filter((s) => s.status === 'unhealthy');
        const degradedServices = services.filter((s) => s.status === 'degraded');
        let overallStatus;
        if (unhealthyServices.length > 0) {
            overallStatus = 'unhealthy';
        }
        else if (degradedServices.length > 0 ||
            budgetStatus.status === 'degraded') {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'healthy';
        }
        // Build response
        const status = {
            timestamp: new Date().toISOString(),
            host: os_1.default.hostname(),
            uptime_seconds: Math.round(uptime),
            versions: {
                server: process.env.BUILD_SHA || process.env.npm_package_version || 'unknown',
                policy: process.env.POLICY_SHA || 'unknown',
                node: process.version,
            },
            system: {
                ...systemUsage,
            },
            services,
            conductor: {
                enabled: conductorEnabled,
                budget: budgetStatus,
                health: conductorHealth,
            },
            overall_status: overallStatus,
        };
        // Set appropriate HTTP status code
        const httpStatus = overallStatus === 'healthy'
            ? 200
            : overallStatus === 'degraded'
                ? 200
                : 503;
        // Add performance headers
        const responseTime = Date.now() - startTime;
        res.set({
            'X-Response-Time': `${responseTime}ms`,
            'X-Conductor-Status': overallStatus,
            'X-Conductor-Version': status.versions.server,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.status(httpStatus).json(status);
    }
    catch (error) {
        console.error('Status endpoint error:', error);
        res.status(500).json({
            timestamp: new Date().toISOString(),
            host: os_1.default.hostname(),
            overall_status: 'unhealthy',
            error: 'Internal status check error',
            details: error.message,
        });
    }
});
// Minimal health check endpoint
exports.statusRouter.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Kubernetes-style readiness probe
exports.statusRouter.get('/ready', async (_req, res) => {
    try {
        const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
        const pool = getPostgresPool();
        await pool.query('SELECT 1');
    }
    catch (e) {
        return res.status(503).json({
            status: 'unready',
            component: 'postgres',
            error: e?.message || String(e),
        });
    }
    try {
        const { getRedisClient } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
        const redis = getRedisClient();
        if (redis) {
            await redis.ping();
        }
    }
    catch (e) {
        return res.status(503).json({
            status: 'unready',
            component: 'redis',
            error: e?.message || String(e),
        });
    }
    return res
        .status(200)
        .json({ status: 'ready', timestamp: new Date().toISOString() });
});
// Conductor-specific health endpoint
exports.statusRouter.get('/health/conductor', async (_req, res) => {
    try {
        const health = await (0, index_js_1.getConductorHealth)();
        const httpStatus = health.status === 'healthy'
            ? 200
            : health.status === 'degraded'
                ? 200
                : 503;
        res.status(httpStatus).json({
            status: health.status,
            timestamp: new Date().toISOString(),
            checks: health.checks,
            conductor_enabled: process.env.CONDUCTOR_ENABLED === 'true',
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            conductor_enabled: process.env.CONDUCTOR_ENABLED === 'true',
        });
    }
});
// Budget status endpoint
exports.statusRouter.get('/status/budget', async (_req, res) => {
    try {
        const budgetStatus = await getBudgetStatus();
        const httpStatus = budgetStatus.status === 'healthy'
            ? 200
            : budgetStatus.status === 'warning'
                ? 200
                : budgetStatus.status === 'degraded'
                    ? 200
                    : 503;
        res.status(httpStatus).json({
            timestamp: new Date().toISOString(),
            ...budgetStatus,
        });
    }
    catch (error) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message,
        });
    }
});
// Service-specific health endpoints
exports.statusRouter.get('/health/:service', async (req, res) => {
    const { service } = req.params;
    const serviceEndpoints = {
        neo4j: 'http://neo4j:7474',
        postgres: 'http://postgres:5432',
        redis: 'http://redis:6379',
        'mcp-graphops': 'http://mcp-graphops:8081/health',
        'mcp-files': 'http://mcp-files:8082/health',
        opa: 'http://opa:8181/health',
    };
    const endpoint = serviceEndpoints[service];
    if (!endpoint) {
        return res.status(404).json({
            error: 'Service not found',
            available_services: Object.keys(serviceEndpoints),
        });
    }
    try {
        const result = await ping(endpoint);
        const httpStatus = result.status === 'healthy' ? 200 : 503;
        res.status(httpStatus).json({
            service,
            timestamp: new Date().toISOString(),
            ...result,
        });
    }
    catch (error) {
        res.status(503).json({
            service,
            timestamp: new Date().toISOString(),
            status: 'unhealthy',
            error: error.message,
        });
    }
});
