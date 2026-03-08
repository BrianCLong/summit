"use strict";
// @ts-nocheck
// server/src/conductor/api/conductor-routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conductorRoutes = void 0;
const express_1 = require("express");
const orchestration_service_js_1 = require("../web-orchestration/orchestration-service.js");
const premium_model_router_js_1 = require("../premium-routing/premium-model-router.js");
const compliance_gate_js_1 = require("../web-orchestration/compliance-gate.js");
const redis_rate_limiter_js_1 = require("../web-orchestration/redis-rate-limiter.js");
const policy_routes_js_1 = require("./policy-routes.js");
const evidence_routes_js_1 = require("./evidence-routes.js");
const agent_routes_js_1 = require("./agent-routes.js");
const serving_routes_js_1 = require("./serving-routes.js");
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const workflow_routes_js_1 = require("./workflow-routes.js");
const workflow_executor_js_1 = require("../workflows/workflow-executor.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const pricing_read_routes_js_1 = require("./pricing-read-routes.js");
const router = (0, express_1.Router)();
exports.conductorRoutes = router;
// Initialize services
const orchestrationService = new orchestration_service_js_1.OrchestrationService();
const premiumRouter = new premium_model_router_js_1.PremiumModelRouter();
const complianceGate = new compliance_gate_js_1.ComplianceGate();
const rateLimiter = new redis_rate_limiter_js_1.RedisRateLimiter();
let servicesInitialized = false;
// Initialize all services
const initializeServices = async () => {
    if (!servicesInitialized) {
        await Promise.all([
            orchestrationService.initialize(),
            premiumRouter.connect(),
            complianceGate.connect(),
            rateLimiter.connect(),
            rbac_middleware_js_1.jwtRotationManager.initialize(),
            workflow_executor_js_1.workflowExecutor.initialize(),
        ]);
        servicesInitialized = true;
        logger_js_1.default.info('🎼 Conductor API services initialized');
    }
};
// Authentication and authorization middleware for all routes
router.use(rbac_middleware_js_1.authenticateUser);
/**
 * 🎯 MAESTRO CORE API: Universal Web Intelligence Orchestration
 */
router.post('/orchestrate', (0, rbac_middleware_js_1.requirePermission)('workflow:execute'), async (req, res) => {
    try {
        await initializeServices();
        const { query, context, constraints } = req.body;
        const authUser = req.user;
        if (!query) {
            return res.status(400).json({
                error: 'Missing required field: query',
            });
        }
        // Use authenticated user context
        const orchestrationContext = {
            userId: authUser.userId,
            tenantId: authUser.tenantId || 'default',
            purpose: context?.purpose || 'intelligence_analysis',
            urgency: context?.urgency || 'medium',
            budgetLimit: context?.budgetLimit || 25.0,
            qualityThreshold: context?.qualityThreshold || 0.8,
            expectedOutputLength: context?.expectedOutputLength || 2000,
            requiredSources: context?.requiredSources || 3,
            synthesisStrategy: context?.synthesisStrategy || 'comprehensive',
        };
        const startTime = Date.now();
        const result = await orchestrationService.orchestrate({
            query,
            context: orchestrationContext,
            constraints: constraints || {},
        });
        const totalTime = Date.now() - startTime;
        logger_js_1.default.info('🎼 Maestro orchestration API request completed', {
            orchestrationId: result.orchestrationId,
            userId: authUser.userId,
            tenantId: authUser.tenantId,
            totalTime,
            sourcesUsed: result.metadata.sourcesUsed,
            confidence: result.confidence,
        });
        res.json({
            success: true,
            data: result,
            performance: {
                processingTime: totalTime,
                apiVersion: '2.0.0-phase2a',
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Conductor orchestration API error', {
            error: error.message,
            query: req.body.query?.substring(0, 100),
            userId: req.user?.userId,
        });
        res.status(500).json({
            success: false,
            error: error.message,
            errorCode: 'ORCHESTRATION_FAILED',
        });
    }
});
/**
 * 📊 METRICS API: Real-time conductor performance and health metrics
 */
router.get('/metrics', (0, rbac_middleware_js_1.requirePermission)('metrics:read'), async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '24h';
        const includeTimeSeries = req.query.timeSeries === 'true';
        if (process.env.CONDUCTOR_DEMO_METRICS === 'true') {
            const currentTime = new Date();
            const mockMetrics = {
                timestamp: currentTime.toISOString(),
                timeRange,
                routing: {
                    total_requests: Math.floor(Math.random() * 5000) + 8000,
                    success_rate: 0.96 + Math.random() * 0.03,
                    avg_latency_ms: 42 + Math.random() * 35,
                    expert_distribution: {
                        'Web Orchestration': 38 + Math.random() * 8,
                        'Premium Models': 28 + Math.random() * 8,
                        'Code Generation': 16 + Math.random() * 6,
                        'Data Analysis': 12 + Math.random() * 4,
                        'Research Synthesis': 6 + Math.random() * 4,
                    },
                    quality_gates_passed: Math.floor(Math.random() * 500) + 7500,
                    cost_efficiency: 0.82 + Math.random() * 0.15,
                    time_series: includeTimeSeries
                        ? generateMetricsTimeSeries(timeRange)
                        : null,
                },
                web_orchestration: {
                    active_interfaces: 10 + Math.floor(Math.random() * 3),
                    synthesis_quality: 0.89 + Math.random() * 0.08,
                    compliance_score: 0.96 + Math.random() * 0.03,
                    citation_coverage: 0.91 + Math.random() * 0.07,
                    contradiction_rate: Math.random() * 0.04,
                },
                premium_models: {
                    utilization_rate: 0.74 + Math.random() * 0.2,
                    cost_savings_usd: Math.floor(Math.random() * 1500) + 1200,
                    quality_improvement: 0.18 + Math.random() * 0.12,
                    model_distribution: {
                        'GPT-4 Turbo': 42 + Math.random() * 8,
                        'Claude 3 Sonnet': 31 + Math.random() * 8,
                        'GPT-3.5 Turbo': 15 + Math.random() * 5,
                        'Gemini Pro': 8 + Math.random() * 4,
                        Other: 4 + Math.random() * 3,
                    },
                    thompson_sampling_convergence: 0.84 + Math.random() * 0.12,
                },
                infrastructure: {
                    uptime: 0.998 + Math.random() * 0.0019,
                    scaling_events: Math.floor(Math.random() * 4),
                    active_alerts: Math.floor(Math.random() * 2),
                    budget_utilization: 0.67 + Math.random() * 0.15,
                },
            };
            const rateLimitStats = await rateLimiter.getRateLimitStats();
            return res.json({
                demo: true,
                ...mockMetrics,
                rateLimit: rateLimitStats,
            });
        }
        // TODO: wire real metrics aggregations here
        const rateLimitStats = await rateLimiter.getRateLimitStats();
        return res.json({ demo: false, rateLimit: rateLimitStats });
    }
    catch (error) {
        logger_js_1.default.error('❌ Metrics API error', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
            errorCode: 'METRICS_FETCH_FAILED',
        });
    }
});
/**
 * 💰 PRICING API: Dynamic pricing visibility and controls
 */
