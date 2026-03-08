"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantAllowlist = tenantAllowlist;
function tenantAllowlist(allowed, mode = 'staging') {
    const set = new Set((allowed || []).map((s) => s.trim().toLowerCase()).filter(Boolean));
    return (req, res, next) => {
        const t = String(req.headers['x-tenant'] || '').toLowerCase();
        if (!t || !set.has(t))
            return res
                .status(403)
                .json({ error: 'tenant_not_allowed', tenant: t, mode });
        next();
    };
}
