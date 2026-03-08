"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantContextMiddleware = void 0;
const getTenantContext_js_1 = require("../tenancy/getTenantContext.js");
const requireTenantContextMiddleware = () => (req, res, next) => {
    try {
        const tenantContext = (0, getTenantContext_js_1.requireTenantContext)(req);
        req.tenantContext = tenantContext;
        res.locals.tenantContext = tenantContext;
        return next();
    }
    catch (error) {
        const httpError = error;
        const status = httpError.status || 400;
        const code = httpError.code ||
            (status === 409
                ? getTenantContext_js_1.TENANT_CONTEXT_MISMATCH_CODE
                : getTenantContext_js_1.TENANT_CONTEXT_ERROR_CODE);
        return res.status(status).json({
            error: code,
            message: httpError.message,
        });
    }
};
exports.requireTenantContextMiddleware = requireTenantContextMiddleware;
exports.default = exports.requireTenantContextMiddleware;
