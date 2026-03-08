"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextFromRequest = buildContextFromRequest;
const api_1 = require("@opentelemetry/api");
function buildContextFromRequest(req) {
    const activeContext = api_1.context.active();
    const spanContext = api_1.trace.getSpan(activeContext)?.spanContext();
    const user = req.user || {};
    return {
        userId: user.sub || user.id,
        tenantId: user.tenant_id,
        roles: user.roles || (user.role ? [user.role] : []),
        scopes: user.scopes || [],
        source: 'http-request',
        module: req.module || undefined,
        ip: req.ip,
        correlationId: req.correlationId,
        requestId: req.correlationId,
        traceId: req.traceId || spanContext?.traceId,
        spanId: req.spanId || spanContext?.spanId,
        environment: process.env.NODE_ENV || 'development',
        metadata: {
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
        },
    };
}
