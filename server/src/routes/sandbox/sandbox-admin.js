"use strict";
/**
 * Sandbox Admin Routes
 *
 * REST API endpoints for sandbox testing environment.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module routes/sandbox/sandbox-admin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const SandboxManager_js_1 = require("../../sandbox/SandboxManager.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const http_param_js_1 = require("../../utils/http-param.js");
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
const requireSandboxAccess = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'execute', { type: 'sandbox', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'sandbox:execute',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
const requireSandboxAdmin = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'administer', { type: 'sandbox', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'sandbox:administer',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
// ============================================================================
// Sandbox CRUD Routes
// ============================================================================
/**
 * POST /sandbox
 * Create a new sandbox environment
 */
router.post('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { name, policies, scenarios, personas, limits, expiresIn } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Sandbox name is required' });
            return;
        }
        const envelope = await SandboxManager_js_1.sandboxManager.create({
            name,
            tenantId: principal.tenantId,
            createdBy: principal.id,
            policies,
            scenarios,
            personas,
            limits,
            expiresIn,
        });
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error creating sandbox:', error);
        res.status(500).json({ error: 'Failed to create sandbox', message: error.message });
    }
});
/**
 * GET /sandbox
 * List all sandboxes for the tenant
 */
router.get('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAccess, async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = SandboxManager_js_1.sandboxManager.listSandboxes(principal.tenantId);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing sandboxes:', error);
        res.status(500).json({ error: 'Failed to list sandboxes', message: error.message });
    }
});
/**
 * GET /sandbox/:id
 * Get sandbox details
 */
router.get('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAccess, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = SandboxManager_js_1.sandboxManager.getSandbox(id);
        if (!envelope.data) {
            res.status(404).json({ error: 'Sandbox not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting sandbox:', error);
        res.status(500).json({ error: 'Failed to get sandbox', message: error.message });
    }
});
/**
 * PUT /sandbox/:id
 * Update sandbox configuration
 */
router.put('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAdmin, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { name, policies, testData, limits } = req.body;
        const envelope = await SandboxManager_js_1.sandboxManager.updateSandbox(id, {
            name,
            policies,
            testData,
            limits,
        });
        if (!envelope.data) {
            res.status(404).json({ error: 'Sandbox not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating sandbox:', error);
        res.status(500).json({ error: 'Failed to update sandbox', message: error.message });
    }
});
/**
 * DELETE /sandbox/:id
 * Delete a sandbox
 */
router.delete('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAdmin, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = SandboxManager_js_1.sandboxManager.deleteSandbox(id);
        if (!envelope.data.deleted) {
            res.status(404).json({ error: 'Sandbox not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error deleting sandbox:', error);
        res.status(500).json({ error: 'Failed to delete sandbox', message: error.message });
    }
});
// ============================================================================
// Scenario Routes
// ============================================================================
/**
 * POST /sandbox/:id/scenarios
 * Add a scenario to the sandbox
 */
router.post('/:id/scenarios', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAdmin, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { name, description, actor, action, resource, context, expectedVerdict } = req.body;
        if (!name || !actor || !action || !resource) {
            res.status(400).json({
                error: 'name, actor, action, and resource are required',
            });
            return;
        }
        const envelope = SandboxManager_js_1.sandboxManager.addScenario(id, {
            name,
            description,
            actor,
            action,
            resource,
            context,
            expectedVerdict,
        });
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error adding scenario:', error);
        res.status(500).json({ error: 'Failed to add scenario', message: error.message });
    }
});
// ============================================================================
// Execution Routes
// ============================================================================
/**
 * POST /sandbox/:id/execute
 * Execute sandbox scenarios
 */
router.post('/:id/execute', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAccess, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { scenarioId, policyId, contextOverrides } = req.body;
        const envelope = await SandboxManager_js_1.sandboxManager.execute({
            sandboxId: id,
            scenarioId,
            policyId,
            contextOverrides,
        });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error executing sandbox:', error);
        res.status(500).json({ error: 'Failed to execute sandbox', message: error.message });
    }
});
/**
 * GET /sandbox/executions/:executionId
 * Get execution result
 */
router.get('/executions/:executionId', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAccess, async (req, res) => {
    try {
        const executionId = (0, http_param_js_1.firstStringOr)(req.params.executionId, '');
        const envelope = SandboxManager_js_1.sandboxManager.getExecution(executionId);
        if (!envelope.data) {
            res.status(404).json({ error: 'Execution not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting execution:', error);
        res.status(500).json({ error: 'Failed to get execution', message: error.message });
    }
});
// ============================================================================
// Policy Cloning Routes
// ============================================================================
/**
 * POST /sandbox/:id/clone-policy
 * Clone a production policy into the sandbox
 */
router.post('/:id/clone-policy', auth_js_1.ensureAuthenticated, buildPrincipal, requireSandboxAdmin, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const { policyId, policyData } = req.body;
        if (!policyData) {
            res.status(400).json({ error: 'policyData is required' });
            return;
        }
        const sandbox = SandboxManager_js_1.sandboxManager.getSandbox(id);
        if (!sandbox.data) {
            res.status(404).json({ error: 'Sandbox not found' });
            return;
        }
        // Clone policy with new ID
        const clonedPolicy = {
            id: `sandbox-policy-${Date.now()}`,
            originalId: policyId,
            name: policyData.name,
            description: policyData.description,
            rules: policyData.rules || [],
            status: 'draft',
            modifiedInSandbox: false,
        };
        const updated = await SandboxManager_js_1.sandboxManager.updateSandbox(id, {
            policies: [...sandbox.data.policies, clonedPolicy],
        });
        res.status(201).json(updated);
    }
    catch (error) {
        logger_js_1.default.error('Error cloning policy:', error);
        res.status(500).json({ error: 'Failed to clone policy', message: error.message });
    }
});
exports.default = router;