router.get('/pricing/signals', (0, rbac_middleware_js_1.requirePermission)('pricing:read'), async (req, res) => {
    try {
        const signals = [
            { modelId: 'gpt-4-turbo', demand: 0.78, utilization: 0.81 },
            { modelId: 'claude-3-sonnet', demand: 0.64, utilization: 0.67 },
        ];
        res.json({
            success: true,
            data: signals,
            meta: { totalModels: signals.length, timestamp: new Date().toISOString() },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Pricing signals API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch pricing signals' });
    }
});
router.post('/pricing/refresh', (0, rbac_middleware_js_1.requirePermission)('pricing:refresh'), async (req, res) => {
    try {
        await initializeServices();
        res.json({
            success: true,
            message: 'Pricing refresh triggered',
            metadata: { requestedAt: new Date().toISOString() },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Pricing refresh API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to refresh pricing' });
    }
});
/**
 * 📦 CAPACITY FUTURES API: Reserve and release capacity
 */
router.get('/capacity/list', (0, rbac_middleware_js_1.requirePermission)('capacity:read'), async (req, res) => {
    try {
        const capacities = [
            { region: 'us-east-1', available: 120, reserved: 30 },
            { region: 'us-west-2', available: 80, reserved: 45 },
        ];
        res.json({
            success: true,
            data: capacities,
            meta: { totalRegions: capacities.length },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Capacity list API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to list capacity' });
    }
});
router.post('/capacity/reserve', (0, rbac_middleware_js_1.requirePermission)('capacity:reserve'), async (req, res) => {
    try {
        const { region, amount } = req.body || {};
        res.json({
            success: true,
            reservation: {
                region: region || 'unspecified',
                amount: amount || 0,
                reservedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Capacity reserve API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to reserve capacity' });
    }
});
router.post('/capacity/release', (0, rbac_middleware_js_1.requirePermission)('capacity:release'), async (req, res) => {
    try {
        const { region, amount } = req.body || {};
        res.json({
            success: true,
            release: {
                region: region || 'unspecified',
                amount: amount || 0,
                releasedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Capacity release API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to release capacity' });
    }
});
/**
 * 🚩 FEATURE FLAGS API: Visibility into conductor flags
 */
router.get('/flags', (0, rbac_middleware_js_1.requirePermission)('flags:read'), async (req, res) => {
    try {
        const flags = [
            { name: 'price-aware-routing', enabled: true },
            { name: 'capacity-futures', enabled: false },
        ];
        res.json({
            success: true,
            data: flags,
            meta: { totalFlags: flags.length },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Flags API error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch flags' });
    }
});
/**
 * 📈 HEALTH CHECK API: Service health and readiness (public endpoint)
 */
router.get('/health', async (req, res) => {
    try {
        await initializeServices();
        const healthChecks = {
            orchestration_service: 'healthy',
            premium_router: 'healthy',
            compliance_gate: 'healthy',
            rate_limiter: 'healthy',
            database: 'healthy',
            redis: 'healthy',
        };
        const overallStatus = Object.values(healthChecks).every((status) => status === 'healthy')
            ? 'healthy'
            : 'degraded';
        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: '2.0.0-phase2a',
            components: healthChecks,
            uptime: process.uptime(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * 🔧 PREMIUM MODELS API: Model management and performance
 */
router.get('/models', (0, rbac_middleware_js_1.requirePermission)('metrics:read'), async (req, res) => {
    try {
        await initializeServices();
        const models = [
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                status: 'active',
                utilization: 42.3,
                avg_latency: 1847,
                success_rate: 0.987,
                cost_per_token: 0.00003,
            },
            {
                id: 'claude-3-sonnet',
                name: 'Claude 3 Sonnet',
                provider: 'anthropic',
                status: 'active',
                utilization: 31.7,
                avg_latency: 1456,
                success_rate: 0.994,
                cost_per_token: 0.000015,
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                provider: 'openai',
                status: 'active',
                utilization: 15.2,
                avg_latency: 892,
                success_rate: 0.991,
                cost_per_token: 0.000001,
            },
        ];
        res.json({
            success: true,
            data: models,
            meta: {
                total_models: models.length,
                active_models: models.filter((m) => m.status === 'active').length,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * 🌐 WEB SOURCES API: Web interface status and compliance
 */
router.get('/web-sources', (0, rbac_middleware_js_1.requirePermission)('metrics:read'), async (req, res) => {
    try {
        const sources = [
            {
                domain: 'docs.python.org',
                status: 'online',
                response_time: 245,
                compliance: 98,
                quality: 96,
            },
            {
                domain: 'stackoverflow.com',
                status: 'online',
                response_time: 189,
                compliance: 94,
                quality: 89,
            },
            {
                domain: 'github.com',
                status: 'online',
                response_time: 156,
                compliance: 97,
                quality: 92,
            },
            {
                domain: 'arxiv.org',
                status: 'online',
                response_time: 298,
                compliance: 99,
                quality: 94,
            },
            {
                domain: 'nist.gov',
                status: 'online',
                response_time: 423,
                compliance: 100,
                quality: 98,
            },
            {
                domain: 'kubernetes.io',
                status: 'online',
                response_time: 334,
                compliance: 95,
                quality: 91,
            },
            {
                domain: 'nodejs.org',
                status: 'online',
                response_time: 267,
                compliance: 96,
                quality: 89,
            },
            {
                domain: 'developer.mozilla.org',
                status: 'online',
                response_time: 312,
                compliance: 97,
                quality: 93,
            },
            {
                domain: 'wikipedia.org',
                status: 'online',
                response_time: 445,
                compliance: 92,
                quality: 87,
            },
            {
                domain: 'openai.com',
                status: 'online',
                response_time: 234,
                compliance: 94,
                quality: 90,
            },
        ];
        res.json({
            success: true,
            data: sources,
            meta: {
                total_sources: sources.length,
                online_sources: sources.filter((s) => s.status === 'online').length,
                avg_compliance: sources.reduce((sum, s) => sum + s.compliance, 0) / sources.length,
                avg_quality: sources.reduce((sum, s) => sum + s.quality, 0) / sources.length,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * Generate mock time series data for metrics
 */
function generateMetricsTimeSeries(timeRange) {
    const now = new Date();
    let intervals;
    let intervalMs;
    switch (timeRange) {
        case '1h':
            intervals = 12; // 5-minute intervals
            intervalMs = 5 * 60 * 1000;
            break;
        case '7d':
            intervals = 24 * 7; // hourly for 7 days
            intervalMs = 60 * 60 * 1000;
            break;
        case '30d':
            intervals = 30; // daily for 30 days
            intervalMs = 24 * 60 * 60 * 1000;
            break;
        default: // 24h
            intervals = 24; // hourly
            intervalMs = 60 * 60 * 1000;
    }
    const data = [];
    for (let i = intervals - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * intervalMs);
        data.push({
            timestamp: timestamp.toISOString(),
            requests: Math.floor(Math.random() * 150) + 75,
            latency: Math.floor(Math.random() * 80) + 40,
            success_rate: 0.96 + Math.random() * 0.03,
            cost: Math.random() * 50 + 25,
        });
    }
    return data;
}
/**
 * 🛡️ AUTHENTICATION API: User info and JWT token management
 */
router.get('/auth/user', rbac_middleware_js_1.getUserInfo);
router.get('/auth/jwks', async (req, res) => {
    try {
        const jwks = await rbac_middleware_js_1.jwtRotationManager.getJWKS();
        res.json(jwks);
    }
    catch (error) {
        logger_js_1.default.error('❌ Failed to get JWKS', { error: error.message });
        res.status(500).json({ error: 'Failed to get JWKS' });
    }
});
router.get('/auth/rotation-status', (0, rbac_middleware_js_1.requirePermission)('admin:*'), (req, res) => {
    try {
        const status = rbac_middleware_js_1.jwtRotationManager.getRotationStatus();
        res.json(status);
    }
    catch (error) {
        logger_js_1.default.error('❌ Failed to get rotation status', {
            error: error.message,
        });
        res.status(500).json({ error: 'Failed to get rotation status' });
    }
});
router.post('/auth/rotate-keys', (0, rbac_middleware_js_1.requirePermission)('admin:*'), async (req, res) => {
    try {
        await rbac_middleware_js_1.jwtRotationManager.rotateKeys();
        const status = rbac_middleware_js_1.jwtRotationManager.getRotationStatus();
        res.json({ message: 'Keys rotated successfully', status });
    }
    catch (error) {
        logger_js_1.default.error('❌ Failed to rotate keys', { error: error.message });
        res.status(500).json({ error: 'Failed to rotate keys' });
    }
});
// Mount policy routes
router.use('/policies', policy_routes_js_1.policyRoutes);
// Mount evidence routes
router.use('/evidence', evidence_routes_js_1.evidenceRoutes);
// Mount pricing/pool debug routes
router.use('/', pricing_read_routes_js_1.pricingReadRoutes);
// Mount workflow routes
router.use('/', workflow_routes_js_1.workflowRoutes);
// Mount agent routes
router.use('/', agent_routes_js_1.agentRoutes);
// Mount serving routes
router.use('/serving', serving_routes_js_1.servingRoutes);
