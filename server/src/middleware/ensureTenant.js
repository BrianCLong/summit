"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTenant = ensureTenant;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
function ensureTenant(req, res, next) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) {
        logger_js_1.default.warn('Request missing tenant context', {
            path: req.path,
            user: req.user?.id,
        });
        // For MVP, we might allow some requests without tenantId (e.g. public endpoints, or login)
        // But for protected routes, it's mandatory.
        // Assuming ensureAuthenticated runs before this.
        // If it's a public path, skip.
        const publicPaths = ['/metrics', '/health', '/api/auth/login', '/api/auth/register'];
        if (publicPaths.some(p => req.path.startsWith(p))) {
            return next();
        }
        return res.status(400).json({ error: 'Missing Tenant ID' });
    }
    // Attach to request context
    req.tenantId = tenantId;
    next();
}
