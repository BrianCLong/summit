"use strict";
/**
 * Compliance Summary Routes
 *
 * REST API endpoints for compliance analytics and audit readiness.
 *
 * SOC 2 Controls: CC2.1, CC3.1, CC4.1, PI1.1
 *
 * @module routes/analytics/compliance-summary
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const ComplianceMetricsService_js_1 = require("../../services/analytics/ComplianceMetricsService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const complianceService = new ComplianceMetricsService_js_1.ComplianceMetricsService();
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
 * Require compliance read permission
 */
const requireComplianceRead = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'read', { type: 'compliance', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'compliance:read',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
// ============================================================================
// Routes
// ============================================================================
/**
 * GET /analytics/compliance/summary
 * Get compliance dashboard summary
 */
router.get('/summary', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await complianceService.getComplianceSummary(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting compliance summary:', error);
        res.status(500).json({ error: 'Failed to get compliance summary', message: error.message });
    }
});
/**
 * GET /analytics/compliance/readiness
 * Get audit readiness score
 */
router.get('/readiness', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await complianceService.getAuditReadiness(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting audit readiness:', error);
        res.status(500).json({ error: 'Failed to get audit readiness', message: error.message });
    }
});
/**
 * GET /analytics/compliance/controls
 * Get control status overview
 */
router.get('/controls', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const framework = req.query.framework;
        const envelope = await complianceService.getControlStatus(principal.tenantId, framework, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting control status:', error);
        res.status(500).json({ error: 'Failed to get control status', message: error.message });
    }
});
/**
 * GET /analytics/compliance/effectiveness
 * Get control effectiveness metrics
 */
router.get('/effectiveness', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await complianceService.getControlEffectiveness(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting control effectiveness:', error);
        res.status(500).json({ error: 'Failed to get control effectiveness', message: error.message });
    }
});
/**
 * GET /analytics/compliance/evidence
 * Get evidence status overview
 */
router.get('/evidence', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await complianceService.getEvidenceStatus(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting evidence status:', error);
        res.status(500).json({ error: 'Failed to get evidence status', message: error.message });
    }
});
/**
 * GET /analytics/compliance/frameworks
 * Get framework status overview
 */
router.get('/frameworks', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await complianceService.getFrameworkStatus(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting framework status:', error);
        res.status(500).json({ error: 'Failed to get framework status', message: error.message });
    }
});
exports.default = router;
