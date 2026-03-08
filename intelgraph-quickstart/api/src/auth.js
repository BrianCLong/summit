"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContextFromReq = getContextFromReq;
function getContextFromReq(req) {
    const tenantId = req.headers['x-tenant'] ||
        process.env.TENANT_ID ||
        'demo-tenant';
    // NOTE: extend with OIDC validation if Authorization: Bearer is present
    return { tenantId };
}
