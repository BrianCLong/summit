"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_js_1 = require("../middleware/async-handler.js");
const SSOService_js_1 = require("../services/SSOService.js");
const TenantService_js_1 = require("../services/TenantService.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const index_js_1 = __importDefault(require("../config/index.js"));
const router = (0, express_1.Router)();
const ssoService = new SSOService_js_1.SSOService();
// Validation schemas
const ssoConfigSchema = zod_1.z.object({
    type: zod_1.z.enum(['oidc', 'saml']),
    name: zod_1.z.string(),
    // OIDC
    issuer: zod_1.z.string().optional(),
    clientId: zod_1.z.string().optional(),
    clientSecret: zod_1.z.string().optional(),
    authorizationEndpoint: zod_1.z.string().optional(),
    tokenEndpoint: zod_1.z.string().optional(),
    userInfoEndpoint: zod_1.z.string().optional(),
    jwksUri: zod_1.z.string().optional(),
    // SAML
    entryPoint: zod_1.z.string().optional(),
    issuerString: zod_1.z.string().optional(),
    cert: zod_1.z.string().optional(),
    // Mapping
    groupMap: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional(),
    attributeMap: zod_1.z.object({
        email: zod_1.z.string().optional(),
        firstName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
        groups: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * @route POST /tenants/:id/sso
 * @desc Configure SSO for a tenant
 * @access Private (Admin of Tenant or System Admin)
 */
router.post('/tenants/:id/sso', auth_js_1.ensureAuthenticated, rateLimit_js_1.rateLimitMiddleware, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Strict Access Control:
    // Must be logged in (ensureAuthenticated handles this)
    // Must be ADMIN role
    // Must be associated with the tenant ID (or be a system-wide admin if that concept exists, here we stick to tenant admin)
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized: Admin role required' });
    }
    // Check if user belongs to this tenant
    if (req.user.tenantId !== id) {
        // In a real system, we might check if user is a "Super Admin" across tenants.
        // For now, strict tenant isolation.
        return res.status(403).json({ error: 'Unauthorized: Access restricted to tenant members' });
    }
    const validated = ssoConfigSchema.parse(req.body);
    // Get current tenant config
    const tenant = await TenantService_js_1.tenantService.getTenant(id);
    if (!tenant)
        return res.status(404).json({ error: 'Tenant not found' });
    const newConfig = {
        ...tenant.config,
        sso: validated
    };
    // Direct update via pool (since TenantService updateSettings doesn't cover config)
    const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
    const pool = getPostgresPool();
    await pool.query('UPDATE tenants SET config = $1 WHERE id = $2', [newConfig, id]);
    logger_js_1.default.info(`Updated SSO config for tenant ${id} by user ${req.user.id}`);
    return res.json({ success: true, config: validated });
}));
/**
 * @route GET /auth/sso/:tenantId/login
 * @desc Initiate SSO login
 * @access Public
 */
router.get('/auth/sso/:tenantId/login', rateLimit_js_1.rateLimitMiddleware, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    try {
        const { url, state } = await ssoService.getAuthUrl(tenantId, index_js_1.default.baseUrl || baseUrl);
        // Set state cookie for CSRF protection
        res.cookie('sso_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300 * 1000 // 5 minutes
        });
        return res.redirect(url);
    }
    catch (e) {
        logger_js_1.default.error('SSO Login Error', e);
        return res.status(400).json({ error: e.message });
    }
}));
/**
 * @route POST /auth/sso/:tenantId/callback
 * @desc Handle SSO callback
 * @access Public
 */
router.post('/auth/sso/:tenantId/callback', rateLimit_js_1.rateLimitMiddleware, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // CSRF / State Validation
    const stateCookie = req.cookies['sso_state'];
    const stateParam = req.body.RelayState || req.body.state || req.query.state || req.query.RelayState;
    // In SAML, RelayState is passed back. In OIDC, state is passed back.
    // Note: Some IdPs might not preserve RelayState perfectly in all flows (e.g. IdP initiated),
    // but for SP-initiated (which /login is), it is required for security.
    if (!stateCookie || !stateParam || stateCookie !== stateParam) {
        logger_js_1.default.warn(`SSO State mismatch or missing. Cookie: ${stateCookie ? 'present' : 'missing'}, Param: ${stateParam ? 'present' : 'missing'}`);
        return res.status(403).send('Authentication failed: State mismatch (CSRF protection)');
    }
    // Clear state cookie
    res.clearCookie('sso_state');
    try {
        const { user, token, refreshToken } = await ssoService.handleCallback(tenantId, index_js_1.default.baseUrl || baseUrl, req.body, req.query);
        // Set session cookies
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24h
            sameSite: 'lax'
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
            sameSite: 'lax'
        });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    }
    catch (e) {
        logger_js_1.default.error('SSO Callback Error', e);
        return res.status(401).send(`Authentication failed: ${e.message}`);
    }
}));
// Handle GET callback (OIDC implicit/code flow sometimes uses GET)
router.get('/auth/sso/:tenantId/callback', rateLimit_js_1.rateLimitMiddleware, (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const stateCookie = req.cookies['sso_state'];
    const stateParam = req.query.state || req.query.RelayState;
    if (!stateCookie || !stateParam || stateCookie !== stateParam) {
        logger_js_1.default.warn(`SSO State mismatch or missing. Cookie: ${stateCookie ? 'present' : 'missing'}, Param: ${stateParam ? 'present' : 'missing'}`);
        return res.status(403).send('Authentication failed: State mismatch (CSRF protection)');
    }
    res.clearCookie('sso_state');
    try {
        const { user, token, refreshToken } = await ssoService.handleCallback(tenantId, index_js_1.default.baseUrl || baseUrl, req.body, req.query);
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    }
    catch (e) {
        logger_js_1.default.error('SSO Callback Error', e);
        return res.status(401).send(`Authentication failed: ${e.message}`);
    }
}));
exports.default = router;
