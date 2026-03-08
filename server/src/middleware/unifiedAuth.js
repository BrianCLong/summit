"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedAuthMiddleware = unifiedAuthMiddleware;
exports.requireAuth = requireAuth;
const AuthService_js_1 = require("../services/AuthService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const database_js_1 = require("../config/database.js");
const crypto_1 = __importDefault(require("crypto"));
const authService = new AuthService_js_1.AuthService();
const pool = (0, database_js_1.getPostgresPool)();
// Header keys
const HEADER_TENANT_ID = 'x-tenant-id';
const HEADER_API_KEY = 'x-api-key';
async function unifiedAuthMiddleware(req, res, next) {
    try {
        let principal = null;
        const requestedTenantId = req.headers[HEADER_TENANT_ID];
        // 1. Try Bearer Token (Human/User)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice('Bearer '.length);
            const user = await authService.verifyToken(token);
            if (user) {
                // Fetch user's tenants and roles
                const memberships = await getUserTenants(user.id);
                // Determine effective tenant
                let effectiveTenantId = requestedTenantId || user.defaultTenantId || memberships[0]?.tenantId;
                // Verify access to requested tenant
                if (requestedTenantId) {
                    const membership = memberships.find((m) => m.tenantId === requestedTenantId);
                    if (!membership) {
                        return res.status(403).json({ error: 'Access denied to requested tenant' });
                    }
                    effectiveTenantId = requestedTenantId;
                }
                if (!effectiveTenantId) {
                    // Should not happen after migration backfill, but handle edge case
                    return res.status(401).json({ error: 'User has no tenant association' });
                }
                // Get roles for this tenant
                const activeMembership = memberships.find((m) => m.tenantId === effectiveTenantId);
                // Fallback to user.role if no specific membership role (legacy compat)
                const roles = activeMembership ? activeMembership.roles : [user.role];
                // Construct Principal
                principal = {
                    id: user.id,
                    email: user.email,
                    tenantId: effectiveTenantId,
                    tenantIds: memberships.map((m) => m.tenantId),
                    roles: roles,
                    scopes: [], // Will be expanded by RBAC logic later
                    authMethod: 'jwt',
                    isSystem: false
                };
            }
        }
        // 2. Try API Key (Machine)
        if (!principal) {
            const apiKey = req.headers[HEADER_API_KEY];
            if (apiKey) {
                // Check DB for API Key
                const client = await pool.connect();
                try {
                    // We assume api_keys table exists with key_hash. In a real scenario we hash the input.
                    // For MVP-4-GA, we check direct match or hash if columns imply it.
                    // Using a simple query for now.
                    // Hash the input key to match stored hash
                    const hashedKey = crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
                    const dbResult = await client.query(`SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true`, [hashedKey]);
                    if (dbResult.rows.length > 0) {
                        const keyRecord = dbResult.rows[0];
                        principal = {
                            id: keyRecord.service_name || 'system',
                            tenantId: requestedTenantId || 'global',
                            roles: keyRecord.roles || ['system.internal'],
                            scopes: keyRecord.scopes || ['*'],
                            authMethod: 'apiKey',
                            isSystem: true
                        };
                    }
                }
                catch (dbError) {
                    logger_js_1.default.warn('API Key DB check failed, falling back to Env', dbError);
                }
                finally {
                    client.release();
                }
                // Fallback: Env Var System Key (Transition/Recovery)
                if (!principal && process.env.SYSTEM_API_KEY && apiKey === process.env.SYSTEM_API_KEY) {
                    principal = {
                        id: 'system',
                        tenantId: requestedTenantId || 'global',
                        roles: ['system.internal', 'tenant.admin'],
                        scopes: ['*'],
                        authMethod: 'apiKey',
                        isSystem: true
                    };
                }
            }
        }
        // 3. Attach to Request
        if (principal) {
            req.principal = principal;
            // Legacy compatibility
            req.user = {
                id: principal.id,
                role: principal.roles[0], // primary role
                tenantId: principal.tenantId
            };
            req.tenantId = principal.tenantId;
        }
        next();
    }
    catch (error) {
        logger_js_1.default.error('Auth Middleware Error:', error);
        return res.status(500).json({ error: 'Internal Authentication Error' });
    }
}
// Helper to fetch memberships
async function getUserTenants(userId) {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT tenant_id, roles FROM user_tenants WHERE user_id = $1`, [userId]);
        // Normalize keys
        return res.rows.map((r) => ({
            tenantId: r.tenant_id,
            roles: r.roles
        }));
    }
    finally {
        client.release();
    }
}
/**
 * Require valid authentication
 */
function requireAuth(req, res, next) {
    if (!req.principal) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
