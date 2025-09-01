export const tenantContextMiddleware = (req, _res, next) => {
    const tenantId = req.header('x-tenant-id');
    if (tenantId) {
        req.tenantId = tenantId;
    }
    next();
};
export default tenantContextMiddleware;
//# sourceMappingURL=tenantContext.js.map