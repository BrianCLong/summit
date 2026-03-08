"use strict";
/**
 * Role Management Admin Routes
 *
 * REST API endpoints for role and permission management.
 * All responses are wrapped in DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/admin/roles
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const RoleManagementService_js_1 = require("../../services/RoleManagementService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const http_param_js_1 = require("../../utils/http-param.js");
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const roleService = new RoleManagementService_js_1.RoleManagementService();
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
 * Require role management permission
 */
const requireRolePermission = (action) => {
    return async (req, res, next) => {
        try {
            const principal = req.principal;
            await authz.assertCan(principal, action, { type: 'role', tenantId: principal.tenantId });
            next();
        }
        catch (error) {
            if (error.message.includes('Permission denied')) {
                res.status(403).json({
                    error: 'Forbidden',
                    code: 'PERMISSION_DENIED',
                    required: `role:${action}`,
                });
                return;
            }
            logger_js_1.default.error('Authorization error:', error);
            res.status(500).json({ error: 'Authorization service error' });
        }
    };
};
// ============================================================================
// Role Routes
// ============================================================================
/**
 * GET /admin/roles
 * List all roles (built-in and custom)
 */
router.get('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await roleService.listRoles(principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing roles:', error);
        res.status(500).json({ error: 'Failed to list roles', message: error.message });
    }
});
/**
 * GET /admin/roles/:id
 * Get a specific role
 */
router.get('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await roleService.getRole(principal.tenantId, id, principal.id);
        if (!envelope.data) {
            res.status(404).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting role:', error);
        res.status(500).json({ error: 'Failed to get role', message: error.message });
    }
});
/**
 * POST /admin/roles
 * Create a custom role
 */
router.post('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('create'), async (req, res) => {
    try {
        const principal = req.principal;
        // Validate input
        const parseResult = RoleManagementService_js_1.createRoleSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await roleService.createRole(principal.tenantId, parseResult.data, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role', message: error.message });
    }
});
/**
 * PATCH /admin/roles/:id
 * Update a custom role
 */
router.patch('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        // Validate input
        const parseResult = RoleManagementService_js_1.updateRoleSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await roleService.updateRole(principal.tenantId, id, parseResult.data, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role', message: error.message });
    }
});
/**
 * DELETE /admin/roles/:id
 * Delete a custom role
 */
router.delete('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('delete'), async (req, res) => {
    try {
        const principal = req.principal;
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const envelope = await roleService.deleteRole(principal.tenantId, id, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role', message: error.message });
    }
});
// ============================================================================
// Permission Routes
// ============================================================================
/**
 * GET /admin/roles/permissions
 * List all available permissions
 */
router.get('/permissions/list', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const envelope = await roleService.listPermissions(principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing permissions:', error);
        res.status(500).json({ error: 'Failed to list permissions', message: error.message });
    }
});
// ============================================================================
// Role Assignment Routes
// ============================================================================
/**
 * GET /admin/roles/users/:userId
 * Get a user's role assignments
 */
router.get('/users/:userId', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const userId = (0, http_param_js_1.firstStringOr)(req.params.userId, '');
        const envelope = await roleService.getUserRoles(principal.tenantId, userId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting user roles:', error);
        res.status(500).json({ error: 'Failed to get user roles', message: error.message });
    }
});
/**
 * POST /admin/roles/assign
 * Assign a role to a user
 */
router.post('/assign', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('assign'), async (req, res) => {
    try {
        const principal = req.principal;
        const { userId, roleId, expiresAt } = req.body;
        if (!userId || !roleId) {
            res.status(400).json({ error: 'userId and roleId are required' });
            return;
        }
        const envelope = await roleService.assignRoleToUser(principal.tenantId, userId, roleId, principal.id, expiresAt ? new Date(expiresAt) : undefined);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error assigning role:', error);
        res.status(500).json({ error: 'Failed to assign role', message: error.message });
    }
});
/**
 * POST /admin/roles/revoke
 * Revoke a role from a user
 */
router.post('/revoke', auth_js_1.ensureAuthenticated, buildPrincipal, requireRolePermission('revoke'), async (req, res) => {
    try {
        const principal = req.principal;
        const { userId, roleId } = req.body;
        if (!userId || !roleId) {
            res.status(400).json({ error: 'userId and roleId are required' });
            return;
        }
        const envelope = await roleService.revokeRoleFromUser(principal.tenantId, userId, roleId, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error revoking role:', error);
        res.status(500).json({ error: 'Failed to revoke role', message: error.message });
    }
});
exports.default = router;
