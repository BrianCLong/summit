"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
exports.healthRoutes = (0, express_1.Router)();
/**
 * Basic health check
 */
exports.healthRoutes.get('/', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'finance-normalizer-service',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Liveness probe - is the service running?
 */
exports.healthRoutes.get('/live', (_req, res) => {
    res.json({ status: 'live' });
});
/**
 * Readiness probe - is the service ready to accept traffic?
 */
exports.healthRoutes.get('/ready', async (_req, res) => {
    try {
        const dbHealthy = await db_js_1.db.healthCheck();
        if (!dbHealthy) {
            res.status(503).json({
                status: 'not ready',
                reason: 'Database connection failed',
            });
            return;
        }
        res.json({ status: 'ready' });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            reason: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * Detailed health check with component status
 */
exports.healthRoutes.get('/detailed', async (_req, res) => {
    const startTime = Date.now();
    const checks = {};
    // Database check
    try {
        const dbStart = Date.now();
        await db_js_1.db.query('SELECT 1');
        checks.database = {
            status: 'healthy',
            latencyMs: Date.now() - dbStart,
        };
    }
    catch (error) {
        checks.database = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    // Memory check
    const memUsage = process.memoryUsage();
    checks.memory = {
        status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'healthy' : 'warning',
    };
    // Calculate overall status
    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const hasWarning = Object.values(checks).some((c) => c.status === 'warning');
    res.status(allHealthy ? 200 : hasWarning ? 200 : 503).json({
        status: allHealthy ? 'healthy' : hasWarning ? 'degraded' : 'unhealthy',
        service: 'finance-normalizer-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks,
        totalCheckTimeMs: Date.now() - startTime,
    });
});
