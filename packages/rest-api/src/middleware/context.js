"use strict";
/**
 * Request Context Middleware
 *
 * Adds context information to each request
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextMiddleware = contextMiddleware;
const uuid_1 = require("uuid");
function contextMiddleware(options) {
    const requestIdHeader = options?.requestIdHeader || 'x-request-id';
    const traceIdHeader = options?.traceIdHeader || 'x-trace-id';
    return (req, res, next) => {
        // Generate or extract request ID
        const requestId = req.headers[requestIdHeader] || (0, uuid_1.v4)();
        // Generate or extract trace ID
        const traceId = req.headers[traceIdHeader] || (0, uuid_1.v4)();
        // Create context
        const context = {
            requestId,
            traceId,
            startTime: Date.now(),
            spanId: (0, uuid_1.v4)(),
        };
        // Attach to request
        req.context = context;
        // Add headers to response
        res.setHeader(requestIdHeader, requestId);
        res.setHeader(traceIdHeader, traceId);
        next();
    };
}
