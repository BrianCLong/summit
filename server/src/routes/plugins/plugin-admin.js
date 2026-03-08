"use strict";
// @ts-nocheck
/**
 * Plugin Admin Routes
 *
 * REST API endpoints for plugin management and administration.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module routes/plugins/plugin-admin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../middleware/auth.js");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
const PluginManager_js_1 = require("../../plugins/PluginManager.js");
const PluginRegistry_js_1 = require("../../plugins/PluginRegistry.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const require_tenant_context_js_1 = require("../../middleware/require-tenant-context.js");
const router = express_1.default.Router();
const authz = new AuthorizationService_js_1.AuthorizationServiceImpl();
const pluginManager = new PluginManager_js_1.PluginManager();
const pluginRegistry = new PluginRegistry_js_1.PluginRegistry();
router.use(auth_js_1.ensureAuthenticated, (0, require_tenant_context_js_1.requireTenantContextMiddleware)());
// ============================================================================
// Middleware
// ============================================================================
/**
 * Build Principal from request user
 */
const buildPrincipal = (req, res, next) => {
    const user = req.user;
    const tenantContext = req.tenantContext;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
        return;
    }
    if (!tenantContext?.tenantId) {
        res.status(400).json({
            error: 'TENANT_CONTEXT_REQUIRED',
            code: 'TENANT_CONTEXT_REQUIRED',
            message: 'Tenant context is required for plugin administration',
        });
        return;
    }
    const principal = {
        kind: 'user',
        id: user.id,
        tenantId: tenantContext.tenantId,
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
 * Require plugin admin permission
 */
const requirePluginAdmin = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'admin', { type: 'plugin', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'plugin:admin',
            });
            return;
        }
        logger_js_1.default.error('Authorization error:', error);
        res.status(500).json({ error: 'Authorization service error' });
    }
};
/**
 * Require plugin read permission
 */
const requirePluginRead = async (req, res, next) => {
    try {
        const principal = req.principal;
        await authz.assertCan(principal, 'read', { type: 'plugin', tenantId: principal.tenantId });
        next();
    }
    catch (error) {
        if (error.message.includes('Permission denied')) {
            res.status(403).json({
                error: 'Forbidden',
                code: 'PERMISSION_DENIED',
                required: 'plugin:read',
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
 * GET /plugins
 * List all plugins
 */
router.get('/', buildPrincipal, requirePluginRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { category, status, search, page, pageSize } = req.query;
        const envelope = await pluginRegistry.listPlugins({
            category: category,
            status: status,
            search: search,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        }, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error listing plugins:', error);
        res.status(500).json({ error: 'Failed to list plugins', message: error.message });
    }
});
/**
 * GET /plugins/:id
 * Get a specific plugin
 */
router.get('/:id', buildPrincipal, requirePluginRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await pluginRegistry.getPlugin(id, principal.id);
        if (!envelope.data) {
            res.status(404).json({ error: 'Plugin not found' });
            return;
        }
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting plugin:', error);
        res.status(500).json({ error: 'Failed to get plugin', message: error.message });
    }
});
/**
 * POST /plugins/:id/enable
 * Enable a plugin for the tenant
 */
router.post('/:id/enable', buildPrincipal, requirePluginAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { config } = req.body;
        const envelope = await pluginManager.enablePlugin(id, principal.tenantId, config || {}, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error enabling plugin:', error);
        res.status(500).json({ error: 'Failed to enable plugin', message: error.message });
    }
});
/**
 * POST /plugins/:id/disable
 * Disable a plugin for the tenant
 */
router.post('/:id/disable', buildPrincipal, requirePluginAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await pluginManager.disablePlugin(id, principal.tenantId, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error disabling plugin:', error);
        res.status(500).json({ error: 'Failed to disable plugin', message: error.message });
    }
});
/**
 * POST /plugins/:id/execute
 * Execute a plugin action
 */
router.post('/:id/execute', buildPrincipal, requirePluginRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { action, params, simulation } = req.body;
        if (!action) {
            res.status(400).json({ error: 'Action is required' });
            return;
        }
        const envelope = await pluginManager.executeAction(id, action, params || {}, principal, { simulation });
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error executing plugin:', error);
        res.status(500).json({ error: 'Failed to execute plugin', message: error.message });
    }
});
/**
 * GET /plugins/:id/config
 * Get tenant-specific plugin configuration
 */
router.get('/:id/config', buildPrincipal, requirePluginRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await pluginRegistry.getTenantConfig(id, principal.tenantId, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting plugin config:', error);
        res.status(500).json({ error: 'Failed to get plugin config', message: error.message });
    }
});
/**
 * PUT /plugins/:id/config
 * Update tenant-specific plugin configuration
 */
router.put('/:id/config', buildPrincipal, requirePluginAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const { config, enabled } = req.body;
        const envelope = await pluginRegistry.saveTenantConfig(id, principal.tenantId, config || {}, enabled !== false, principal.id);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error updating plugin config:', error);
        res.status(500).json({ error: 'Failed to update plugin config', message: error.message });
    }
});
/**
 * GET /plugins/:id/health
 * Get plugin health status
 */
router.get('/:id/health', buildPrincipal, requirePluginRead, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await pluginManager.getHealthStatus(id, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error getting plugin health:', error);
        res.status(500).json({ error: 'Failed to get plugin health', message: error.message });
    }
});
/**
 * DELETE /plugins/:id
 * Uninstall a plugin (admin only)
 */
router.delete('/:id', buildPrincipal, requirePluginAdmin, async (req, res) => {
    try {
        const principal = req.principal;
        const { id } = req.params;
        const envelope = await pluginManager.uninstallPlugin(id, principal);
        res.json(envelope);
    }
    catch (error) {
        logger_js_1.default.error('Error uninstalling plugin:', error);
        res.status(500).json({ error: 'Failed to uninstall plugin', message: error.message });
    }
});
exports.default = router;
