"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationServiceImpl = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const multi_tenant_rbac_js_1 = require("../auth/multi-tenant-rbac.js");
/**
 * @class AuthorizationServiceImpl
 * @implements {AuthorizationService}
 * @description An implementation of the AuthorizationService that uses a multi-tenant RBAC manager
 * and OPA for fine-grained access control decisions.
 *
 * @example
 * ```typescript
 * const authService = new AuthorizationServiceImpl();
 * const userPrincipal = { id: 'user-1', kind: 'user', tenantId: 'tenant-a', roles: ['analyst'] };
 * const resourceRef = { type: 'investigation', id: 'inv-123', tenantId: 'tenant-a' };
 *
 * if (await authService.can(userPrincipal, 'view', resourceRef)) {
 *   // allow access
 * }
 *
 * try {
 *   await authService.assertCan(userPrincipal, 'delete', resourceRef);
 *   // proceed with deletion
 * } catch (e: any) {
 *   // handle authorization error
 * }
 * ```
 */
class AuthorizationServiceImpl {
    rbac;
    get pool() {
        return (0, database_js_1.getPostgresPool)();
    }
    /**
     * @constructor
     * @description Initializes the service by getting instances of the RBAC manager and the database pool.
     */
    constructor() {
        this.rbac = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
    }
    /**
     * @inheritdoc
     */
    async can(principal, action, resource) {
        try {
            // 1. Tenant Isolation Check
            if (principal.tenantId !== resource.tenantId && principal.kind !== 'system') {
                // System principals *might* be allowed cross-tenant in very specific cases,
                // but generally tenantId must match.
                // Specifically check if the user has a global admin role that allows cross-tenant access.
                const isGlobalAdmin = principal.roles.includes('global-admin');
                if (!isGlobalAdmin) {
                    logger_js_1.default.warn(`Access denied: Cross-tenant access attempted by ${principal.id} (${principal.tenantId}) on ${resource.tenantId}`);
                    return false;
                }
            }
            // 2. Map high-level Action/Resource to RBAC permission string
            // e.g. view + maestro.run -> maestro.run:read
            // e.g. execute + maestro.run -> maestro.run:execute
            const permission = this.mapToPermission(action, resource.type);
            // 3. Delegate to MultiTenantRBACManager
            // We need to construct a "MultiTenantUser" shaped object from our Principal
            // effectively bridging the two models.
            const multiTenantUser = {
                id: principal.id,
                email: principal.user?.email || '',
                name: principal.user?.username || '',
                tenantId: principal.tenantId,
                tenantIds: [principal.tenantId], // In a real scenario, we'd fetch all memberships
                primaryTenantId: principal.tenantId,
                roles: principal.roles.map(r => ({
                    tenantId: principal.tenantId,
                    role: r,
                    permissions: [],
                    scope: 'full',
                    grantedBy: 'system',
                    grantedAt: new Date(),
                })),
                globalRoles: principal.roles, // Assuming roles are flattened for now
                attributes: {},
                clearanceLevel: 'unclassified', // Default
                lastAuthenticated: new Date(),
                mfaVerified: true, // Assume true for now or pass from context
            };
            // If the underlying RBAC manager returns true, we are good.
            // Note: The RBAC manager expects permission strings like 'investigation:read'.
            // Our mapToPermission needs to align with RBAC permissions.
            const hasPermission = this.rbac.hasPermission(
            // @ts-ignore - mismatch in types is expected during bridging
            multiTenantUser, permission);
            if (!hasPermission) {
                return false;
            }
            // 4. ABAC / OPA checks (Delegated to RBACManager or called directly)
            // The RBACManager has evaluateAccess which does OPA.
            // Let's use evaluateAccess for a more complete check if needed, but for 'can'
            // simple permission check is often 90% of cases.
            // However, for high security, we should use evaluateAccess.
            const decision = await this.rbac.evaluateAccess(
            // @ts-ignore
            multiTenantUser, {
                type: resource.type,
                id: resource.id || '',
                tenantId: resource.tenantId,
                // attributes: resource.attributes
            }, action);
            return decision.allowed;
        }
        catch (error) {
            logger_js_1.default.error('Authorization check failed', error);
            return false;
        }
    }
    /**
     * @inheritdoc
     */
    async assertCan(principal, action, resource) {
        const allowed = await this.can(principal, action, resource);
        if (!allowed) {
            throw new Error(`Permission denied: Cannot ${action} ${resource.type}`);
        }
    }
    /**
     * @private
     * @method mapToPermission
     * @description Maps a high-level action and resource type to a standard RBAC permission string (e.g., 'investigation:read').
     * @param {Action} action - The action being performed (e.g., 'view').
     * @param {string} resourceType - The type of the resource (e.g., 'investigation').
     * @returns {string} The formatted permission string.
     */
    mapToPermission(action, resourceType) {
        // Simple mapping strategy
        // view -> read
        // create -> create
        // update -> update
        // delete -> delete
        // execute -> execute
        let verb = 'read';
        switch (action) {
            case 'view':
                verb = 'read';
                break;
            case 'create':
                verb = 'create';
                break;
            case 'update':
                verb = 'update';
                break;
            case 'delete':
                verb = 'delete';
                break;
            case 'execute':
                verb = 'execute';
                break;
            case 'administer':
                verb = 'manage';
                break;
            case 'manage_settings':
                verb = 'manage';
                break;
        }
        // Resource type mapping if necessary
        // e.g. 'maestro.run' -> 'pipeline' or keep as is?
        // The RBAC system uses: investigation, entity, relationship, report, etc.
        // Let's assume resourceType matches RBAC resource names or we map them.
        return `${resourceType}:${verb}`;
    }
}
exports.AuthorizationServiceImpl = AuthorizationServiceImpl;
