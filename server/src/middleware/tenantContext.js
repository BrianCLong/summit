"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContextMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
const logger_js_1 = require("../config/logger.js");
const tenantContext_js_1 = require("../security/tenantContext.js");
const TenantIsolationGuard_js_1 = require("../tenancy/TenantIsolationGuard.js");
const ROUTE_TENANT_KEYS = ['tenantId', 'tenant_id', 'tenant'];
const coerceStringArray = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map(String);
    return [String(value)];
};
const pickRouteTenant = (req, keys) => {
    const params = (req.params || {});
    for (const key of keys) {
        const candidate = params[key];
        if (candidate)
            return String(candidate);
    }
    return undefined;
};
const ensureTenantConsistency = (resolvedTenantId, candidates) => {
    const uniqueValues = new Set(candidates.filter((value) => Boolean(value)));
    if (uniqueValues.size <= 1) {
        return;
    }
    throw Object.assign(new Error('Tenant identifier mismatch'), {
        status: 409,
    });
};
const tenantContextMiddleware = (options = {}) => (req, res, next) => {
    try {
        const baseContext = (0, tenantContext_js_1.extractTenantContext)(req, options);
        const routeTenant = pickRouteTenant(req, options.routeParamKeys || ROUTE_TENANT_KEYS);
        const claimTenant = req.user?.tenant_id || req.user?.tenantId;
        const resolvedTenantId = routeTenant || claimTenant || baseContext?.tenantId;
        if (!resolvedTenantId) {
            return res.status(400).json({
                error: 'tenant_required',
                message: 'Tenant ID must be provided via JWT claim, route parameter, or header',
            });
        }
        ensureTenantConsistency(resolvedTenantId, [
            routeTenant,
            claimTenant,
            baseContext?.tenantId,
        ]);
        const tenantContext = {
            tenantId: resolvedTenantId,
            environment: baseContext?.environment || 'dev',
            privilegeTier: baseContext?.privilegeTier || 'standard',
            subject: baseContext?.subject ||
                req.user?.sub ||
                req.user?.id ||
                '',
            roles: baseContext?.roles || coerceStringArray(req.user?.roles),
            inferredEnvironment: baseContext?.inferredEnvironment,
            inferredPrivilege: baseContext?.inferredPrivilege,
        };
        TenantIsolationGuard_js_1.tenantIsolationGuard.assertTenantContext(tenantContext);
        const policyDecision = TenantIsolationGuard_js_1.tenantIsolationGuard.evaluatePolicy(tenantContext, {
            action: `${req.method}:${req.originalUrl || req.url}`,
            resourceTenantId: routeTenant,
            environment: tenantContext.environment,
        });
        if (!policyDecision.allowed) {
            return res.status(policyDecision.status || 403).json({
                error: 'tenant_denied',
                message: policyDecision.reason ||
                    'Tenant policy evaluation failed for this request',
            });
        }
        req.tenantContext = tenantContext;
        req.tenant_id = tenantContext.tenantId;
        res.locals.tenantContext = tenantContext;
        res.setHeader('x-tenant-id', tenantContext.tenantId);
        res.setHeader('x-tenant-environment', tenantContext.environment);
        res.setHeader('x-tenant-privilege-tier', tenantContext.privilegeTier);
        // Propagate tenant context to OpenTelemetry and Logging
        const store = logger_js_1.correlationStorage.getStore();
        if (store) {
            store.set('tenantId', tenantContext.tenantId);
        }
        const span = api_1.trace.getActiveSpan();
        if (span) {
            span.setAttribute('tenant.id', tenantContext.tenantId);
            span.setAttribute('tenant.env', tenantContext.environment);
        }
        return next();
    }
    catch (error) {
        const status = error.status || 400;
        return res.status(status).json({
            error: 'tenant_context_error',
            message: error.message ||
                'Unable to resolve tenant context for this request',
        });
    }
};
exports.tenantContextMiddleware = tenantContextMiddleware;
exports.default = exports.tenantContextMiddleware;
