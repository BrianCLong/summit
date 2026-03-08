"use strict";
/**
 * User Management Admin Routes
 *
 * REST API endpoints for user management operations.
 * All responses are wrapped in DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/admin/users
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const UserManagementService_js_1 = require("../../services/UserManagementService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const userService = new UserManagementService_js_1.UserManagementService();
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
 * Require user management permission
 */
const requireUserPermission = (action) => {
    return async (req, res, next) => {
        try {
            const principal = req.principal;
            await authz.assertCan(principal, action, { type: 'user', tenantId: principal.tenantId });
            next();
        }
        catch (error) {
            if (error.message.includes('Permission denied')) {
                res.status(403).json({
                    error: 'Forbidden',
                    code: 'PERMISSION_DENIED',
                    required: `user:${action}`,
                });
                return;
            }
            logger_js_1.default.error('Authorization error:', error);
            res.status(500).json({ error: 'Authorization service error' });
        }
    };
};
// ============================================================================
// Routes
// ============================================================================
/**
 * GET /admin/users
 * List users with pagination and filtering
 */
router.get('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        // Parse query params
        const input = {
            page: parseInt(req.query.page, 10) || 1,
            pageSize: parseInt(req.query.pageSize, 10) || 20,
            search: req.query.search,
            role: req.query.role,
            isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const envelope = await userService.listUsers(principal.tenantId, input, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing users:', error);
        res.status(500).json({ error: 'Failed to list users', message: error.message });
    }
});
/**
 * GET /admin/users/:id
 * Get a specific user
 */
router.get('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('read'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await userService.getUser(principal.tenantId, id, principal.id);
        if (!envelope.data) {
            res.status(404).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user', message: error.message });
    }
});
/**
 * POST /admin/users
 * Create a new user
 */
router.post('/', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('create'), async (req, res) => {
    try {
        const principal = req.principal;
        // Validate input
        const parseResult = UserManagementService_js_1.createUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await userService.createUser(principal.tenantId, parseResult.data, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.status(201).json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', message: error.message });
    }
});
/**
 * PATCH /admin/users/:id
 * Update a user
 */
router.patch('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        // Validate input
        const parseResult = UserManagementService_js_1.updateUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.errors,
            });
            return;
        }
        const envelope = await userService.updateUser(principal.tenantId, id, parseResult.data, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user', message: error.message });
    }
});
/**
 * DELETE /admin/users/:id
 * Delete (deactivate) a user
 */
router.delete('/:id', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('delete'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const hardDelete = req.query.hardDelete === 'true';
        const envelope = await userService.deleteUser(principal.tenantId, id, principal.id, hardDelete);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user', message: error.message });
    }
});
/**
 * POST /admin/users/:id/lock
 * Lock a user account
 */
router.post('/:id/lock', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('lock'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ error: 'Reason is required for locking account' });
            return;
        }
        const envelope = await userService.lockUser(principal.tenantId, id, principal.id, reason);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error locking user:', error);
        res.status(500).json({ error: 'Failed to lock user', message: error.message });
    }
});
/**
 * POST /admin/users/:id/unlock
 * Unlock a user account
 */
router.post('/:id/unlock', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('unlock'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await userService.unlockUser(principal.tenantId, id, principal.id);
        if (!envelope.data.success) {
            res.status(400).json(envelope);
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error unlocking user:', error);
        res.status(500).json({ error: 'Failed to unlock user', message: error.message });
    }
});
/**
 * POST /admin/users/:id/tenants
 * Add user to a tenant
 */
router.post('/:id/tenants', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { tenantId, roles } = req.body;
        if (!tenantId || !roles || !Array.isArray(roles)) {
            res.status(400).json({ error: 'tenantId and roles array are required' });
            return;
        }
        const envelope = await userService.addUserToTenant(id, tenantId, roles, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error adding user to tenant:', error);
        res.status(500).json({ error: 'Failed to add user to tenant', message: error.message });
    }
});
/**
 * DELETE /admin/users/:id/tenants/:tenantId
 * Remove user from a tenant
 */
router.delete('/:id/tenants/:tenantId', auth_js_1.ensureAuthenticated, buildPrincipal, requireUserPermission('update'), async (req, res) => {
    try {
        const principal = req.principal;
        const { id, tenantId } = req.params;
        const envelope = await userService.removeUserFromTenant(id, tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error removing user from tenant:', error);
        res.status(500).json({ error: 'Failed to remove user from tenant', message: error.message });
    }
});
exports.default = router;
