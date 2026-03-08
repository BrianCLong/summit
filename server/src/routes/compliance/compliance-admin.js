"use strict";
// @ts-nocheck
/**
 * Compliance Admin Routes
 *
 * REST API endpoints for compliance management.
 *
 * SOC 2 Controls: CC4.1, CC4.2, PI1.1
 *
 * @module routes/compliance/compliance-admin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const EvidenceCollector_js_1 = require("../../compliance/EvidenceCollector.js");
const ControlMappingService_js_1 = require("../../compliance/ControlMappingService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
// ============================================================================
// Middleware
// ============================================================================
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
const requireComplianceAdmin = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'admin', { type: 'compliance', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'compliance:admin',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
// ============================================================================
// Framework Routes
// ============================================================================
/**
 * GET /compliance/frameworks
 * List available compliance frameworks
 */
router.get('/frameworks', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const envelope = ControlMappingService_js_1.controlMappingService.getFrameworks();
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing frameworks:', error);
        res.status(500).json({ error: 'Failed to list frameworks', message: error.message });
    }
});
/**
 * GET /compliance/frameworks/:framework/controls
 * List controls for a framework
 */
router.get('/frameworks/:framework/controls', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const { framework } = req.params;
        const { category } = req.query;
        const envelope = ControlMappingService_js_1.controlMappingService.getControls(framework, category);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing controls:', error);
        res.status(500).json({ error: 'Failed to list controls', message: error.message });
    }
});
// ============================================================================
// Assessment Routes
// ============================================================================
/**
 * POST /compliance/frameworks/:framework/assess/:controlId
 * Assess a specific control
 */
router.post('/frameworks/:framework/assess/:controlId', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { framework, controlId } = req.params;
        const envelope = await ControlMappingService_js_1.controlMappingService.assessControl(controlId, framework, principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error assessing control:', error);
        res.status(500).json({ error: 'Failed to assess control', message: error.message });
    }
});
/**
 * GET /compliance/frameworks/:framework/assessments
 * Get assessments for a framework
 */
router.get('/frameworks/:framework/assessments', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { framework } = req.params;
        const envelope = ControlMappingService_js_1.controlMappingService.getAssessments(principal.tenantId, framework);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting assessments:', error);
        res.status(500).json({ error: 'Failed to get assessments', message: error.message });
    }
});
// ============================================================================
// Summary Routes
// ============================================================================
/**
 * GET /compliance/frameworks/:framework/summary
 * Get compliance summary for a framework
 */
router.get('/frameworks/:framework/summary', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { framework } = req.params;
        const envelope = ControlMappingService_js_1.controlMappingService.getComplianceSummary(principal.tenantId, framework);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting summary:', error);
        res.status(500).json({ error: 'Failed to get summary', message: error.message });
    }
});
/**
 * GET /compliance/frameworks/:framework/readiness
 * Get audit readiness for a framework
 */
router.get('/frameworks/:framework/readiness', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { framework } = req.params;
        const envelope = ControlMappingService_js_1.controlMappingService.getAuditReadiness(principal.tenantId, framework);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting readiness:', error);
        res.status(500).json({ error: 'Failed to get readiness', message: error.message });
    }
});
// ============================================================================
// Evidence Routes
// ============================================================================
/**
 * GET /compliance/evidence
 * List evidence
 */
router.get('/evidence', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { controlId, framework, type, status } = req.query;
        const envelope = EvidenceCollector_js_1.evidenceCollector.getEvidence(principal.tenantId, {
            controlId: controlId,
            framework: framework,
            type: type,
            status: status,
        });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing evidence:', error);
        res.status(500).json({ error: 'Failed to list evidence', message: error.message });
    }
});
/**
 * POST /compliance/evidence
 * Collect new evidence
 */
router.post('/evidence', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { controlId, framework, type, source, content, metadata } = req.body;
        if (!controlId || !framework || !type || !source || !content) {
            res.status(400).json({
                error: 'controlId, framework, type, source, and content are required',
            });
            return;
        }
        const envelope = await EvidenceCollector_js_1.evidenceCollector.collectEvidence(controlId, framework, type, principal.tenantId, source, content, principal.id, metadata);
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error collecting evidence:', error);
        res.status(500).json({ error: 'Failed to collect evidence', message: error.message });
    }
});
/**
 * GET /compliance/evidence/:id
 * Get specific evidence
 */
router.get('/evidence/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const { id } = req.params;
        const envelope = EvidenceCollector_js_1.evidenceCollector.getEvidenceById(id);
        if (!envelope.data) {
            res.status(404).json({ error: 'Evidence not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting evidence:', error);
        res.status(500).json({ error: 'Failed to get evidence', message: error.message });
    }
});
/**
 * POST /compliance/evidence/:id/verify
 * Verify evidence integrity
 */
router.post('/evidence/:id/verify', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const { id } = req.params;
        const envelope = EvidenceCollector_js_1.evidenceCollector.verifyEvidence(id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error verifying evidence:', error);
        res.status(500).json({ error: 'Failed to verify evidence', message: error.message });
    }
});
/**
 * GET /compliance/evidence/status
 * Get evidence collection status
 */
router.get('/evidence/status', auth_js_1.ensureAuthenticated, buildPrincipal, requireComplianceRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { framework } = req.query;
        const envelope = EvidenceCollector_js_1.evidenceCollector.getEvidenceStatus(principal.tenantId, framework);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting evidence status:', error);
        res.status(500).json({ error: 'Failed to get status', message: error.message });
    }
});
exports.default = router;
