"use strict";
/**
 * Governance Metrics Routes
 *
 * REST API endpoints for governance analytics and metrics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module routes/analytics/governance-metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const GovernanceMetricsService_js_1 = require("../../services/analytics/GovernanceMetricsService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const metricsService = new GovernanceMetricsService_js_1.GovernanceMetricsService();
// ============================================================================
// Middleware
// ============================================================================
/**
 * Build Principal from request user
 */
const buildPrincipal = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        return;
    }
    const principal = {
        kind: 'user',
        id: user.id,
        tenantId: req.headers['x-tenant-id'] || user.tenantId || 'default-tenant',
        roles: [user.role],
        scopes: [],
        user: {
            email: user.email,
            username: user.username,
        },
    };
    req.principal = principal;
    next();
};
/**
 * Require analytics read permission
 */
const requireAnalyticsRead = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'read', { type: 'analytics', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'analytics:read',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
/**
 * Parse time range from query parameters
 */
const parseTimeRange = (req) => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const start = req.query.start ? new Date(req.query.start) : defaultStart;
    const end = req.query.end ? new Date(req.query.end) : now;
    const granularity = req.query.granularity || 'day';
    return { start, end, granularity };
};
// ============================================================================
// Routes
// ============================================================================
/**
 * GET /analytics/governance/summary
 * Get governance metrics summary
 */
router.get('/summary', auth_js_1.ensureAuthenticated, buildPrincipal, requireAnalyticsRead, async (req, res) => {
    try {
        const principal = req.principal;
        const timeRange = parseTimeRange(req);
        const envelope = await metricsService.getMetricsSummary(principal.tenantId, timeRange, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting governance summary:', error);
        res.status(500).json({ error: 'Failed to get governance summary', message: error.message });
    }
});
/**
 * GET /analytics/governance/verdicts
 * Get verdict distribution
 */
router.get('/verdicts', auth_js_1.ensureAuthenticated, buildPrincipal, requireAnalyticsRead, async (req, res) => {
    try {
        const principal = req.principal;
        const timeRange = parseTimeRange(req);
        const envelope = await metricsService.getVerdictDistribution(principal.tenantId, timeRange, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting verdict distribution:', error);
        res.status(500).json({ error: 'Failed to get verdict distribution', message: error.message });
    }
});
/**
 * GET /analytics/governance/trends
 * Get verdict trends over time
 */
router.get('/trends', auth_js_1.ensureAuthenticated, buildPrincipal, requireAnalyticsRead, async (req, res) => {
    try {
        const principal = req.principal;
        const timeRange = parseTimeRange(req);
        const envelope = await metricsService.getVerdictTrends(principal.tenantId, timeRange, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting verdict trends:', error);
        res.status(500).json({ error: 'Failed to get verdict trends', message: error.message });
    }
});
/**
 * GET /analytics/governance/policies
 * Get policy effectiveness metrics
 */
router.get('/policies', auth_js_1.ensureAuthenticated, buildPrincipal, requireAnalyticsRead, async (req, res) => {
    try {
        const principal = req.principal;
        const timeRange = parseTimeRange(req);
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const envelope = await metricsService.getPolicyEffectiveness(principal.tenantId, timeRange, limit, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting policy effectiveness:', error);
        res.status(500).json({ error: 'Failed to get policy effectiveness', message: error.message });
    }
});
/**
 * GET /analytics/governance/anomalies
 * Get detected anomalies
 */
router.get('/anomalies', auth_js_1.ensureAuthenticated, buildPrincipal, requireAnalyticsRead, async (req, res) => {
    try {
        const principal = req.principal;
        const timeRange = parseTimeRange(req);
        const envelope = await metricsService.detectAnomalies(principal.tenantId, timeRange, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error detecting anomalies:', error);
        res.status(500).json({ error: 'Failed to detect anomalies', message: error.message });
    }
});
exports.default = router;
