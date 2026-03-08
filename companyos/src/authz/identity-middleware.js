"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stubIdentity = stubIdentity;
function stubIdentity(req, _res, next) {
    const tenantId = req.header('x-tenant-id') ?? 'tenant_demo';
    const userId = req.header('x-user-id') ?? 'user_demo';
    const region = req.header('x-region') ?? 'us';
    const cookieMfa = req.cookies?.companyos_mfa === '1';
    const headerMfa = req.header('x-mfa-verified') === 'true';
    const mfaVerified = cookieMfa || headerMfa;
    req.subject = {
        id: userId,
        type: 'human',
        tenant_id: tenantId,
        roles: (req.header('x-roles') ?? 'compliance_lead').split(','),
        groups: [],
        attributes: {
            clearance: 'internal',
            region,
            mfa_verified: mfaVerified,
        },
    };
    next();
}
