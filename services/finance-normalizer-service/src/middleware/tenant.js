"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
const errorHandler_js_1 = require("./errorHandler.js");
function tenantMiddleware(req, _res, next) {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];
    if (!tenantId) {
        // Allow in development mode without tenant
        if (process.env.NODE_ENV === 'development') {
            req.tenantId = 'dev-tenant';
            req.userId = userId || 'dev-user';
            next();
            return;
        }
        throw new errorHandler_js_1.UnauthorizedError('Missing X-Tenant-ID header');
    }
    req.tenantId = tenantId;
    req.userId = userId;
    next();
}
