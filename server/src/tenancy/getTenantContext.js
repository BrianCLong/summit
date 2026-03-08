"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantContext = exports.getTenantContext = exports.TenantContextHttpError = exports.TENANT_CONTEXT_MISMATCH_CODE = exports.TENANT_CONTEXT_ERROR_CODE = void 0;
exports.TENANT_CONTEXT_ERROR_CODE = 'TENANT_CONTEXT_REQUIRED';
exports.TENANT_CONTEXT_MISMATCH_CODE = 'TENANT_CONTEXT_MISMATCH';
class TenantContextHttpError extends Error {
    status;
    code;
    constructor(message, status = 400, code = exports.TENANT_CONTEXT_ERROR_CODE) {
        super(message);
        this.name = 'TenantContextHttpError';
        this.status = status;
        this.code = code;
    }
}
exports.TenantContextHttpError = TenantContextHttpError;
const TENANT_HEADER = 'x-tenant-id';
const FALLBACK_TENANT_HEADER = 'x-tenant';
const ENV_HEADER = 'x-tenant-environment';
const PRIVILEGE_HEADER = 'x-tenant-privilege-tier';
const coerceRoles = (roles) => {
    if (!roles)
        return undefined;
    if (Array.isArray(roles))
        return roles.map(String);
    return [String(roles)];
};
const resolveEnvironment = (candidate, fallback = 'dev') => {
    const value = (candidate || '').toString().toLowerCase();
    if (value.startsWith('prod'))
        return 'prod';
    if (value.startsWith('stag'))
        return 'staging';
    if (value.startsWith('dev'))
        return 'dev';
    return fallback;
};
const resolvePrivilege = (candidate, fallback = 'standard') => {
    const normalized = (candidate || '').toString().toLowerCase();
    if (['break-glass', 'breakglass'].includes(normalized))
        return 'break-glass';
    if (['elevated', 'admin'].includes(normalized))
        return 'elevated';
    if (normalized)
        return 'standard';
    return fallback;
};
const pickAuthContext = (req) => req.auth || req.user;
const getTenantContext = (req) => {
    const authContext = pickAuthContext(req) || {};
    const tenantFromHeader = req.headers[TENANT_HEADER] ||
        req.headers[FALLBACK_TENANT_HEADER];
    const tenantFromAuth = authContext.tenantId || authContext.tenant_id;
    if (tenantFromHeader && tenantFromAuth && tenantFromHeader !== tenantFromAuth) {
        throw new TenantContextHttpError('Tenant header does not match authenticated tenant claim', 409, exports.TENANT_CONTEXT_MISMATCH_CODE);
    }
    const tenantId = tenantFromHeader || tenantFromAuth;
    if (!tenantId)
        return null;
    const environment = resolveEnvironment(req.headers[ENV_HEADER] || authContext?.environment || process.env.NODE_ENV);
    const privilegeTier = resolvePrivilege(req.headers[PRIVILEGE_HEADER] || authContext?.privilegeTier);
    const subject = authContext?.sub ||
        authContext?.userId ||
        authContext?.id;
    return {
        tenantId: String(tenantId),
        environment,
        privilegeTier,
        subject: subject ? String(subject) : undefined,
        roles: coerceRoles(authContext?.roles),
        inferredEnvironment: !req.headers[ENV_HEADER],
        inferredPrivilege: !req.headers[PRIVILEGE_HEADER],
    };
};
exports.getTenantContext = getTenantContext;
const requireTenantContext = (req) => {
    const context = (0, exports.getTenantContext)(req);
    if (!context) {
        throw new TenantContextHttpError('Tenant context is required for this operation');
    }
    return context;
};
exports.requireTenantContext = requireTenantContext;
