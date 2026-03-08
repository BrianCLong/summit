"use strict";
// @ts-nocheck
/**
 * Feature Flag Middleware Setup
 *
 * Express middleware for feature flags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagMiddleware = void 0;
exports.exposeFeatureFlags = exposeFeatureFlags;
const middleware_1 = require("@intelgraph/feature-flags/middleware");
const setup_js_1 = require("./setup.js");
/**
 * Build feature flag context from request
 */
function buildFlagContext(req) {
    const authReq = req;
    const user = authReq.user;
    return {
        userId: user?.id || user?.userId,
        userEmail: user?.email,
        userRole: user?.role || user?.roles,
        tenantId: user?.tenantId || authReq.tenant?.id,
        environment: process.env.NODE_ENV || 'development',
        sessionId: authReq.sessionId || req.sessionID,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        attributes: {
            path: req.path,
            method: req.method,
            // Add custom attributes as needed
            ...(user?.attributes || {}),
        },
    };
}
/**
 * Feature flag middleware
 */
exports.featureFlagMiddleware = (0, middleware_1.createFeatureFlagMiddleware)({
    service: (0, setup_js_1.getFeatureFlagService)(),
    contextBuilder: buildFlagContext,
    skipRoutes: [
        '/health',
        '/metrics',
        '/favicon.ico',
        '/_next',
        '/static',
    ],
    skipMethods: ['OPTIONS', 'HEAD'],
});
/**
 * Expose feature flags endpoint
 */
async function exposeFeatureFlags(req, res) {
    try {
        const service = (0, setup_js_1.getFeatureFlagService)();
        const context = buildFlagContext(req);
        const flags = await service.getAllFlags(context);
        // Filter out internal flags
        const publicFlags = Object.fromEntries(Object.entries(flags)
            .filter(([key]) => !key.startsWith('internal-'))
            .filter(([key]) => !key.startsWith('admin-')));
        res.json({
            flags: publicFlags,
            context: {
                userId: context.userId,
                tenantId: context.tenantId,
                environment: context.environment,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch feature flags',
        });
    }
}
