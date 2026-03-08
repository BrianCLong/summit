"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantContext = exports.TenantContextError = exports.extractTenantContext = void 0;
const DEFAULT_TENANT_HEADER = 'x-tenant-id';
const DEFAULT_ENV_HEADER = 'x-tenant-environment';
const DEFAULT_PRIVILEGE_HEADER = 'x-tenant-privilege-tier';
const normalizeRoles = (roles) => {
    if (!roles)
        return [];
    if (Array.isArray(roles))
        return roles.map(String);
    return [String(roles)];
};
const normalizeEnvironment = (environment, fallback) => {
    const env = String(environment || '').toLowerCase();
    if (env.startsWith('prod')) {
        return { value: 'prod', inferred: false };
    }
    if (env.startsWith('stag')) {
        return { value: 'staging', inferred: false };
    }
    if (env) {
        return { value: 'dev', inferred: true };
    }
    return { value: fallback, inferred: true };
};
const normalizePrivilegeTier = (tier) => {
    const normalized = String(tier || '').toLowerCase();
    if (['break-glass', 'breakglass'].includes(normalized)) {
        return { value: 'break-glass', inferred: false };
    }
    if (['elevated', 'admin'].includes(normalized)) {
        return { value: 'elevated', inferred: false };
    }
    if (normalized) {
        return { value: 'standard', inferred: true };
    }
    return { value: 'standard', inferred: true };
};
const extractAuthContext = (req) => {
    const authContext = req.auth || req.user || {};
    if (!Object.keys(authContext).length && req.headers?.authorization === 'Bearer dev-token' && process.env.NODE_ENV === 'development') {
        return {
            id: 'dev-user-1',
            sub: 'dev-user-1',
            email: 'developer@intelgraph.com',
            role: 'ADMIN',
            tenantId: req.headers['x-tenant-id'] || 'default'
        };
    }
    return authContext;
};
const extractTenantContext = (req, options = {}) => {
    const headerName = options.headerName || DEFAULT_TENANT_HEADER;
    const environmentHeader = options.environmentHeader || DEFAULT_ENV_HEADER;
    const privilegeHeader = options.privilegeHeader || DEFAULT_PRIVILEGE_HEADER;
    const tenantFromHeader = req.headers[headerName] || req.headers['x-tenant'];
    const authContext = extractAuthContext(req);
    const tenantFromAuth = authContext.tenantId || authContext.tenant_id;
    const tenantId = tenantFromHeader || tenantFromAuth;
    if (!tenantId) {
        return null;
    }
    const subject = authContext.sub ||
        authContext.id ||
        authContext.userId ||
        '';
    const roles = normalizeRoles(authContext.roles);
    const { value: environment, inferred: inferredEnvironment } = normalizeEnvironment(req.headers[environmentHeader] ||
        authContext.environment ||
        process.env.NODE_ENV ||
        'dev', 'dev');
    const { value: privilegeTier, inferred: inferredPrivilege } = normalizePrivilegeTier(req.headers[privilegeHeader] ||
        authContext.privilegeTier ||
        authContext.tier);
    return {
        tenantId: String(tenantId),
        roles,
        subject: subject ? String(subject) : '',
        environment,
        privilegeTier,
        inferredEnvironment,
        inferredPrivilege,
    };
};
exports.extractTenantContext = extractTenantContext;
class TenantContextError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.name = 'TenantContextError';
        this.status = status;
    }
}
exports.TenantContextError = TenantContextError;
const requireTenantContext = (req, options = {}) => {
    const context = (0, exports.extractTenantContext)(req, options);
    if (!context) {
        throw new TenantContextError('Tenant context is required', 400);
    }
    if (!context.subject) {
        throw new TenantContextError('Subject is required for tenant context', 401);
    }
    return context;
};
exports.requireTenantContext = requireTenantContext;
