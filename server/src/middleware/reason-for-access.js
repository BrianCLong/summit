"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultReasonForAccessMiddleware = void 0;
exports.createReasonForAccessMiddleware = createReasonForAccessMiddleware;
const apollo_server_express_1 = require("apollo-server-express");
const audit_js_1 = require("../utils/audit.js");
const DEFAULT_MIN_LENGTH = 8;
const HEADER_NAME = 'x-reason-for-access';
function isSensitiveRoute(path, prefixes) {
    const lower = path.toLowerCase();
    return prefixes.some((p) => lower.startsWith(p.toLowerCase()));
}
function createReasonForAccessMiddleware(config) {
    const minLength = config.minLength ?? DEFAULT_MIN_LENGTH;
    const sensitiveRoutes = config.sensitiveRoutes.map((p) => p.toLowerCase());
    return async function reasonForAccess(req, res, next) {
        if (!config.enabled)
            return next();
        if (!isSensitiveRoute(req.path, sensitiveRoutes))
            return next();
        const reason = req.headers[HEADER_NAME] || '';
        if (!reason) {
            return next(new apollo_server_express_1.ForbiddenError('X-Reason-For-Access header is required for this endpoint'));
        }
        if (reason.trim().length < minLength) {
            return next(new apollo_server_express_1.ForbiddenError(`X-Reason-For-Access must be at least ${minLength} characters for sensitive endpoints`));
        }
        req.reasonForAccess = reason.trim();
        // Emit audit event (fire-and-forget)
        const userId = req.user?.id || req.user?.sub;
        const tenantId = req.user?.tenant || req.user?.tenantId;
        const requestId = req.reqId || req.headers['x-request-id'];
        const legalBasis = req.headers['x-legal-basis'];
        Promise.resolve((0, audit_js_1.writeAudit)({
            userId,
            action: 'REASON_FOR_ACCESS_PROVIDED',
            resourceType: 'http',
            resourceId: req.path,
            details: {
                reasonForAccess: reason.trim(),
                legalBasis: legalBasis || null,
                method: req.method,
                requestId: requestId || null,
                tenantId: tenantId || null,
            },
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
        })).catch(() => {
            // non-blocking audit failure
        });
        return next();
    };
}
exports.defaultReasonForAccessMiddleware = createReasonForAccessMiddleware({
    enabled: process.env.REASON_FOR_ACCESS === '1',
    sensitiveRoutes: ['/api/provenance', '/api/compliance', '/api/keys', '/api/cases', '/graphql'],
});
