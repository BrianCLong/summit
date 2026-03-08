"use strict";
/**
 * Admin Routes for Rate Limit Management
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminRateLimitRouter = createAdminRateLimitRouter;
const express_1 = require("express");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
function createAdminRateLimitRouter(rateLimiter, metricsCollector) {
    const router = (0, express_1.Router)();
    /**
     * GET /admin/rate-limits/metrics
     * Get current rate limit metrics
     */
    router.get('/metrics', async (req, res) => {
        try {
            const metrics = metricsCollector.getMetrics();
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger.error({
                message: 'Failed to get rate limit metrics',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve metrics',
            });
        }
    });
    /**
     * GET /admin/rate-limits/prometheus
     * Get Prometheus-formatted metrics
     */
    router.get('/prometheus', async (req, res) => {
        try {
            const metrics = metricsCollector.getPrometheusMetrics();
            res.setHeader('Content-Type', 'text/plain');
            res.send(metrics);
        }
        catch (error) {
            logger.error({
                message: 'Failed to get Prometheus metrics',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve Prometheus metrics',
            });
        }
    });
    /**
     * GET /admin/rate-limits/violations
     * Get recent rate limit violations
     */
    router.get('/violations', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const violations = metricsCollector.getRecentViolations(limit);
            res.json({
                success: true,
                data: {
                    violations,
                    count: violations.length,
                },
            });
        }
        catch (error) {
            logger.error({
                message: 'Failed to get rate limit violations',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve violations',
            });
        }
    });
    /**
     * GET /admin/rate-limits/status/:identifier
     * Get rate limit status for specific identifier
     */
    router.get('/status/:identifier', async (req, res) => {
        try {
            const { identifier } = req.params;
            const endpoint = req.query.endpoint || '/api';
            const tier = req.query.tier;
            const state = await rateLimiter.peek(identifier, endpoint, tier);
            if (!state) {
                return res.json({
                    success: true,
                    data: {
                        identifier,
                        endpoint,
                        tier,
                        status: 'no_limits',
                        message: 'No active rate limits',
                    },
                });
            }
            res.json({
                success: true,
                data: {
                    identifier,
                    endpoint,
                    tier,
                    ...state,
                    utilizationPercent: state.limit > 0 ? (state.consumed / state.limit) * 100 : 0,
                },
            });
        }
        catch (error) {
            logger.error({
                message: 'Failed to get rate limit status',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve rate limit status',
            });
        }
    });
    /**
     * POST /admin/rate-limits/reset
     * Reset rate limit for identifier
     */
    router.post('/reset', async (req, res) => {
        try {
            const { identifier, endpoint, tier } = req.body;
            if (!identifier) {
                return res.status(400).json({
                    success: false,
                    error: 'identifier is required',
                });
            }
            await rateLimiter.reset(identifier, endpoint || '/api', tier);
            logger.info({
                message: 'Rate limit reset',
                identifier,
                endpoint,
                tier,
                adminUser: req.user?.id || 'unknown',
            });
            res.json({
                success: true,
                message: 'Rate limit reset successfully',
            });
        }
        catch (error) {
            logger.error({
                message: 'Failed to reset rate limit',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to reset rate limit',
            });
        }
    });
    /**
     * GET /admin/rate-limits/policies
     * Get all rate limit policies
     */
    router.get('/policies', async (req, res) => {
        try {
            const endpoint = req.query.endpoint || '/api';
            const tier = req.query.tier;
            const policy = rateLimiter.getPolicy(endpoint, tier);
            res.json({
                success: true,
                data: {
                    policy,
                    endpoint,
                    tier,
                },
            });
        }
        catch (error) {
            logger.error({
                message: 'Failed to get rate limit policies',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve policies',
            });
        }
    });
    /**
     * GET /admin/rate-limits/health
     * Health check for rate limiter
     */
    router.get('/health', async (req, res) => {
        try {
            const healthy = await rateLimiter.healthCheck();
            res.json({
                success: true,
                data: {
                    status: healthy ? 'healthy' : 'unhealthy',
                    redis: healthy,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            logger.error({
                message: 'Rate limiter health check failed',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Health check failed',
            });
        }
    });
    /**
     * POST /admin/rate-limits/test
     * Test rate limiting for debugging
     */
    router.post('/test', async (req, res) => {
        try {
            const { identifier, endpoint, tier, requests = 1 } = req.body;
            if (!identifier || !endpoint) {
                return res.status(400).json({
                    success: false,
                    error: 'identifier and endpoint are required',
                });
            }
            const results = [];
            for (let i = 0; i < requests; i++) {
                const state = await rateLimiter.check(identifier, endpoint, tier);
                results.push(state);
            }
            res.json({
                success: true,
                data: {
                    identifier,
                    endpoint,
                    tier,
                    requestCount: requests,
                    results,
                },
            });
        }
        catch (error) {
            logger.error({
                message: 'Rate limit test failed',
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({
                success: false,
                error: 'Test failed',
            });
        }
    });
    return router;
}
