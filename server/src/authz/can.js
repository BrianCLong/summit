"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can = can;
const permissions_js_1 = require("./permissions.js");
function can(permission, context) {
    if (!Object.values(permissions_js_1.Permission).includes(permission)) {
        return {
            allowed: false,
            reason: 'unknown_permission',
            permission,
            role: context.role,
        };
    }
    const permissions = permissions_js_1.ROLE_PERMISSIONS[context.role] ?? [];
    if (!permissions.includes(permission)) {
        return {
            allowed: false,
            reason: 'role_missing_permission',
            permission,
            role: context.role,
        };
    }
    if (context.tenantId &&
        context.resourceTenantId &&
        context.tenantId !== context.resourceTenantId) {
        return {
            allowed: false,
            reason: 'cross_tenant_denied',
            permission,
            role: context.role,
        };
    }
    return {
        allowed: true,
        permission,
        role: context.role,
    };
}
