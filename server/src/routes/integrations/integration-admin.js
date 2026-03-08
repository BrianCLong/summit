"use strict";
// @ts-nocheck
/**
 * Integration Admin Routes
 *
 * REST API endpoints for integration management with governance.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/integrations/integration-admin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const IntegrationManager_js_1 = require("../../integrations/IntegrationManager.js");
const SlackConnector_js_1 = require("../../integrations/connectors/SlackConnector.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
// Register built-in connectors
IntegrationManager_js_1.integrationManager.registerConnector(SlackConnector_js_1.slackConnector);
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
 * Require integration admin permission
 */
const requireIntegrationAdmin = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'admin', { type: 'integration', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'integration:admin',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
/**
 * Require integration read permission
 */
const requireIntegrationRead = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'read', { type: 'integration', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'integration:read',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
// ============================================================================
// Catalog Routes
// ============================================================================
/**
 * GET /integrations/catalog
 * List available integration types
 */
router.get('/catalog', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationRead, async (req, res) => {
    try {
        const envelope = IntegrationManager_js_1.integrationManager.getAvailableIntegrations();
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing integration catalog:', error);
        res.status(500).json({ error: 'Failed to list integrations', message: error.message });
    }
});
// ============================================================================
// Integration Instance Routes
// ============================================================================
/**
 * GET /integrations
 * List configured integrations for the tenant
 */
router.get('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { status, category } = req.query;
        const envelope = IntegrationManager_js_1.integrationManager.getIntegrations(principal.tenantId, {
            status: status,
            category: category,
        });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing integrations:', error);
        res.status(500).json({ error: 'Failed to list integrations', message: error.message });
    }
});
/**
 * GET /integrations/:id
 * Get a specific integration
 */
router.get('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationRead, async (req, res) => {
    try {
        const { id } = req.params;
        const envelope = IntegrationManager_js_1.integrationManager.getIntegration(id);
        if (!envelope.data) {
            res.status(404).json({ error: 'Integration not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting integration:', error);
        res.status(500).json({ error: 'Failed to get integration', message: error.message });
    }
});
/**
 * POST /integrations
 * Set up a new integration
 */
router.post('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { manifestId, name, config } = req.body;
        if (!manifestId || !name) {
            res.status(400).json({ error: 'manifestId and name are required' });
            return;
        }
        const envelope = await IntegrationManager_js_1.integrationManager.setupIntegration(manifestId, name, config || {}, principal.tenantId, principal);
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error setting up integration:', error);
        res.status(500).json({ error: 'Failed to set up integration', message: error.message });
    }
});
/**
 * POST /integrations/:id/connect
 * Connect an integration
 */
router.post('/:id/connect', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await IntegrationManager_js_1.integrationManager.connect(id, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error connecting integration:', error);
        res.status(500).json({ error: 'Failed to connect integration', message: error.message });
    }
});
/**
 * POST /integrations/:id/disconnect
 * Disconnect an integration
 */
router.post('/:id/disconnect', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await IntegrationManager_js_1.integrationManager.disconnect(id, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error disconnecting integration:', error);
        res.status(500).json({ error: 'Failed to disconnect integration', message: error.message });
    }
});
/**
 * POST /integrations/:id/execute
 * Execute an integration action
 */
router.post('/:id/execute', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { capability, params, simulation } = req.body;
        if (!capability) {
            res.status(400).json({ error: 'capability is required' });
            return;
        }
        const envelope = await IntegrationManager_js_1.integrationManager.executeAction(id, capability, params || {}, principal, { simulation });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error executing integration action:', error);
        res.status(500).json({ error: 'Failed to execute action', message: error.message });
    }
});
// ============================================================================
// Approval Workflow Routes
// ============================================================================
/**
 * GET /integrations/approvals/pending
 * List pending approval requests
 */
router.get('/approvals/pending', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = IntegrationManager_js_1.integrationManager.getPendingApprovals(principal.tenantId);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing pending approvals:', error);
        res.status(500).json({ error: 'Failed to list approvals', message: error.message });
    }
});
/**
 * POST /integrations/approvals/:id/approve
 * Approve an integration request
 */
router.post('/approvals/:id/approve', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { comment } = req.body;
        const envelope = await IntegrationManager_js_1.integrationManager.approveRequest(id, principal, comment);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error approving request:', error);
        res.status(500).json({ error: 'Failed to approve request', message: error.message });
    }
});
/**
 * POST /integrations/approvals/:id/reject
 * Reject an integration request
 */
router.post('/approvals/:id/reject', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { comment } = req.body;
        const envelope = await IntegrationManager_js_1.integrationManager.rejectRequest(id, principal, comment);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error rejecting request:', error);
        res.status(500).json({ error: 'Failed to reject request', message: error.message });
    }
});
// ============================================================================
// Audit Routes
// ============================================================================
/**
 * GET /integrations/audit
 * Get integration audit log
 */
router.get('/audit', auth_js_1.ensureAuthenticated, buildPrincipal, requireIntegrationAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { integrationId, from, to } = req.query;
        const envelope = IntegrationManager_js_1.integrationManager.getAuditLog(principal.tenantId, {
            integrationId: integrationId,
            from: from,
            to: to,
        });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting audit log:', error);
        res.status(500).json({ error: 'Failed to get audit log', message: error.message });
    }
});
exports.default = router;
