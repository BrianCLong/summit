"use strict";
/**
 * Health Check Routes
 * Standard health endpoints for Kubernetes probes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const config_js_1 = require("../config.js");
exports.healthRoutes = (0, express_1.Router)();
/**
 * Basic health check - always returns 200 if server is running
 */
exports.healthRoutes.get('/', (req, res) => {
    const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: config_js_1.config.serviceName,
        version: process.env.npm_package_version || '0.0.0',
    };
    res.json(status);
});
/**
 * Readiness probe - checks if service can accept traffic
 */
exports.healthRoutes.get('/ready', async (req, res) => {
    const checks = {};
    let allHealthy = true;
    // Check OPA connectivity
    try {
        const start = Date.now();
        const response = await fetch(`${config_js_1.config.opaUrl}/health`, {
            signal: AbortSignal.timeout(2000),
        });
        checks.opa = {
            status: response.ok ? 'pass' : 'fail',
            latency: Date.now() - start,
        };
        if (!response.ok)
            allHealthy = false;
    }
    catch (error) {
        checks.opa = {
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
        allHealthy = false;
    }
    const status = {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        service: config_js_1.config.serviceName,
        version: process.env.npm_package_version || '0.0.0',
        checks,
    };
    res.status(allHealthy ? 200 : 503).json(status);
});
/**
 * Liveness probe - checks if service should be restarted
 */
exports.healthRoutes.get('/live', (req, res) => {
    // Basic liveness - just confirm the event loop is working
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Detailed health - for debugging
 */
exports.healthRoutes.get('/detailed', async (req, res) => {
    const checks = {};
    // Memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
        status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'pass' : 'fail',
        message: `Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    };
    // Uptime
    checks.uptime = {
        status: 'pass',
        message: `${Math.round(process.uptime())} seconds`,
    };
    // OPA
    try {
        const start = Date.now();
        const response = await fetch(`${config_js_1.config.opaUrl}/health`, {
            signal: AbortSignal.timeout(2000),
        });
        checks.opa = {
            status: response.ok ? 'pass' : 'fail',
            latency: Date.now() - start,
        };
    }
    catch (error) {
        checks.opa = {
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    const allHealthy = Object.values(checks).every((c) => c.status === 'pass');
    res.json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        service: config_js_1.config.serviceName,
        version: process.env.npm_package_version || '0.0.0',
        environment: config_js_1.config.nodeEnv,
        checks,
    });
});
