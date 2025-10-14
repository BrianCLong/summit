export function tenantHeader(required = true) {
    return function (req, res, next) {
        const headerTenant = req.headers['x-tenant-id'] || req.headers['x-tenant'] || '';
        req.tenantId = headerTenant || null;
        if (required && !headerTenant) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        next();
    };
}
//# sourceMappingURL=tenantHeader.js.map