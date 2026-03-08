"use strict";
/**
 * Policy Management Routes
 *
 * REST API endpoints for governance policy CRUD, versioning,
 * simulation, and approval workflows.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module routes/policies/policy-management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const PolicyManagementService_js_1 = require("../../services/PolicyManagementService.js");
const PolicySimulatorService_js_1 = require("../../services/PolicySimulatorService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const http_param_js_1 = require("../../utils/http-param.js");
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const policyService = new PolicyManagementService_js_1.PolicyManagementService();
const simulatorService = new PolicySimulatorService_js_1.PolicySimulatorService();
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
 * Require policy management permission
 */
const requirePolicyPermission = (action) => {
    return async (req, res, next) => {
        try {
            const principal = req.principal;
            await authz.assertCan(principal, action, { type: 'policy', tenantId: principal.tenantId });
            next();
        }
        catch (error) {
            if (error.message.includes('Permission denied')) {
                res.status(403).json({
                    error: 'Forbidden',
                    code: 'PERMISSION_DENIED',
                    required: `policy:${action}`,
                });
                return;
            }
            logger_js_1.default.error('Authorization error:', error);
            res.status(500).json({ error: 'Authorization service error' });
        }
    };
};
// ============================================================================
// Policy CRUD Routes
// ============================================================================
/**
 * GET /policies
 * List policies with pagination and filtering
 */
router.get('/', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const page = (0, http_param_js_1.firstString)(req.query.page);
        const pageSize = (0, http_param_js_1.firstString)(req.query.pageSize);
        const status = (0, http_param_js_1.firstString)(req.query.status);
        const category = (0, http_param_js_1.firstString)(req.query.category);
        const search = (0, http_param_js_1.firstString)(req.query.search);
        const envelope = await policyService.listPolicies(principal.tenantId, {
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
            status: status,
            category: category,
            search,
        }, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing policies:', error);
        res.status(500).json({ error: 'Failed to list policies', message: error.message });
    }
});
/**
 * GET /policies/:id
 * Get a specific policy
 */
router.get('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await policyService.getPolicy(principal.tenantId, id, principal.id);
        if (!envelope.data) {
            res.status(404).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting policy:', error);
        res.status(500).json({ error: 'Failed to get policy', message: error.message });
    }
});
/**
 * POST /policies
 * Create a new policy
 */
router.post('/', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('create'), async (req, res) => {
    try {
        const principal = req.principal;
        const parseResult = PolicyManagementService_js_1.createPolicySchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await policyService.createPolicy(principal.tenantId, parseResult.data, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error creating policy:', error);
        res.status(500).json({ error: 'Failed to create policy', message: error.message });
    }
});
/**
 * PATCH /policies/:id
 * Update a policy
 */
router.patch('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { changelog, ...updates } = req.body;
        const parseResult = PolicyManagementService_js_1.updatePolicySchema.safeParse(updates);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await policyService.updatePolicy(principal.tenantId, id, parseResult.data, changelog || 'Policy updated', principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating policy:', error);
        res.status(500).json({ error: 'Failed to update policy', message: error.message });
    }
});
/**
 * DELETE /policies/:id
 * Archive a policy
 */
router.delete('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('delete'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await policyService.deletePolicy(principal.tenantId, id, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error deleting policy:', error);
        res.status(500).json({ error: 'Failed to delete policy', message: error.message });
    }
});
// ============================================================================
// Version Management Routes
// ============================================================================
/**
 * GET /policies/:id/versions
 * List versions of a policy
 */
router.get('/:id/versions', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await policyService.listPolicyVersions(principal.tenantId, id, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing policy versions:', error);
        res.status(500).json({ error: 'Failed to list versions', message: error.message });
    }
});
/**
 * POST /policies/:id/rollback
 * Rollback to a previous version
 */
router.post('/:id/rollback', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { targetVersion } = req.body;
        if (!targetVersion || typeof targetVersion !== 'number') {
            res.status(400).json({ error: 'targetVersion is required and must be a number' });
            return;
        }
        const envelope = await policyService.rollbackPolicy(principal.tenantId, id, targetVersion, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error rolling back policy:', error);
        res.status(500).json({ error: 'Failed to rollback policy', message: error.message });
    }
});
// ============================================================================
// Approval Workflow Routes
// ============================================================================
/**
 * POST /policies/:id/submit
 * Submit policy for approval
 */
router.post('/:id/submit', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('submit'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { reason } = req.body;
        const envelope = await policyService.submitForApproval(principal.tenantId, id, reason || 'Submitted for review', principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error submitting policy:', error);
        res.status(500).json({ error: 'Failed to submit policy', message: error.message });
    }
});
/**
 * POST /policies/:id/approve
 * Approve a policy
 */
router.post('/:id/approve', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('approve'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { notes } = req.body;
        const envelope = await policyService.approvePolicy(principal.tenantId, id, notes || '', principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error approving policy:', error);
        res.status(500).json({ error: 'Failed to approve policy', message: error.message });
    }
});
/**
 * POST /policies/:id/publish
 * Publish an approved policy
 */
router.post('/:id/publish', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('publish'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await policyService.publishPolicy(principal.tenantId, id, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error publishing policy:', error);
        res.status(500).json({ error: 'Failed to publish policy', message: error.message });
    }
});
// ============================================================================
// Simulation Routes
// ============================================================================
/**
 * POST /policies/simulate
 * Simulate a policy against a context
 */
router.post('/simulate', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('simulate'), async (req, res) => {
    try {
        const principal = req.principal;
        const parseResult = PolicySimulatorService_js_1.simulationRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await simulatorService.simulate(parseResult.data, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error simulating policy:', error);
        res.status(500).json({ error: 'Failed to simulate policy', message: error.message });
    }
});
/**
 * POST /policies/simulate/batch
 * Simulate a policy against multiple contexts
 */
router.post('/simulate/batch', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('simulate'), async (req, res) => {
    try {
        const principal = req.principal;
        const { policy, contexts } = req.body;
        if (!policy || !contexts || !Array.isArray(contexts)) {
            res.status(400).json({
                error: 'policy and contexts array are required',
            });
            return;
        }
        const envelope = await simulatorService.batchSimulate({ policy, contexts }, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error in batch simulation:', error);
        res.status(500).json({ error: 'Failed to batch simulate', message: error.message });
    }
});
/**
 * POST /policies/analyze-impact
 * Analyze the impact of a policy change
 */
router.post('/analyze-impact', auth_js_1.ensureAuthenticated, buildPrincipal, requirePolicyPermission('simulate'), async (req, res) => {
    try {
        const principal = req.principal;
        const { currentPolicy, newPolicy } = req.body;
        if (!currentPolicy || !newPolicy) {
            res.status(400).json({
                error: 'currentPolicy and newPolicy are required',
            });
            return;
        }
        const envelope = await simulatorService.analyzeImpact(currentPolicy, newPolicy, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error analyzing impact:', error);
        res.status(500).json({ error: 'Failed to analyze impact', message: error.message });
    }
});
exports.default = router;
