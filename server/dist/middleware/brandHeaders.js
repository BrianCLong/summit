// Brand header aliasing and banner injection
export function brandHeaders() {
    const brand = process.env.PRODUCT_BRAND || 'IntelGraph';
    const notice = brand === 'Summit' ? 'IntelGraph is now Summit.' : '';
    return (req, res, next) => {
        // Tenant header aliasing: accept both X-IntelGraph-Tenant and X-Summit-Tenant
        const ig = req.header('x-intelgraph-tenant');
        const sm = req.header('x-summit-tenant');
        const cur = req.header('x-tenant-id');
        const chosen = cur || sm || ig || undefined;
        if (chosen) {
            req.headers['x-tenant-id'] = chosen;
        }
        // Brand headers for downstream/UI consumption
        res.setHeader('X-Brand-Name', brand);
        if (notice)
            res.setHeader('X-Brand-Notice', notice);
        next();
    };
}
//# sourceMappingURL=brandHeaders.js.map