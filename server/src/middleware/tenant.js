"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenant = void 0;
const tenantContext_js_1 = require("../security/tenantContext.js");
const TenantIsolationGuard_js_1 = require("../tenancy/TenantIsolationGuard.js");
const tenant = (options = {}) => {
    const { strict = true } = options;
    return (req, res, next) => {
        try {
            const context = strict
                ? (0, tenantContext_js_1.requireTenantContext)(req, options)
                : (0, tenantContext_js_1.extractTenantContext)(req, options);
            if (!context) {
                return res.status(400).json({
                    error: 'tenant_required',
                    message: 'Tenant context is required to process this request',
                });
            }
            TenantIsolationGuard_js_1.tenantIsolationGuard.assertTenantContext(context);
            const policyDecision = TenantIsolationGuard_js_1.tenantIsolationGuard.evaluatePolicy(context, {
                action: `${req.method}:${req.baseUrl || ''}${req.path}`,
                resourceTenantId: (req.params && req.params.tenantId) ||
                    req.body?.tenantId ||
                    req.query?.tenantId,
                environment: context.environment,
            });
            if (!policyDecision.allowed) {
                return res.status(policyDecision.status || 403).json({
                    error: 'tenant_denied',
                    message: policyDecision.reason ||
                        'Tenant policy evaluation failed for this request',
                });
            }
            req.tenant = context;
            res.setHeader('X-Tenant-Id', context.tenantId);
            res.setHeader('X-Tenant-Environment', context.environment);
            res.setHeader('X-Tenant-Privilege-Tier', context.privilegeTier);
            return next();
        }
        catch (error) {
            const err = error;
            const status = err.status || 401;
            return res.status(status).json({
                error: 'tenant_required',
                message: err.message,
            });
        }
    };
};
exports.tenant = tenant;
exports.default = exports.tenant;
